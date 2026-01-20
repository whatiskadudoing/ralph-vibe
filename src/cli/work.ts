/**
 * @module cli/work
 *
 * The `ralph work` command.
 * Runs the autonomous build loop - Claude implements tasks one at a time.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, bold, cyan, dim, error, muted, orange, success as successColor } from '@/ui/colors.ts';
import { CHECK, CROSS, INFO, progressBar } from '@/ui/symbols.ts';
import { isRalphProject, readConfig } from '@/services/project_service.ts';
import { DEFAULT_WORK, RECOMMENDED_MAX_ITERATIONS } from '@/core/config.ts';
import {
  type BaseSessionContext,
  haveSpecsChanged,
  initializeBaseSession,
  isClaudeInstalled,
} from '@/services/claude_service.ts';
import { createTag, getLatestTag, incrementVersion, pushTags } from '@/services/git_service.ts';
import { renderBuildPrompt, renderBuildPromptForked } from '@/core/templates.ts';
import { assessComplexity } from '@/core/complexity.ts';
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
import { commandHeader, detailBox } from '@/ui/components.ts';
import { formatSessionSummary, SessionTracker } from '@/services/session_tracker.ts';

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
  readonly adaptive?: boolean;
  readonly model?: 'opus' | 'sonnet';
}

interface IterationResult {
  readonly success: boolean;
  readonly status: RalphStatus | null;
  readonly usage: UsageStats;
  readonly error?: string;
  readonly modelUsed: 'opus' | 'sonnet';
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

interface PhaseInfo {
  readonly name: string;
  readonly tasks: Array<{ checked: boolean; text: string }>;
}

/**
 * Gets the next unchecked task from the implementation plan.
 * Uses smart detection to find the most likely "current" task:
 * 1. Skip "Future Work" section
 * 2. Prioritize phases with work-in-progress (has both checked and unchecked)
 * 3. Fall back to first unchecked task in sequential flow
 */
const getNextTaskFromPlan = async (): Promise<NextTask | null> => {
  const planPath = getPlanPath();
  const result = await readTextFile(planPath);
  if (!result.ok) return null;

  const lines = result.value.split('\n');
  const phases: PhaseInfo[] = [];
  let currentPhase: { name: string; tasks: Array<{ checked: boolean; text: string }> } | null = null;
  let inFutureWork = false;

  for (const line of lines) {
    // Skip Future Work section entirely
    if (/^#{2,3}\s*Future\s*Work/i.test(line)) {
      inFutureWork = true;
      continue;
    }
    if (inFutureWork) continue;

    // Match phase header: ## Phase N or ## Phase N.M or ### Phase N: Title
    const phaseMatch = line.match(/^#{2,3}\s*(Phase\s*[\d.]+[^#\n]*)/i);
    if (phaseMatch && phaseMatch[1]) {
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        name: phaseMatch[1].trim(),
        tasks: [],
      };
      continue;
    }

    // Match tasks (checked or unchecked)
    if (currentPhase) {
      const checkedMatch = line.match(/^[\s]*-\s*\[x\]\s*(.+)$/i);
      const uncheckedMatch = line.match(/^[\s]*-\s*\[\s*\]\s*(.+)$/);

      if (checkedMatch && checkedMatch[1]) {
        currentPhase.tasks.push({ checked: true, text: checkedMatch[1].trim() });
      } else if (uncheckedMatch && uncheckedMatch[1]) {
        currentPhase.tasks.push({ checked: false, text: uncheckedMatch[1].trim() });
      }
    }
  }

  // Add last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  // Priority 1: Find phase with work-in-progress (has both checked and unchecked)
  for (const phase of phases) {
    const hasChecked = phase.tasks.some((t) => t.checked);
    const uncheckedTask = phase.tasks.find((t) => !t.checked);
    if (hasChecked && uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
    }
  }

  // Priority 2: First phase with unchecked tasks where previous phases are complete
  let previousComplete = true;
  for (const phase of phases) {
    const allChecked = phase.tasks.length > 0 && phase.tasks.every((t) => t.checked);
    const uncheckedTask = phase.tasks.find((t) => !t.checked);

    if (previousComplete && uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
    }

    previousComplete = allChecked || phase.tasks.length === 0;
  }

  // Priority 3: Fallback - first unchecked task anywhere
  for (const phase of phases) {
    const uncheckedTask = phase.tasks.find((t) => !t.checked);
    if (uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
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
 * When modelMode is 'adaptive', selects model based on task complexity.
 * If baseSession is provided, forks from the cached context for faster execution.
 */
const runIteration = async (
  iteration: number,
  modelMode: 'opus' | 'sonnet' | 'adaptive',
  baseSession: BaseSessionContext | null,
): Promise<IterationResult> => {
  // Get next task from plan for display
  const nextTask = await getNextTaskFromPlan();
  const phaseTitle = nextTask?.phase ?? 'Building';
  const taskPreview = nextTask?.task ? truncateTask(nextTask.task, 50) : 'Selecting next task...';

  // Determine model to use
  let model: 'opus' | 'sonnet';
  if (modelMode === 'adaptive' && nextTask?.task) {
    const assessment = assessComplexity(nextTask.task, nextTask.phase);
    model = assessment.model;
  } else if (modelMode === 'adaptive') {
    // No task info available, default to opus
    model = 'opus';
  } else {
    model = modelMode;
  }

  // Use slimmer prompt if we have a base session (specs already cached)
  const prompt = baseSession ? renderBuildPromptForked() : renderBuildPrompt();

  // Run Claude with progress displayed inside an orange-bordered box
  // If base session exists, fork from it for prompt caching benefits
  const result = await runIterationInBox(
    {
      prompt,
      model,
      skipPermissions: true,
      resumeSessionId: baseSession?.sessionId,
      forkSession: baseSession !== null,
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
      modelUsed: model,
    };
  }

  const status = parseRalphStatus(result.text);
  const exitSignal = status?.exitSignal ?? hasExitSignal(result.text);

  return {
    success: true,
    status: status ? { ...status, exitSignal } : null,
    usage: result.usage,
    modelUsed: model,
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
  const termWidth = getTerminalWidth();

  // Build stats parts
  const statsParts: string[] = [];

  // Model breakdown
  if (usage.byModel && Object.keys(usage.byModel).length > 0) {
    const modelParts: string[] = [];
    if (usage.byModel.opus?.operations) {
      modelParts.push(`${amber('opus')}:${usage.byModel.opus.operations}`);
    }
    if (usage.byModel.sonnet?.operations) {
      modelParts.push(`${cyan('sonnet')}:${usage.byModel.sonnet.operations}`);
    }
    if (usage.byModel.haiku?.operations) {
      modelParts.push(`${dim('haiku')}:${usage.byModel.haiku.operations}`);
    }
    if (modelParts.length > 0) {
      statsParts.push(modelParts.join(' '));
    }
  } else {
    statsParts.push(`${dim('model:')} ${amber(model)}`);
  }

  // Ops and time
  statsParts.push(`${dim('ops:')} ${usage.operations}`);
  statsParts.push(`${dim('time:')} ${formatDuration(usage.durationSec)}`);

  // Tokens
  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
    const totalTokens = usage.inputTokens + usage.outputTokens;
    statsParts.push(`${dim('tokens:')} ${formatTokensCompact(totalTokens)}`);
  }

  // Usage delta
  if (usageDelta !== undefined && usageDelta > 0) {
    statsParts.push(`${amber(`+${usageDelta.toFixed(1)}%`)} ${dim('usage')}`);
  }

  // Build content
  const lines = [
    `${dim(`[#${iteration}]`)} ${bold(truncateTask(taskName, termWidth - 25))} ${validationIcon}`,
    statsParts.join('  ·  '),
  ];

  console.log(
    createBox(lines.join('\n'), {
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

// Fun completion messages
const COMPLETION_MESSAGES = [
  { icon: '☕', title: 'Time for that coffee!', subtitle: 'Your code is freshly brewed.' },
  { icon: '🍺', title: 'Beer o\'clock!', subtitle: 'You earned it. The build is done.' },
  { icon: '🎉', title: 'Ship it!', subtitle: 'Another successful build in the books.' },
  { icon: '🚀', title: 'Ready for launch!', subtitle: 'Your code is built and tested.' },
  { icon: '✨', title: 'Magic complete!', subtitle: 'The robots have done their thing.' },
  { icon: '🏆', title: 'Victory!', subtitle: 'All tasks conquered. Well done.' },
];

/**
 * Gets a random completion message.
 */
const getCompletionMessage = () => {
  const idx = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
  return COMPLETION_MESSAGES[idx] ?? COMPLETION_MESSAGES[0]!;
};

/**
 * Renders the work summary at the end.
 */
const renderWorkSummary = async (
  completed: string[],
  sessionStats: SessionStats,
  failed: boolean,
  tracker?: SessionTracker,
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
  const msg = getCompletionMessage();

  // Get tracker stats if available
  const trackerStats = tracker?.getAggregateStats();

  // Fetch final usage
  const finalUsage = await getSubscriptionUsage();

  // Detect project type for next steps
  const nextSteps = await detectProjectNextSteps();

  // ═══════════════════════════════════════════════════════════════════
  // Build the awesome summary box
  // ═══════════════════════════════════════════════════════════════════

  const lines: string[] = [];

  // Header with fun message
  lines.push('');
  lines.push(`     ${msg.icon}  ${bold(orange(msg.title))}`);
  lines.push(`        ${dim(msg.subtitle)}`);
  lines.push('');

  // Divider
  lines.push(dim('─'.repeat(Math.min(50, termWidth - 12))));
  lines.push('');

  // Session stats section
  lines.push(`  ${bold('Session Stats')}`);
  lines.push('');

  // Time and iterations
  const timeStr = formatDuration(sessionStats.totalDurationSec);
  lines.push(`  ${dim('⏱')}  ${bold(timeStr)} ${dim('total time')}`);
  lines.push(`  ${dim('🔄')} ${bold(String(sessionStats.totalIterations))} ${dim('iterations')}`);
  lines.push(`  ${dim('⚡')} ${bold(String(sessionStats.totalOperations))} ${dim('operations')}`);

  // Tokens
  const totalTokens = sessionStats.totalInputTokens + sessionStats.totalOutputTokens;
  if (totalTokens > 0) {
    lines.push(`  ${dim('📊')} ${bold(formatTokensCompact(totalTokens))} ${dim('tokens')} ${dim(`(${formatTokensCompact(sessionStats.totalInputTokens)} in / ${formatTokensCompact(sessionStats.totalOutputTokens)} out)`)}`);
  }

  // Cache savings (if tracker available and forking was used)
  if (trackerStats && tracker?.isForking() && trackerStats.totalCacheReadTokens > 0) {
    lines.push(`  ${dim('💾')} ${bold(formatTokensCompact(trackerStats.tokensSavedByCache))} ${dim('tokens saved by cache')}`);
  }

  lines.push('');

  // Model breakdown
  if (trackerStats && (trackerStats.modelBreakdown.opus > 0 || trackerStats.modelBreakdown.sonnet > 0)) {
    lines.push(`  ${bold('Models Used')}`);
    lines.push('');
    if (trackerStats.modelBreakdown.opus > 0) {
      lines.push(`  ${amber('●')} ${amber('Opus')}   ${dim('×')} ${trackerStats.modelBreakdown.opus} ${dim('iterations')}`);
    }
    if (trackerStats.modelBreakdown.sonnet > 0) {
      lines.push(`  ${cyan('●')} ${cyan('Sonnet')} ${dim('×')} ${trackerStats.modelBreakdown.sonnet} ${dim('iterations')}`);
    }
    lines.push('');
  }

  // Subscription usage
  if (finalUsage.ok) {
    lines.push(`  ${bold('Subscription')}`);
    lines.push('');
    lines.push(`  ${dim('5h:')}      ${formatUsageBar(finalUsage.value.fiveHour.utilization, 20)}`);
    lines.push(`  ${dim('7d:')}      ${formatUsageBar(finalUsage.value.sevenDay.utilization, 20)}`);
    if (finalUsage.value.sevenDaySonnet) {
      lines.push(`  ${dim('sonnet:')}  ${formatUsageBar(finalUsage.value.sevenDaySonnet.utilization, 20)}`);
    }
    lines.push('');
  }

  // Divider
  lines.push(dim('─'.repeat(Math.min(50, termWidth - 12))));
  lines.push('');

  // Completed tasks
  lines.push(`  ${bold('Completed')} ${dim(`(${completed.length} tasks)`)}`);
  lines.push('');
  for (const task of completed.slice(0, 4)) {
    lines.push(`  ${successColor(CHECK)} ${dim(truncateTask(task, termWidth - 18))}`);
  }
  if (completed.length > 4) {
    lines.push(dim(`     ...and ${completed.length - 4} more`));
  }

  // Next steps
  if (nextSteps.length > 0) {
    lines.push('');
    lines.push(`  ${bold('Next Steps')}`);
    lines.push('');
    for (const step of nextSteps) {
      lines.push(`  ${orange('▸')} ${step}`);
    }
  }

  lines.push('');

  // Session file location (if tracker available)
  if (tracker) {
    lines.push(dim(`  Session saved: ${tracker.getFilePath()}`));
    lines.push('');
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
 * Formats a mini usage bar for the summary.
 */
const formatUsageBar = (percent: number, width: number): string => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = amber('█'.repeat(filled)) + dim('░'.repeat(empty));
  return `${bar} ${Math.round(percent)}%`;
};

/**
 * Creates a git tag after successful build completion.
 * Increments patch version by default.
 */
const createGitTag = async (termWidth: number): Promise<void> => {
  try {
    // Get the latest tag
    const latestResult = await getLatestTag();
    if (!latestResult.ok) {
      return; // Silent fail - tagging is optional
    }

    // Increment version
    const newVersion = incrementVersion(latestResult.value, 'patch');

    // Create the tag
    const tagResult = await createTag(newVersion, `Ralph build complete - ${newVersion}`);
    if (!tagResult.ok) {
      console.log(dim(`  Could not create tag: ${tagResult.error.message}`));
      return;
    }

    // Push the tag
    const pushResult = await pushTags();
    if (pushResult.ok) {
      console.log(createBox(
        `${successColor(CHECK)} Tagged ${amber(newVersion)}`,
        { style: 'rounded', padding: 1, paddingY: 0, borderColor: dim, minWidth: termWidth - 6 },
      ));
    } else {
      console.log(createBox(
        `${successColor(CHECK)} Tagged ${amber(newVersion)} ${dim('(not pushed)')}`,
        { style: 'rounded', padding: 1, paddingY: 0, borderColor: dim, minWidth: termWidth - 6 },
      ));
    }
  } catch {
    // Silent fail - tagging is optional
  }
};

/**
 * Renders the cached context box with vibe icons.
 */
const renderCachedContextBox = (context: BaseSessionContext): void => {
  const specItems = context.specs.length > 0
    ? context.specs.map((s) => `specs/${s}`)
    : ['(none)'];

  console.log(detailBox({
    icon: '🍺',
    title: 'Context Cached',
    subtitle: 'forking enabled',
    sections: [
      {
        label: 'Cached specs:',
        items: specItems,
      },
      {
        label: 'Fresh each iteration:',
        items: ['IMPLEMENTATION_PLAN.md', 'AGENTS.md'],
      },
    ],
    footer: 'If specs change mid-session, cache auto-refreshes.',
    borderColor: cyan,
  }));
  console.log();
};

/**
 * Renders a notification that specs changed and cache was refreshed.
 */
const renderCacheRefreshBox = (context: BaseSessionContext): void => {
  console.log(detailBox({
    icon: '🔄',
    title: 'Specs Modified',
    subtitle: 'cache refreshed',
    sections: [
      {
        label: 'Updated specs:',
        items: context.specs.map((s) => `specs/${s}`),
      },
    ],
    footer: 'New base session created with fresh specs.',
    borderColor: amber,
  }));
  console.log();
};

/**
 * The main build loop.
 */
const buildLoop = async (
  modelMode: 'opus' | 'sonnet' | 'adaptive',
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

  // Format model display for header
  const modelDisplay = modelMode === 'adaptive' ? 'adaptive (sonnet/opus)' : modelMode;

  console.log();
  console.log(commandHeader({
    name: 'Ralph Work',
    description: `Autonomous build loop · ${modelDisplay} · max ${maxIterations} iterations`,
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Initialize base session with specs and AGENTS.md for prompt caching
  const baseModel = modelMode === 'adaptive' ? 'opus' : modelMode;
  const baseSessionResult = await initializeBaseSession(baseModel);

  let baseSession: BaseSessionContext | null = null;
  if (baseSessionResult.ok) {
    baseSession = baseSessionResult.value;
    renderCachedContextBox(baseSession);
  } else {
    // Fallback: no caching, just show a note
    console.log(dim('  ℹ No specs/AGENTS.md found - running without cache'));
    console.log();
  }

  // Initialize session tracker for detailed stats
  const sessionTracker = new SessionTracker(
    baseSession !== null,
    baseSession?.specs.length ?? 0,
  );

  while (sessionStats.totalIterations < maxIterations) {
    sessionStats.totalIterations++;
    const iteration = sessionStats.totalIterations;

    // Check if specs have changed since base session was created
    // If so, refresh the cache to maintain consistency
    if (baseSession) {
      const specsChanged = await haveSpecsChanged(baseSession.specsMtimes);
      if (specsChanged) {
        const newSessionResult = await initializeBaseSession(baseModel);
        if (newSessionResult.ok) {
          baseSession = newSessionResult.value;
          renderCacheRefreshBox(baseSession);
        } else {
          // Fall back to non-cached mode
          baseSession = null;
          console.log(dim('  ℹ Could not refresh cache - continuing without caching'));
          console.log();
        }
      }
    }

    // Get usage before iteration
    const usageBefore = await getSubscriptionUsage();
    const usageBeforeVal = usageBefore.ok ? usageBefore.value.fiveHour.utilization : null;

    const result = await runIteration(iteration, modelMode, baseSession);

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

    // Record iteration to session tracker
    await sessionTracker.recordIteration({
      iteration,
      task: result.status?.task ?? 'Unknown task',
      model: result.modelUsed,
      durationSec: result.usage.durationSec,
      operations: result.usage.operations,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      cacheReadTokens: result.usage.cacheReadTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      success: result.success,
    });

    if (!result.success) {
      // Show error summary box
      renderIterationSummary(iteration, result.status, result.usage, result.modelUsed, false, usageDelta);
      await renderWorkSummary(completedTasks, sessionStats, true, sessionTracker);
      Deno.exit(1);
    }

    // Show completion summary box (white border)
    renderIterationSummary(iteration, result.status, result.usage, result.modelUsed, true, usageDelta);

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

      // Create git tag on successful completion
      await createGitTag(termWidth);
      break;
    }

    // Check for validation failure
    if (result.status?.validation === 'fail') {
      console.log();
      console.log(error(`  ${CROSS} Validation failed - stopping loop`));
      await renderWorkSummary(completedTasks, sessionStats, true, sessionTracker);
      Deno.exit(1);
    }

    // Brief pause between iterations (fresh context)
    if (iteration < maxIterations) {
      const termWidth = getTerminalWidth();
      const barWidth = termWidth - 22;

      // Build pause box content with usage info
      const pauseLines: string[] = [];
      pauseLines.push(dim(`Next iteration in 2s...`));

      // Add session stats so far
      const totalTokensSoFar = sessionStats.totalInputTokens + sessionStats.totalOutputTokens;
      const statsStr = [
        `${iteration}/${maxIterations} iterations`,
        `${sessionStats.totalOperations} ops`,
        totalTokensSoFar > 0 ? `${formatTokensCompact(totalTokensSoFar)} tokens` : null,
      ].filter(Boolean).join(' · ');
      pauseLines.push(dim(statsStr));

      // Add subscription usage bars (same style as header)
      const currentUsage = await getSubscriptionUsage();
      if (currentUsage.ok) {
        pauseLines.push('');
        const fiveHr = currentUsage.value.fiveHour.utilization;
        const sevenDay = currentUsage.value.sevenDay.utilization;
        pauseLines.push(`5h:      ${amber(progressBar(fiveHr, barWidth))}`);
        pauseLines.push('');
        pauseLines.push(`7d:      ${dim(progressBar(sevenDay, barWidth))}`);

        // Add Sonnet-specific usage if available
        if (currentUsage.value.sevenDaySonnet) {
          const sonnetUsage = currentUsage.value.sevenDaySonnet.utilization;
          pauseLines.push('');
          pauseLines.push(`sonnet:  ${cyan(progressBar(sonnetUsage, barWidth))}`);
        }
      }

      console.log(
        createBox(pauseLines.join('\n'), {
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

  await renderWorkSummary(completedTasks, sessionStats, false, sessionTracker);
};

// ============================================================================
// Command Action
// ============================================================================

/**
 * The work command action.
 */
async function workAction(options: WorkOptions): Promise<void> {
  // Use config default (25) if not specified
  const maxIterations = options.maxIterations ?? DEFAULT_WORK.maxIterations;

  // Warn if max iterations is very high (potential runaway)
  if (maxIterations > 50) {
    console.log();
    console.log(amber(`  ${INFO} High iteration limit (${maxIterations}). Consider using ${RECOMMENDED_MAX_ITERATIONS} for safety.`));
    console.log(muted('     High limits can lead to runaway loops on impossible tasks.'));
  }

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

  // Dry run mode - show comprehensive info
  if (options.dryRun) {
    // Read config for model setting
    const dryRunConfigResult = await readConfig();

    // Determine model - same logic as real run
    let dryRunModelMode: 'opus' | 'sonnet' | 'adaptive';
    if (options.model) {
      dryRunModelMode = options.model;
    } else if (options.adaptive) {
      dryRunModelMode = 'adaptive';
    } else {
      dryRunModelMode = dryRunConfigResult.ok ? dryRunConfigResult.value.work.model : 'opus';
    }

    // Get next task
    const nextTask = await getNextTaskFromPlan();

    // Check for specs (would enable fork mode)
    const specsDir = `${Deno.cwd()}/specs`;
    let specFiles: string[] = [];
    try {
      for await (const entry of Deno.readDir(specsDir)) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          specFiles.push(entry.name);
        }
      }
    } catch { /* no specs dir */ }

    // Get subscription usage
    const usage = await getSubscriptionUsage();

    // Model display
    const modelDisplay = dryRunModelMode === 'adaptive'
      ? `${amber('adaptive')} (sonnet for simple, opus for complex)`
      : amber(dryRunModelMode);

    // Fork mode display
    const forkDisplay = specFiles.length > 0
      ? `${successColor(CHECK)} Yes (${specFiles.length} specs cached)`
      : `${dim('No')} (no specs found)`;

    // Task display
    const taskDisplay = nextTask
      ? `${orange(nextTask.task)}\n     ${dim(`Phase: ${nextTask.phase ?? 'unknown'}`)}`
      : dim('No pending tasks found');

    // Build info lines
    const lines: string[] = [
      `${bold('Model:')}       ${modelDisplay}`,
      `${bold('Fork mode:')}   ${forkDisplay}`,
      `${bold('Max iters:')}   ${maxIterations}`,
      '',
      `${bold('Next task:')}   ${taskDisplay}`,
      '',
      `${bold('Plan:')}        ${dim(planPath)}`,
    ];

    if (specFiles.length > 0) {
      lines.push(`${bold('Specs:')}       ${dim(specFiles.join(', '))}`);
    }

    if (usage.ok) {
      lines.push('');
      lines.push(`${bold('Usage:')}       ${formatSubscriptionUsage(usage.value)}`);
    }

    const termWidth = getTerminalWidth();
    console.log();
    console.log(createBox(
      `${orange('◆')} ${bold('Dry Run Mode')}\n\n${lines.join('\n')}`,
      {
        style: 'rounded',
        padding: 1,
        paddingY: 0,
        borderColor: orange,
        minWidth: termWidth - 6,
      },
    ));
    console.log();
    console.log(dim('  Run without --dry-run to start the build loop.'));
    console.log();
    return;
  }

  // Read config for model setting
  const configResult = await readConfig();

  // Determine model - precedence: --model > --adaptive > config
  let modelMode: 'opus' | 'sonnet' | 'adaptive';

  if (options.model) {
    // Explicit model flag takes highest precedence
    modelMode = options.model;
  } else if (options.adaptive) {
    modelMode = 'adaptive';
  } else {
    modelMode = configResult.ok ? configResult.value.work.model : 'opus';
  }

  // Run the build loop
  await buildLoop(modelMode, maxIterations);
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
    .option('-n, --max-iterations <count:number>', 'Maximum iterations before stopping (default: 25 for safety)', {
      default: DEFAULT_WORK.maxIterations,
    })
    .option('--dry-run', 'Show what would happen without running')
    .option('--vibe', 'Vibe mode (no effect on work - already the last step)')
    .option('--adaptive', 'Adaptive model selection (sonnet for simple, opus for complex)')
    .option('--model <model:string>', 'Force specific model (opus or sonnet)', {
      value: (val: string) => {
        if (val !== 'opus' && val !== 'sonnet') {
          throw new Error('Model must be "opus" or "sonnet"');
        }
        return val as 'opus' | 'sonnet';
      },
    })
    .action(workAction);
}
