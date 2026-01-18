/**
 * @module cli/work
 *
 * The `ralph work` command.
 * Runs the autonomous build loop - Claude implements tasks one at a time.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, bold, dim, error, muted, orange, success as successColor } from '@/ui/colors.ts';
import { CHECK, CROSS, INFO } from '@/ui/symbols.ts';
import { isRalphProject, readConfig } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { renderBuildPrompt } from '@/core/templates.ts';
import { exists, getPlanPath, readTextFile } from '@/services/file_service.ts';
import {
  formatUsageStats,
  getTerminalWidth,
  renderError,
  renderInfo,
  runIterationInBox,
  type UsageStats,
} from '@/ui/claude_renderer.ts';
import { createBox } from '@/ui/box.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import { commandHeader } from '@/ui/components.ts';

// ============================================================================
// Types
// ============================================================================

interface RalphStatus {
  readonly task: string;
  readonly phase: number;
  readonly validation: 'pass' | 'fail';
  readonly exitSignal: boolean;
}

interface WorkOptions {
  readonly maxIterations?: number;
  readonly dryRun?: boolean;
  readonly vibe?: boolean;
}

interface IterationResult {
  readonly success: boolean;
  readonly status: RalphStatus | null;
  readonly usage: UsageStats;
  readonly error?: string;
}

interface SessionStats {
  totalIterations: number;
  totalOperations: number;
  totalDurationSec: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ============================================================================
// Status Parsing
// ============================================================================

/**
 * Parses RALPH_STATUS block from Claude's output.
 * Pure function - no side effects.
 */
const parseRalphStatus = (output: string): RalphStatus | null => {
  const statusMatch = output.match(/RALPH_STATUS:\s*\n([\s\S]*?)```/);
  if (!statusMatch) {
    // Try alternate format without code block
    const altMatch = output.match(/RALPH_STATUS:\s*\n([\s\S]*?)(?:\n\n|$)/);
    if (!altMatch) return null;
    return parseStatusBlock(altMatch[1] ?? '');
  }
  return parseStatusBlock(statusMatch[1] ?? '');
};

/**
 * Parses the content of a status block.
 */
const parseStatusBlock = (block: string): RalphStatus | null => {
  const lines = block.trim().split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1]?.toLowerCase() ?? '';
      const value = match[2]?.trim().replace(/^["']|["']$/g, '') ?? '';
      data[key] = value;
    }
  }

  if (!data.task) return null;

  return {
    task: data.task,
    phase: parseInt(data.phase ?? '0', 10),
    validation: data.validation === 'pass' ? 'pass' : 'fail',
    exitSignal: data.exit_signal === 'true' || data.exitSignal === 'true',
  };
};

/**
 * Checks for EXIT_SIGNAL in output (fallback if status block not found).
 */
const hasExitSignal = (output: string): boolean =>
  output.includes('EXIT_SIGNAL: true') || output.includes('EXIT_SIGNAL:true');

interface NextTask {
  readonly phase: string | null;
  readonly task: string;
}

/**
 * Gets the first unchecked task from the implementation plan.
 * Also returns the current phase title if found.
 */
const getNextTaskFromPlan = async (): Promise<NextTask | null> => {
  const planPath = getPlanPath();
  const result = await readTextFile(planPath);
  if (!result.ok) return null;

  const lines = result.value.split('\n');
  let currentPhase: string | null = null;

  for (const line of lines) {
    // Match phase header: ## Phase N: Title or ### Phase N: Title
    const phaseMatch = line.match(/^#{2,3}\s*(Phase\s*\d+[^#\n]*)/i);
    if (phaseMatch && phaseMatch[1]) {
      currentPhase = phaseMatch[1].trim();
    }

    // Match unchecked task: - [ ] Task description
    const taskMatch = line.match(/^[\s]*-\s*\[\s*\]\s*(.+)$/);
    if (taskMatch && taskMatch[1]) {
      return {
        phase: currentPhase,
        task: taskMatch[1].trim(),
      };
    }
  }
  return null;
};

// ============================================================================
// Build Loop
// ============================================================================

/**
 * Runs a single iteration of the build loop.
 * Renders progress inside an orange-bordered box.
 */
const runIteration = async (
  iteration: number,
  model: 'opus' | 'sonnet',
): Promise<IterationResult> => {
  // Get next task from plan for display
  const nextTask = await getNextTaskFromPlan();
  const phaseTitle = nextTask?.phase ?? 'Building';
  const taskPreview = nextTask?.task ? truncateTask(nextTask.task, 50) : 'Selecting next task...';

  const prompt = renderBuildPrompt();

  // Run Claude with progress displayed inside an orange-bordered box
  const result = await runIterationInBox(
    {
      prompt,
      model,
      skipPermissions: true,
    },
    {
      iteration,
      title: phaseTitle,
      task: taskPreview,
      borderColor: orange,
      model,
    },
  );

  if (!result.success) {
    return {
      success: false,
      status: null,
      usage: result.usage,
      error: 'Claude execution failed',
    };
  }

  const status = parseRalphStatus(result.text);
  const exitSignal = status?.exitSignal ?? hasExitSignal(result.text);

  return {
    success: true,
    status: status ? { ...status, exitSignal } : null,
    usage: result.usage,
  };
};

/**
 * Truncates a task description for display.
 */
const truncateTask = (task: string, maxLen: number): string => {
  if (task.length <= maxLen) return task;
  return task.slice(0, maxLen - 3) + '...';
};

/**
 * Renders the iteration summary as a bordered completion box.
 */
const renderIterationSummary = (
  iteration: number,
  status: RalphStatus | null,
  usage: UsageStats,
  model: string,
  success: boolean,
  usageDelta?: number, // How much 5h usage increased during this iteration
): void => {
  const validationIcon = success && status?.validation === 'pass'
    ? successColor(CHECK)
    : error(CROSS);

  const taskName = status?.task ?? 'Unknown task';
  let usageStr = formatUsageStats(usage, model);

  // Add usage delta if available
  if (usageDelta !== undefined && usageDelta > 0) {
    usageStr += ` · ${amber(`+${usageDelta.toFixed(1)}%`)} usage`;
  }

  // Dim border for completed iterations
  const termWidth = getTerminalWidth();
  const content = `${dim(`[#${iteration}]`)} ${
    bold(truncateTask(taskName, termWidth - 25))
  } ${validationIcon}\n${dim(usageStr)}`;
  console.log(
    createBox(content, {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: dim,
      minWidth: termWidth - 6,
    }),
  );
};

/**
 * Formats session duration nicely.
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
};

/**
 * Formats token count with K/M suffix.
 */
const formatTokensCompact = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
};

/**
 * Detects project type and returns a helpful next step message.
 */
const detectProjectNextSteps = async (): Promise<string[]> => {
  const cwd = Deno.cwd();

  try {
    // Check for package.json (Node/Bun/Deno)
    const packageJsonPath = `${cwd}/package.json`;
    try {
      const content = await Deno.readTextFile(packageJsonPath);
      const pkg = JSON.parse(content);
      const scripts = pkg.scripts || {};

      if (scripts.dev) {
        return [`Run your project: ${amber('npm run dev')} or ${amber('bun dev')}`];
      }
      if (scripts.start) {
        return [`Run your project: ${amber('npm start')} or ${amber('bun start')}`];
      }
      if (scripts.build) {
        return [`Build your project: ${amber('npm run build')}`];
      }
    } catch { /* not a node project */ }

    // Check for Cargo.toml (Rust)
    try {
      await Deno.stat(`${cwd}/Cargo.toml`);
      return [`Run your project: ${amber('cargo run')}`];
    } catch { /* not a rust project */ }

    // Check for deno.json (Deno)
    try {
      const content = await Deno.readTextFile(`${cwd}/deno.json`);
      const config = JSON.parse(content);
      if (config.tasks?.dev) {
        return [`Run your project: ${amber('deno task dev')}`];
      }
      if (config.tasks?.start) {
        return [`Run your project: ${amber('deno task start')}`];
      }
    } catch { /* not a deno project */ }

    // Check for Makefile
    try {
      await Deno.stat(`${cwd}/Makefile`);
      return [`Run: ${amber('make')} or ${amber('make help')} to see available commands`];
    } catch { /* no makefile */ }

    // Check for go.mod (Go)
    try {
      await Deno.stat(`${cwd}/go.mod`);
      return [`Run your project: ${amber('go run .')}`];
    } catch { /* not a go project */ }

    // Check for pyproject.toml or setup.py (Python)
    try {
      await Deno.stat(`${cwd}/pyproject.toml`);
      return [`Run your project: ${amber('python -m your_module')} or ${amber('poetry run')}`];
    } catch { /* not a python project */ }
  } catch { /* ignore errors */ }

  return [];
};

/**
 * Renders the work summary at the end.
 */
const renderWorkSummary = async (
  completed: string[],
  sessionStats: SessionStats,
  failed: boolean,
): Promise<void> => {
  console.log();

  if (failed) {
    renderError('Build loop stopped', 'An iteration failed. Check the error above.');
    return;
  }

  if (completed.length === 0) {
    renderInfo('No tasks completed', [
      'The plan may be empty or all tasks are done',
      `Run ${orange('ralph plan')} to regenerate the plan`,
    ]);
    return;
  }

  const termWidth = getTerminalWidth();

  // Build stats line
  const statsLine = [
    `${sessionStats.totalIterations} iteration${sessionStats.totalIterations === 1 ? '' : 's'}`,
    `${sessionStats.totalOperations} ops`,
    formatDuration(sessionStats.totalDurationSec),
  ];

  // Add token count if available
  const totalTokens = sessionStats.totalInputTokens + sessionStats.totalOutputTokens;
  if (totalTokens > 0) {
    statsLine.push(`${formatTokensCompact(totalTokens)} tokens`);
  }

  // Fetch final usage
  const finalUsage = await getSubscriptionUsage();

  // Detect project type for next steps
  const nextSteps = await detectProjectNextSteps();

  // Build content lines
  const lines: string[] = [
    `${orange('◆')} ${bold('Build Complete!')}`,
    '',
    `${dim('→')} ${statsLine.join(' · ')}`,
  ];

  if (finalUsage.ok) {
    lines.push(`${dim('→')} Subscription: ${formatSubscriptionUsage(finalUsage.value)}`);
  }

  lines.push('');
  lines.push(dim('Completed tasks:'));
  for (const task of completed.slice(0, 5)) {
    lines.push(`  ${successColor(CHECK)} ${dim(truncateTask(task, termWidth - 15))}`);
  }
  if (completed.length > 5) {
    lines.push(dim(`  ...and ${completed.length - 5} more`));
  }

  if (nextSteps.length > 0) {
    lines.push('');
    lines.push(bold('Next steps:'));
    for (const step of nextSteps) {
      lines.push(`  ${orange('▸')} ${step}`);
    }
  }

  console.log(createBox(lines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  }));
};

/**
 * The main build loop.
 */
const buildLoop = async (
  model: 'opus' | 'sonnet',
  maxIterations: number,
): Promise<void> => {
  const completedTasks: string[] = [];
  const sessionStats: SessionStats = {
    totalIterations: 0,
    totalOperations: 0,
    totalDurationSec: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  // Fetch initial subscription usage
  const initialUsage = await getSubscriptionUsage();

  console.log();
  console.log(commandHeader({
    name: 'Ralph Work',
    description: `Autonomous build loop · ${model} · max ${maxIterations} iterations`,
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  while (sessionStats.totalIterations < maxIterations) {
    sessionStats.totalIterations++;
    const iteration = sessionStats.totalIterations;

    // Get usage before iteration
    const usageBefore = await getSubscriptionUsage();
    const usageBeforeVal = usageBefore.ok ? usageBefore.value.fiveHour.utilization : null;

    const result = await runIteration(iteration, model);

    // Get usage after iteration
    const usageAfter = await getSubscriptionUsage();
    const usageAfterVal = usageAfter.ok ? usageAfter.value.fiveHour.utilization : null;

    // Calculate usage delta
    let usageDelta: number | undefined;
    if (usageBeforeVal !== null && usageAfterVal !== null) {
      usageDelta = usageAfterVal - usageBeforeVal;
    }

    // Accumulate stats
    sessionStats.totalOperations += result.usage.operations;
    sessionStats.totalDurationSec += result.usage.durationSec;
    sessionStats.totalInputTokens += result.usage.inputTokens ?? 0;
    sessionStats.totalOutputTokens += result.usage.outputTokens ?? 0;

    if (!result.success) {
      // Show error summary box
      renderIterationSummary(iteration, result.status, result.usage, model, false, usageDelta);
      await renderWorkSummary(completedTasks, sessionStats, true);
      Deno.exit(1);
    }

    // Show completion summary box (white border)
    renderIterationSummary(iteration, result.status, result.usage, model, true, usageDelta);

    // Track completed task
    if (result.status?.task) {
      completedTasks.push(result.status.task);
    }

    // Check for exit signal
    if (result.status?.exitSignal) {
      const termWidth = getTerminalWidth();
      console.log(createBox(
        `${successColor(CHECK)} ${bold('All tasks complete!')}`,
        { style: 'rounded', padding: 1, paddingY: 0, borderColor: dim, minWidth: termWidth - 6 },
      ));
      break;
    }

    // Check for validation failure
    if (result.status?.validation === 'fail') {
      console.log();
      console.log(error(`  ${CROSS} Validation failed - stopping loop`));
      await renderWorkSummary(completedTasks, sessionStats, true);
      Deno.exit(1);
    }

    // Brief pause between iterations (fresh context)
    if (iteration < maxIterations) {
      const termWidth = getTerminalWidth();
      console.log(
        createBox(dim('Next iteration in 2s...'), {
          style: 'rounded',
          padding: 1,
          paddingY: 0,
          borderColor: dim,
          minWidth: termWidth - 6,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log();
    }
  }

  if (sessionStats.totalIterations >= maxIterations) {
    console.log();
    console.log(amber(`  ${INFO} Reached max iterations (${maxIterations})`));
  }

  await renderWorkSummary(completedTasks, sessionStats, false);
};

// ============================================================================
// Command Action
// ============================================================================

/**
 * The work command action.
 */
async function workAction(options: WorkOptions): Promise<void> {
  const maxIterations = options.maxIterations ?? 50;

  // Check if initialized
  if (!(await isRalphProject())) {
    console.log(error(`${CROSS} Not a Ralph project.`));
    console.log(muted('  Run `ralph init` first to initialize.'));
    Deno.exit(1);
  }

  // Check Claude CLI
  if (!(await isClaudeInstalled())) {
    console.log(error(`${CROSS} Claude CLI not found.`));
    console.log(muted('  Install from: https://docs.anthropic.com/claude-code'));
    Deno.exit(1);
  }

  // Check for implementation plan
  const planPath = getPlanPath();
  if (!(await exists(planPath))) {
    console.log(error(`${CROSS} No implementation plan found.`));
    console.log(muted('  Run `ralph plan` first to generate a plan.'));
    Deno.exit(1);
  }

  // Dry run mode
  if (options.dryRun) {
    console.log();
    renderInfo('Dry Run Mode', [
      'Would run the build loop with these settings:',
      `Max iterations: ${maxIterations}`,
      `Plan: ${planPath}`,
    ]);
    return;
  }

  // Read config for model setting
  const configResult = await readConfig();
  const model = configResult.ok ? configResult.value.work.model : 'opus';

  // Run the build loop
  await buildLoop(model as 'opus' | 'sonnet', maxIterations);
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * Creates the work command.
 */
// deno-lint-ignore no-explicit-any
export function createWorkCommand(): Command<any> {
  return new Command()
    .description('Run the autonomous build loop (implements tasks one by one)')
    .option('-n, --max-iterations <count:number>', 'Maximum iterations before stopping', {
      default: 50,
    })
    .option('--dry-run', 'Show what would happen without running')
    .option('--vibe', 'Vibe mode (no effect on work - already the last step)')
    .action(workAction);
}
