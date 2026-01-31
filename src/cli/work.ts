/**
 * @module cli/work
 *
 * The `ralph work` command.
 * Runs the autonomous build loop - Claude implements tasks one at a time.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, error, muted } from '@/ui/colors.ts';
import { CROSS, INFO } from '@/ui/symbols.ts';
import { isRalphProject, readConfig } from '@/services/project_service.ts';
import { DEFAULT_WORK, RECOMMENDED_MAX_ITERATIONS } from '@/core/config.ts';
import {
  type BaseSessionContext,
  haveSpecsChanged,
  initializeBaseSession,
  isClaudeInstalled,
  parseAssistantMessage,
  runClaude,
} from '@/services/claude_service.ts';
import { assessComplexity } from '@/core/complexity.ts';
import { exists, readTextFile } from '@/services/file_service.ts';
import { resolvePaths } from '@/services/path_resolver.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  continueVibeSlcLoop,
  enableVibeMode,
  getVibeLoopState,
  initializeVibeLoop,
  isVibeMode,
  showAllSlcsComplete,
  showMaxSlcReached,
  showVibeActivated,
} from './vibe.ts';
import { renderWork, type IterationResult } from '@/components/WorkScreen.tsx';
import type { EnhancedToolCall } from '@/components/ui/ToolActivity.tsx';

// ============================================================================
// Prompt Reading
// ============================================================================

/**
 * Reads the build prompt from the project's configured build prompt file.
 * Path is resolved from .ralph.json config.
 */
async function readBuildPrompt(): Promise<string | null> {
  const paths = await resolvePaths();
  const result = await readTextFile(paths.buildPrompt);
  if (!result.ok) {
    return null;
  }
  return result.value;
}

// ============================================================================
// Types
// ============================================================================

interface RalphStatus {
  readonly task: string;
  readonly phase: number;
  readonly validation: 'pass' | 'fail';
  readonly exitSignal: boolean;
  readonly slcComplete: boolean;
}

interface WorkOptions {
  readonly maxIterations?: number;
  readonly dryRun?: boolean;
  readonly vibe?: boolean;
  readonly adaptive?: boolean;
  readonly model?: 'opus' | 'sonnet';
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
    slcComplete: data.slc_complete === 'true' || data.slcComplete === 'true',
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
  const paths = await resolvePaths();
  const result = await readTextFile(paths.plan);
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
// Command Action
// ============================================================================

/**
 * The work command action.
 */
async function workAction(options: WorkOptions): Promise<void> {
  // Read config for various settings
  const configResult = await readConfig();
  const config = configResult.ok ? configResult.value : null;

  // Use config default (25) if not specified
  const maxIterations = options.maxIterations ?? DEFAULT_WORK.maxIterations;
  const maxSlcIterations = config?.work.maxSlcIterations ?? DEFAULT_WORK.maxSlcIterations;

  // Check if we're in vibe loop mode (set by environment from previous cycle)
  const vibeLoopState = getVibeLoopState();
  if (vibeLoopState) {
    enableVibeMode();
  }

  // Handle --vibe flag (explicit activation)
  if (options.vibe && !vibeLoopState) {
    enableVibeMode();
    const vibeEnv = initializeVibeLoop(maxSlcIterations);
    // Set env vars for the current process so we can read them later
    for (const [key, value] of Object.entries(vibeEnv)) {
      Deno.env.set(key, value);
    }
    showVibeActivated([
      'Run autonomous build loop',
      'If more SLCs remain → research → plan → work (repeat)',
    ]);
  }

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
  const paths = await resolvePaths();
  if (!(await exists(paths.plan))) {
    console.log(error(`${CROSS} No implementation plan found.`));
    console.log(muted('  Run `ralph plan` first to generate a plan.'));
    Deno.exit(1);
  }

  // Dry run mode - show comprehensive info (keep console.log for non-interactive output)
  if (options.dryRun) {
    const dryRunConfigResult = await readConfig();

    let dryRunModelMode: 'opus' | 'sonnet' | 'adaptive';
    if (options.model) {
      dryRunModelMode = options.model;
    } else if (options.adaptive) {
      dryRunModelMode = 'adaptive';
    } else {
      dryRunModelMode = dryRunConfigResult.ok ? dryRunConfigResult.value.work.model : 'opus';
    }

    const nextTask = await getNextTaskFromPlan();
    const usage = await getSubscriptionUsage();

    console.log();
    console.log(`◆ Dry Run Mode`);
    console.log();
    console.log(`  Model:        ${dryRunModelMode}`);
    console.log(`  Max iters:    ${maxIterations}`);
    console.log(`  Next task:    ${nextTask?.task ?? '(none)'}`);
    console.log(`  Plan:         ${paths.plan}`);
    if (usage.ok) {
      console.log(`  Usage:        5h: ${Math.round(usage.value.fiveHour.utilization)}% · 7d: ${Math.round(usage.value.sevenDay.utilization)}%`);
    }
    console.log();
    console.log(`  Run without --dry-run to start the build loop.`);
    console.log();
    return;
  }

  // Determine model - precedence: --model > --adaptive > config
  let modelMode: 'opus' | 'sonnet' | 'adaptive';
  if (options.model) {
    modelMode = options.model;
  } else if (options.adaptive) {
    modelMode = 'adaptive';
  } else {
    modelMode = config?.work.model ?? 'opus';
  }

  // Initialize base session for prompt caching
  const baseModel = modelMode === 'adaptive' ? 'opus' : modelMode;
  let baseSession: BaseSessionContext | null = null;
  const baseSessionResult = await initializeBaseSession(baseModel);
  if (baseSessionResult.ok) {
    baseSession = baseSessionResult.value;
  }

  // Fetch initial subscription usage
  const initialUsage = await getSubscriptionUsage();

  // Run the build loop with React UI
  const result = await renderWork({
    maxIterations,
    modelMode,
    usage: initialUsage.ok ? initialUsage.value : undefined,
    vibeMode: isVibeMode(),
    pauseDuration: 2000,
    onRefreshUsage: async () => {
      const usage = await getSubscriptionUsage();
      return usage.ok ? usage.value : undefined;
    },
    onRunIteration: async (iteration, { onToolUse, onStatusUpdate, onTaskUpdate }) => {
      // Get next task from plan
      const nextTask = await getNextTaskFromPlan();
      if (nextTask?.task) {
        onTaskUpdate(nextTask.task);
      }

      // Determine model for this iteration
      let model: 'opus' | 'sonnet';
      if (modelMode === 'adaptive' && nextTask?.task) {
        const assessment = assessComplexity(nextTask.task, nextTask.phase);
        model = assessment.model;
      } else if (modelMode === 'adaptive') {
        model = 'opus';
      } else {
        model = modelMode as 'opus' | 'sonnet';
      }

      // Read the build prompt
      const prompt = await readBuildPrompt();
      if (!prompt) {
        return {
          success: false,
          error: 'PROMPT_build.md not found. Run `ralph init` to create it.',
          model,
          operations: 0,
          durationSec: 0,
        };
      }

      // Check if specs changed and refresh cache if needed
      if (baseSession) {
        const specsChanged = await haveSpecsChanged(baseSession.specsMtimes);
        if (specsChanged) {
          const newSessionResult = await initializeBaseSession(baseModel);
          if (newSessionResult.ok) {
            baseSession = newSessionResult.value;
          } else {
            baseSession = null;
          }
        }
      }

      // Run Claude
      const startTime = Date.now();
      let totalOps = 0;
      let fullText = '';
      let hasError = false;
      let toolCounter = 0;
      let currentToolId: string | null = null;

      // Token tracking from result event
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let cacheReadTokens: number | undefined;
      let cacheWriteTokens: number | undefined;
      let totalCostUsd: number | undefined;

      try {
        for await (const event of runClaude({
          prompt,
          model,
          skipPermissions: true,
          resumeSessionId: baseSession?.sessionId,
          forkSession: baseSession !== null,
        })) {
          if (event.type === 'assistant') {
            const messages = parseAssistantMessage(event);

            for (const msg of messages) {
              if (msg.text) {
                fullText += msg.text;

                // Get first paragraph or substantial text for status (allow multi-line display)
                const firstParagraph = msg.text.split('\n\n')[0]?.trim().replace(/\n/g, ' ');
                if (firstParagraph && firstParagraph.length > 0 && !firstParagraph.startsWith('#') && !firstParagraph.startsWith('`')) {
                  // Allow up to 300 chars for multi-line status display
                  onStatusUpdate(firstParagraph.length > 300 ? firstParagraph.slice(0, 297) + '...' : firstParagraph);
                }
              }

              if (msg.toolUse) {
                // Mark previous tool as completed
                if (currentToolId) {
                  onToolUse({
                    id: currentToolId,
                    name: '', // Will be ignored since we're just updating status
                    status: 'success',
                    endTime: Date.now(),
                    input: {},
                  });
                }

                totalOps++;
                toolCounter++;
                const toolId = `${iteration}-${toolCounter}`;
                currentToolId = toolId;

                // Extract input and subagent model from tool use
                const toolInput = msg.toolUse.input ?? {};
                const subagentModel = msg.toolUse.name === 'Task'
                  ? (toolInput.model as string | undefined)
                  : undefined;

                // Emit running tool
                onToolUse({
                  id: toolId,
                  name: msg.toolUse.name,
                  status: 'running',
                  startTime: Date.now(),
                  input: toolInput as Record<string, unknown>,
                  subagentModel,
                });
              }
            }
          } else if (event.type === 'result') {
            const data = event.data as Record<string, unknown>;
            hasError = data.is_error === true;

            // Extract token data from result event with robust fallback pattern
            // Result format: { total_cost_usd, usage: { input_tokens, ... } } or { result: { usage: { ... } } }
            const usage = data.usage as Record<string, number> | undefined;
            const result = data.result as Record<string, unknown> | undefined;
            const resultUsage = result?.usage as Record<string, number> | undefined;

            inputTokens = usage?.input_tokens ?? resultUsage?.input_tokens ?? 0;
            outputTokens = usage?.output_tokens ?? resultUsage?.output_tokens ?? 0;
            cacheReadTokens = usage?.cache_read_input_tokens ?? resultUsage?.cache_read_input_tokens ?? 0;
            cacheWriteTokens = usage?.cache_creation_input_tokens ?? resultUsage?.cache_creation_input_tokens ?? 0;
            if (typeof data.total_cost_usd === 'number') {
              totalCostUsd = data.total_cost_usd;
            }

            // Mark last tool as completed
            if (currentToolId) {
              onToolUse({
                id: currentToolId,
                name: '',
                status: hasError ? 'error' : 'success',
                endTime: Date.now(),
                input: {},
              });
              currentToolId = null;
            }
          }
        }
      } catch (e) {
        // Mark last tool as error if running
        if (currentToolId) {
          onToolUse({
            id: currentToolId,
            name: '',
            status: 'error',
            endTime: Date.now(),
            input: {},
          });
        }
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
          model,
          operations: totalOps,
          durationSec: Math.floor((Date.now() - startTime) / 1000),
        };
      }

      // Parse the status from Claude's output
      const status = parseRalphStatus(fullText);
      const exitSignal = status?.exitSignal ?? hasExitSignal(fullText);
      const durationSec = Math.floor((Date.now() - startTime) / 1000);

      return {
        success: !hasError,
        task: status?.task ?? nextTask?.task,
        validation: status?.validation ?? 'pass',
        exitSignal,
        model,
        operations: totalOps,
        durationSec,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
      };
    },
  });

  // Handle vibe loop continuation
  if (isVibeMode() && result.completed) {
    const currentState = getVibeLoopState();

    // Check if SLC is complete (would need to track this from iteration results)
    // For now, assume completed means all tasks done
    if (currentState) {
      if (currentState.slcIteration >= currentState.maxSlcIterations) {
        showMaxSlcReached(currentState.maxSlcIterations);
        Deno.exit(0);
        return;
      }

      // Continue with next SLC cycle
      await continueVibeSlcLoop(currentState);
    } else {
      showAllSlcsComplete(1);
      Deno.exit(0);
    }
  } else {
    // Not in vibe mode - exit cleanly
    Deno.exit(result.completed ? 0 : 1);
  }
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
