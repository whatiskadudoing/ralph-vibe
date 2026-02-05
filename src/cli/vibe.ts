/**
 * @module cli/vibe
 *
 * Vibe mode - autonomous continuation between commands.
 * When --vibe flag is used, commands automatically continue to subsequent steps.
 *
 * Flow order:
 * init → start → plan → work
 *
 * Examples:
 * - `ralph init --vibe` → init, start, plan, work
 * - `ralph spec --vibe` → spec, plan, work
 * - `ralph plan --vibe` → plan, work
 *
 * Includes rich data output showing:
 * - SLC (Spec-Learn-Create) cycle progress indicators
 * - Cumulative session metrics (tokens, cost, duration)
 * - Estimated remaining work
 * - Rich completion summary
 */

import {
  amber,
  bold,
  cyan,
  dim,
  green,
  muted,
  orange,
  success as successColor,
} from '@/ui/colors.ts';
import { ARROW_RIGHT, BULLET, CHECK } from '@/ui/symbols.ts';
import { DEFAULT_WORK } from '@/core/config.ts';
import { formatTokens } from '@/services/session_tracker.ts';
import { formatCost } from '@/services/cost_calculator.ts';
import { formatDuration } from '@/services/status_reporter.ts';

// ============================================================================
// Autonomous Mode Messages
// ============================================================================

const AUTONOMOUS_MESSAGES = [
  {
    emoji: '🍺',
    title: 'Time to grab a beer!',
    message:
      "The interactive part is done. From here on, it's fully autonomous.\nGo enjoy yourself - I'll handle the rest and let you know when it's done.",
  },
  {
    emoji: '☕',
    title: 'Coffee break time!',
    message:
      "You've done your part. Now sit back and relax.\nI'll build everything and notify you when it's complete.",
  },
  {
    emoji: '🚀',
    title: 'Launching autonomous mode!',
    message:
      "No more input needed from you. Go touch grass, call a friend, take a nap.\nI'll be here building your project.",
  },
  {
    emoji: '🎮',
    title: 'Go play some games!',
    message:
      "The boring part is over. Time for fun!\nI'll keep working in the background and ping you when done.",
  },
  {
    emoji: '🌴',
    title: 'Vacation mode activated!',
    message:
      "Your work here is done. Go do literally anything else.\nI'm on it, and I won't stop until it's built.",
  },
];

// ============================================================================
// SLC Phase Types
// ============================================================================

/**
 * SLC (Spec-Learn-Create) phases in the vibe cycle.
 */
export type SlcPhase = 'spec' | 'learn' | 'create';

/**
 * SLC phase display info.
 */
interface SlcPhaseInfo {
  readonly name: string;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
}

const SLC_PHASES: Record<SlcPhase, SlcPhaseInfo> = {
  spec: {
    name: 'spec',
    label: 'Spec',
    emoji: '📋',
    description: 'Defining requirements and specifications',
  },
  learn: {
    name: 'learn',
    label: 'Learn',
    emoji: '🔍',
    description: 'Researching and planning implementation',
  },
  create: {
    name: 'create',
    label: 'Create',
    emoji: '🛠️',
    description: 'Building and implementing features',
  },
};

/**
 * Maps commands to their SLC phase.
 */
const COMMAND_TO_PHASE: Record<string, SlcPhase> = {
  init: 'spec',
  start: 'spec',
  spec: 'spec',
  research: 'learn',
  plan: 'learn',
  work: 'create',
};

// ============================================================================
// Vibe Session State
// ============================================================================

/**
 * Cumulative vibe session metrics.
 */
export interface VibeSessionMetrics {
  readonly totalIterations: number;
  readonly totalSlcCycles: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheReadTokens: number;
  readonly totalCost: number;
  readonly totalDurationMs: number;
  readonly totalToolCalls: number;
  readonly cacheEfficiency: number;
  readonly phaseMetrics: Record<SlcPhase, PhaseMetrics>;
}

/**
 * Metrics for a single SLC phase.
 */
export interface PhaseMetrics {
  readonly iterations: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly toolCalls: number;
}

/**
 * Creates empty vibe session metrics.
 */
function createEmptyVibeSessionMetrics(): VibeSessionMetrics {
  return {
    totalIterations: 0,
    totalSlcCycles: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCost: 0,
    totalDurationMs: 0,
    totalToolCalls: 0,
    cacheEfficiency: 0,
    phaseMetrics: {
      spec: { iterations: 0, inputTokens: 0, outputTokens: 0, durationMs: 0, toolCalls: 0 },
      learn: { iterations: 0, inputTokens: 0, outputTokens: 0, durationMs: 0, toolCalls: 0 },
      create: { iterations: 0, inputTokens: 0, outputTokens: 0, durationMs: 0, toolCalls: 0 },
    },
  };
}

// ============================================================================
// Vibe State
// ============================================================================

let vibeMode = false;
let currentSlcPhase: SlcPhase = 'spec';
let vibeSessionMetrics: VibeSessionMetrics = createEmptyVibeSessionMetrics();
let vibeSessionStartTime: number = 0;

/**
 * Enables vibe mode (autonomous continuation).
 */
export function enableVibeMode(): void {
  vibeMode = true;
  vibeSessionStartTime = Date.now();
  vibeSessionMetrics = createEmptyVibeSessionMetrics();
}

/**
 * Checks if vibe mode is enabled.
 */
export function isVibeMode(): boolean {
  return vibeMode;
}

/**
 * Gets the current SLC phase.
 */
export function getCurrentSlcPhase(): SlcPhase {
  return currentSlcPhase;
}

/**
 * Sets the current SLC phase based on command.
 */
export function setSlcPhaseFromCommand(command: string): void {
  const phase = COMMAND_TO_PHASE[command];
  if (phase) {
    currentSlcPhase = phase;
  }
}

/**
 * Gets the current vibe session metrics.
 */
export function getVibeSessionMetrics(): VibeSessionMetrics {
  return vibeSessionMetrics;
}

/**
 * Updates vibe session metrics with iteration data.
 */
export function updateVibeSessionMetrics(
  phase: SlcPhase,
  metrics: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cost: number;
    durationMs: number;
    toolCalls: number;
  },
): void {
  const phaseMetrics = vibeSessionMetrics.phaseMetrics[phase];
  const updatedPhaseMetrics: PhaseMetrics = {
    iterations: phaseMetrics.iterations + 1,
    inputTokens: phaseMetrics.inputTokens + metrics.inputTokens,
    outputTokens: phaseMetrics.outputTokens + metrics.outputTokens,
    durationMs: phaseMetrics.durationMs + metrics.durationMs,
    toolCalls: phaseMetrics.toolCalls + metrics.toolCalls,
  };

  const totalInputWithCache = vibeSessionMetrics.totalInputTokens +
    metrics.inputTokens +
    (vibeSessionMetrics.totalCacheReadTokens + (metrics.cacheReadTokens ?? 0));
  const totalCacheRead = vibeSessionMetrics.totalCacheReadTokens + (metrics.cacheReadTokens ?? 0);
  const cacheEfficiency = totalInputWithCache > 0
    ? (totalCacheRead / totalInputWithCache) * 100
    : 0;

  vibeSessionMetrics = {
    totalIterations: vibeSessionMetrics.totalIterations + 1,
    totalSlcCycles: vibeSessionMetrics.totalSlcCycles,
    totalInputTokens: vibeSessionMetrics.totalInputTokens + metrics.inputTokens,
    totalOutputTokens: vibeSessionMetrics.totalOutputTokens + metrics.outputTokens,
    totalCacheReadTokens: vibeSessionMetrics.totalCacheReadTokens + (metrics.cacheReadTokens ?? 0),
    totalCost: vibeSessionMetrics.totalCost + metrics.cost,
    totalDurationMs: vibeSessionMetrics.totalDurationMs + metrics.durationMs,
    totalToolCalls: vibeSessionMetrics.totalToolCalls + metrics.toolCalls,
    cacheEfficiency,
    phaseMetrics: {
      ...vibeSessionMetrics.phaseMetrics,
      [phase]: updatedPhaseMetrics,
    },
  };
}

/**
 * Increments the SLC cycle count.
 */
export function incrementSlcCycle(): void {
  vibeSessionMetrics = {
    ...vibeSessionMetrics,
    totalSlcCycles: vibeSessionMetrics.totalSlcCycles + 1,
  };
}

// ============================================================================
// Vibe Loop State (SLC Iterations)
// ============================================================================

/**
 * Environment variable names for vibe loop state.
 */
const VIBE_ENV = {
  MODE: 'RALPH_VIBE_MODE',
  SLC_ITERATION: 'RALPH_SLC_ITERATION',
  MAX_SLC_ITERATIONS: 'RALPH_MAX_SLC_ITERATIONS',
  TASK_SLC_MODE: 'RALPH_TASK_SLC_MODE',
} as const;

/**
 * State for the vibe loop (research → plan → work cycles).
 */
export interface VibeLoopState {
  readonly slcIteration: number;
  readonly maxSlcIterations: number;
  readonly taskSlcMode: boolean;
}

/**
 * Gets the current vibe loop state from environment variables.
 * Returns null if not in vibe loop mode.
 */
export function getVibeLoopState(): VibeLoopState | null {
  const mode = Deno.env.get(VIBE_ENV.MODE);
  if (mode !== '1') return null;

  const iteration = parseInt(Deno.env.get(VIBE_ENV.SLC_ITERATION) ?? '1', 10);
  const maxIterations = parseInt(
    Deno.env.get(VIBE_ENV.MAX_SLC_ITERATIONS) ?? String(DEFAULT_WORK.maxSlcIterations),
    10,
  );
  const taskSlcMode = Deno.env.get(VIBE_ENV.TASK_SLC_MODE) === '1';

  return {
    slcIteration: iteration,
    maxSlcIterations: maxIterations,
    taskSlcMode: taskSlcMode,
  };
}

/**
 * Creates environment variables for child processes in vibe loop.
 */
export function setVibeLoopEnv(state: VibeLoopState): Record<string, string> {
  return {
    [VIBE_ENV.MODE]: '1',
    [VIBE_ENV.SLC_ITERATION]: String(state.slcIteration),
    [VIBE_ENV.MAX_SLC_ITERATIONS]: String(state.maxSlcIterations),
    [VIBE_ENV.TASK_SLC_MODE]: state.taskSlcMode ? '1' : '0',
  };
}

/**
 * Initializes vibe loop environment for the first iteration.
 * Call this when starting work with --vibe flag.
 */
export function initializeVibeLoop(
  maxSlcIterations: number,
  taskSlcMode: boolean = false,
): Record<string, string> {
  return setVibeLoopEnv({
    slcIteration: 1,
    maxSlcIterations,
    taskSlcMode,
  });
}

// ============================================================================
// SLC Phase Progress Display
// ============================================================================

/**
 * Shows the current SLC phase progress indicator.
 */
export function showSlcPhaseProgress(currentPhase: SlcPhase, iteration?: number): void {
  const phases: SlcPhase[] = ['spec', 'learn', 'create'];
  const phaseIndex = phases.indexOf(currentPhase);

  console.log();
  console.log(dim('─'.repeat(50)));
  console.log(`${bold(orange('SLC Cycle Progress'))}`);
  console.log();

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i] as SlcPhase;
    const info = SLC_PHASES[phase];
    const isCurrent = i === phaseIndex;
    const isComplete = i < phaseIndex;

    let status: string;
    if (isComplete) {
      status = `${green(CHECK)} ${dim(info.label)}`;
    } else if (isCurrent) {
      status = `${orange(ARROW_RIGHT)} ${bold(orange(info.label))} ${dim('(active)')}`;
    } else {
      status = `${dim(BULLET)} ${muted(info.label)}`;
    }

    console.log(`  ${info.emoji} ${status}`);
    if (isCurrent) {
      console.log(`     ${dim(info.description)}`);
    }
  }

  if (iteration !== undefined) {
    console.log();
    console.log(`  ${dim('Iteration:')} ${amber(String(iteration))}`);
  }

  console.log(dim('─'.repeat(50)));
  console.log();
}

/**
 * Shows cumulative session metrics during vibe mode.
 */
export function showCumulativeMetrics(): void {
  const metrics = vibeSessionMetrics;
  const elapsedMs = Date.now() - vibeSessionStartTime;

  console.log();
  console.log(dim('─'.repeat(50)));
  console.log(`${bold(cyan('Cumulative Session Metrics'))}`);
  console.log();

  // Token usage
  const totalTokens = metrics.totalInputTokens + metrics.totalOutputTokens;
  console.log(
    `  ${dim('Tokens:')} ${formatTokens(totalTokens)} (${
      formatTokens(metrics.totalInputTokens)
    } in / ${formatTokens(metrics.totalOutputTokens)} out)`,
  );

  // Cache efficiency
  if (metrics.totalCacheReadTokens > 0) {
    console.log(
      `  ${dim('Cache:')} ${formatTokens(metrics.totalCacheReadTokens)} read (${
        metrics.cacheEfficiency.toFixed(1)
      }% efficiency)`,
    );
  }

  // Cost
  console.log(`  ${dim('Cost:')} ${formatCost(metrics.totalCost)}`);

  // Duration
  console.log(`  ${dim('Duration:')} ${formatDuration(elapsedMs)}`);

  // Tool calls
  console.log(`  ${dim('Operations:')} ${metrics.totalToolCalls} tool calls`);

  // SLC cycles
  if (metrics.totalSlcCycles > 0) {
    console.log(`  ${dim('SLC Cycles:')} ${metrics.totalSlcCycles} complete`);
  }

  console.log(dim('─'.repeat(50)));
  console.log();
}

/**
 * Shows a rich completion summary at the end of vibe session.
 */
export function showVibeCompletionSummary(totalIterations: number): void {
  const metrics = vibeSessionMetrics;
  const totalDurationMs = Date.now() - vibeSessionStartTime;
  const totalTokens = metrics.totalInputTokens + metrics.totalOutputTokens;

  console.log();
  console.log(`${bold(successColor('════════════════════════════════════════════════════════'))}`);
  console.log();
  console.log(`  ${successColor(CHECK)} ${bold(successColor('Vibe Session Complete!'))} 🎉`);
  console.log();

  // Main stats
  console.log(`  ${bold('Session Summary')}`);
  console.log(`  ${dim('─'.repeat(40))}`);
  console.log();

  // SLC Cycles
  console.log(
    `  ${cyan('📊')} ${bold('SLC Cycles:')} ${amber(String(metrics.totalSlcCycles || 1))}`,
  );

  // Total iterations
  console.log(`  ${cyan('🔄')} ${bold('Iterations:')} ${amber(String(totalIterations))}`);

  // Token usage with cache efficiency
  console.log();
  console.log(`  ${bold('Token Usage')}`);
  console.log(`     Total: ${formatTokens(totalTokens)}`);
  console.log(`     Input: ${formatTokens(metrics.totalInputTokens)}`);
  console.log(`     Output: ${formatTokens(metrics.totalOutputTokens)}`);
  if (metrics.totalCacheReadTokens > 0) {
    console.log(
      `     Cache Read: ${formatTokens(metrics.totalCacheReadTokens)} (${
        metrics.cacheEfficiency.toFixed(1)
      }% efficiency)`,
    );
  }

  // Cost
  console.log();
  console.log(`  ${bold('Cost:')} ${amber(formatCost(metrics.totalCost))}`);

  // Duration breakdown
  console.log();
  console.log(`  ${bold('Duration')}`);
  console.log(`     Total: ${formatDuration(totalDurationMs)}`);

  // Phase breakdown
  const phases: SlcPhase[] = ['spec', 'learn', 'create'];
  const activePhases = phases.filter((p) => metrics.phaseMetrics[p].iterations > 0);

  if (activePhases.length > 0) {
    console.log();
    console.log(`  ${bold('Phase Breakdown')}`);
    for (const phase of activePhases) {
      const info = SLC_PHASES[phase];
      const pm = metrics.phaseMetrics[phase];
      const phaseTokens = pm.inputTokens + pm.outputTokens;
      console.log(
        `     ${info.emoji} ${info.label}: ${pm.iterations} iters · ${
          formatTokens(phaseTokens)
        } tokens · ${formatDuration(pm.durationMs)}`,
      );
    }
  }

  // Tool calls summary
  if (metrics.totalToolCalls > 0) {
    console.log();
    console.log(`  ${bold('Tool Calls:')} ${amber(String(metrics.totalToolCalls))} operations`);
  }

  console.log();
  console.log(`${bold(successColor('════════════════════════════════════════════════════════'))}`);
  console.log();
}

/**
 * Shows estimated remaining work (if calculable).
 */
export function showEstimatedRemainingWork(
  currentIteration: number,
  maxIterations: number,
  currentSlcCycle: number,
  maxSlcCycles: number,
): void {
  const metrics = vibeSessionMetrics;

  // Calculate average iteration time
  if (metrics.totalIterations === 0) return;

  const avgIterationMs = metrics.totalDurationMs / metrics.totalIterations;
  const remainingIterations = maxIterations - currentIteration;
  const remainingSlcCycles = maxSlcCycles - currentSlcCycle;

  // Estimate based on current phase patterns
  const estimatedIterationsPerCycle = metrics.totalIterations / Math.max(1, currentSlcCycle);
  const estimatedRemainingIterations = remainingSlcCycles * estimatedIterationsPerCycle +
    remainingIterations;
  const estimatedRemainingMs = estimatedRemainingIterations * avgIterationMs;

  // Calculate estimated remaining cost
  const avgCostPerIteration = metrics.totalCost / metrics.totalIterations;
  const estimatedRemainingCost = estimatedRemainingIterations * avgCostPerIteration;

  console.log();
  console.log(dim('─'.repeat(40)));
  console.log(`${dim('Estimated Remaining:')}`);
  console.log(`  ${dim('Iterations:')} ~${Math.ceil(estimatedRemainingIterations)}`);
  console.log(`  ${dim('Time:')} ~${formatDuration(estimatedRemainingMs)}`);
  console.log(`  ${dim('Cost:')} ~${formatCost(estimatedRemainingCost)}`);
  console.log(dim('─'.repeat(40)));
  console.log();
}

// ============================================================================
// Vibe Messages
// ============================================================================

const VIBE_MESSAGES = [
  "Go grab a beer 🍺 - I've got this.",
  "Time for coffee ☕ - I'll handle the rest.",
  'Take a break - let me cook.',
  'Sit back and relax - vibing in progress.',
  "You can walk away now - I'll build this thing.",
  "Autopilot engaged - see you when it's done.",
];

/**
 * Gets a random vibe message.
 */
function getVibeMessage(): string {
  const idx = Math.floor(Math.random() * VIBE_MESSAGES.length);
  const message = VIBE_MESSAGES[idx];
  return message ?? "Go grab a beer 🍺 - I've got this.";
}

/**
 * Shows the vibe mode activation message.
 */
export function showVibeActivated(nextSteps: string[]): void {
  // Check if first step is interactive
  const hasInteractiveStep = nextSteps.length > 0 &&
    (nextSteps[0]?.includes('interview') || nextSteps[0]?.includes('spec'));

  console.log();
  console.log(`${orange(BULLET)} ${bold(orange('Vibe Mode Activated'))} 🍺`);
  console.log();
  console.log(dim(getVibeMessage()));

  if (hasInteractiveStep) {
    console.log();
    console.log(dim("🎤 I'll ask you a few questions first, then go fully autonomous."));
    console.log(dim("   Make sure you have a beer ready for when we're done here!"));
  }

  console.log();
  console.log(dim('Upcoming:'));
  nextSteps.forEach((step, i) => {
    console.log(`  ${amber(`${i + 1}.`)} ${step}`);
  });
  console.log();
}

/**
 * Shows a transition message between commands in vibe mode.
 * Now includes SLC phase progress indicator.
 */
export function showVibeTransition(fromCommand: string, toCommand: string): void {
  // Update the current SLC phase
  setSlcPhaseFromCommand(toCommand);
  const phase = COMMAND_TO_PHASE[toCommand];
  const phaseInfo = phase ? SLC_PHASES[phase] : null;

  console.log();
  console.log(`${dim('─'.repeat(40))}`);
  console.log(`${dim('Vibe:')} ${muted(fromCommand)} ${dim('→')} ${orange(toCommand)}`);
  if (phaseInfo) {
    console.log(
      `${dim('Phase:')} ${phaseInfo.emoji} ${orange(phaseInfo.label)} ${dim('-')} ${
        dim(phaseInfo.description)
      }`,
    );
  }
  console.log(`${dim('─'.repeat(40))}`);
  console.log();
}

/**
 * Shows the "autonomous mode starting" message with a countdown.
 * This appears after interactive commands (start, spec) complete.
 */
async function showAutonomousStarting(): Promise<void> {
  const idx = Math.floor(Math.random() * AUTONOMOUS_MESSAGES.length);
  const selectedMsg = AUTONOMOUS_MESSAGES[idx];
  const msg = selectedMsg ? selectedMsg : {
    emoji: '🍺',
    title: 'Time to grab a beer!',
    message:
      "The interactive part is done. From here on, it's fully autonomous.\nGo enjoy yourself - I'll handle the rest and let you know when it's done.",
  };

  const countdownSeconds = 5;
  const encoder = new TextEncoder();

  // Show header once
  console.log();
  console.log(`${msg.emoji}  ${bold(orange(msg.title))}`);
  console.log();
  // Split message by newlines and print each line
  for (const line of msg.message.split('\n')) {
    console.log(dim(line));
  }
  console.log();

  // Show countdown with simple overwrite
  for (let i = countdownSeconds; i >= 0; i--) {
    // Clear previous countdown line
    if (i < countdownSeconds) {
      await Deno.stdout.write(encoder.encode('\x1b[1A\x1b[2K'));
    }

    const countdown = i > 0
      ? `Starting in ${orange(String(i))} seconds...`
      : `${orange('Starting now!')}`;
    console.log(countdown);

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log();
}

/**
 * Commands that require user interaction.
 * After these complete in vibe mode, we show the "grab a beer" message.
 */
const INTERACTIVE_COMMANDS = ['init', 'start', 'spec', 'research'];

// ============================================================================
// Vibe Loop UI Messages
// ============================================================================

/**
 * Shows the transition between SLC releases in vibe loop mode.
 * Now includes cumulative metrics summary.
 */
export function showVibeLoopTransition(
  _currentIteration: number,
  maxIterations: number,
): void {
  // Increment the SLC cycle count
  incrementSlcCycle();

  console.log();
  console.log(`${orange('🔄')} ${bold('SLC Cycle Complete')}`);
  console.log();
  console.log(
    `${dim('Cycle:')} ${amber(String(vibeSessionMetrics.totalSlcCycles))} of ${maxIterations}`,
  );

  // Show cumulative metrics so far
  showCumulativeMetrics();

  console.log(dim('Starting next cycle: plan → work'));
  console.log();

  // Reset phase to learn for next cycle
  currentSlcPhase = 'learn';
}

/**
 * Shows message when max SLC iterations reached.
 * Now includes rich completion summary.
 */
export function showMaxSlcReached(maxIterations: number): void {
  console.log();
  console.log(`${amber('⚠')} ${bold('Max SLC Iterations Reached')}`);
  console.log();
  console.log(`Completed ${amber(String(maxIterations))} plan → work cycles.`);
  console.log();

  // Show full completion summary
  showVibeCompletionSummary(vibeSessionMetrics.totalIterations);

  console.log(dim('The work may need human review to determine next steps.'));
  console.log(dim('You can run `ralph work --vibe` again to continue.'));
  console.log();
}

/**
 * Shows success message when all SLCs are complete.
 * Now includes rich completion summary.
 */
export function showAllSlcsComplete(totalIterations: number): void {
  // Increment cycle if this is a successful completion
  if (vibeSessionMetrics.totalSlcCycles === 0) {
    incrementSlcCycle();
  }

  // Show rich completion summary
  showVibeCompletionSummary(
    totalIterations > 0 ? totalIterations : vibeSessionMetrics.totalIterations,
  );

  console.log(dim('All specs have been fully implemented.'));
  console.log(dim('Your project is ready for review!'));
  console.log();
}

// ============================================================================
// Flow Execution
// ============================================================================

/**
 * The command flow order.
 * Flow: init → start → research → plan → work
 */
const FLOW_ORDER = ['init', 'start', 'research', 'plan', 'work'] as const;

type FlowCommand = typeof FLOW_ORDER[number];

/**
 * Gets the next commands in the flow after a given command.
 */
export function getNextCommands(currentCommand: string): string[] {
  // Special case: 'spec' flows into 'research' then 'plan' then 'work'
  if (currentCommand === 'spec') {
    return ['research', 'plan', 'work'];
  }

  const idx = FLOW_ORDER.indexOf(currentCommand as FlowCommand);
  if (idx === -1 || idx === FLOW_ORDER.length - 1) {
    return [];
  }

  return FLOW_ORDER.slice(idx + 1) as string[];
}

/**
 * Runs the next command in the flow.
 * Returns true if successful, false otherwise.
 */
export async function runNextCommand(command: string): Promise<boolean> {
  const cmd = new Deno.Command('ralph', {
    args: [command],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const process = cmd.spawn();
  const status = await process.status;
  return status.success;
}

/**
 * Runs a command with additional environment variables.
 * Used for vibe loop to pass state to child processes.
 */
export async function runNextCommandWithEnv(
  command: string,
  extraEnv: Record<string, string>,
): Promise<boolean> {
  // Merge current env with extra env
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(Deno.env.toObject())) {
    env[key] = value;
  }
  for (const [key, value] of Object.entries(extraEnv)) {
    env[key] = value;
  }

  const cmd = new Deno.Command('ralph', {
    args: [command],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });

  const process = cmd.spawn();
  const status = await process.status;
  return status.success;
}

/**
 * Runs a command with additional arguments and environment variables.
 * Used for vibe loop to pass flags (like --task-slc) to child processes.
 */
export async function runNextCommandWithArgs(
  command: string,
  args: string[],
  extraEnv: Record<string, string>,
): Promise<boolean> {
  // Merge current env with extra env
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(Deno.env.toObject())) {
    env[key] = value;
  }
  for (const [key, value] of Object.entries(extraEnv)) {
    env[key] = value;
  }

  const cmd = new Deno.Command('ralph', {
    args: [command, ...args],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });

  const process = cmd.spawn();
  const status = await process.status;
  return status.success;
}

/**
 * Continues the vibe loop with the next SLC cycle (research → plan → work).
 * Called when work completes but SLC_COMPLETE is false.
 */
export async function continueVibeSlcLoop(
  currentState: VibeLoopState,
): Promise<void> {
  const nextIteration = currentState.slcIteration + 1;

  // Check if we've hit the max
  if (nextIteration > currentState.maxSlcIterations) {
    showMaxSlcReached(currentState.maxSlcIterations);
    return;
  }

  // Show transition message
  showVibeLoopTransition(nextIteration, currentState.maxSlcIterations);

  // Create env for next cycle - preserve taskSlcMode
  const nextEnv = setVibeLoopEnv({
    slcIteration: nextIteration,
    maxSlcIterations: currentState.maxSlcIterations,
    taskSlcMode: currentState.taskSlcMode,
  });

  // Run plan → work sequence (research is one-time, not part of the loop)
  const commands = ['plan', 'work'];

  for (const command of commands) {
    showVibeTransition(
      command === 'plan' ? 'work' : commands[commands.indexOf(command) - 1] ?? 'work',
      command,
    );

    // Add --task-slc flag when running work command if taskSlcMode is enabled
    const success = command === 'work' && currentState.taskSlcMode
      ? await runNextCommandWithArgs(command, ['--task-slc'], nextEnv)
      : await runNextCommandWithEnv(command, nextEnv);

    if (!success) {
      Deno.exit(1);
    }
  }
}

/**
 * Continues the vibe flow from the current command.
 * Call this at the end of each command when vibe mode is active.
 */
export async function continueVibeFlow(currentCommand: string): Promise<void> {
  if (!vibeMode) return;

  const nextCommands = getNextCommands(currentCommand);
  if (nextCommands.length === 0) return;

  // Show "grab a beer" message after interactive commands
  // This is the last time we need user attention before going fully autonomous
  if (INTERACTIVE_COMMANDS.includes(currentCommand)) {
    await showAutonomousStarting();
  }

  for (const nextCmd of nextCommands) {
    showVibeTransition(currentCommand, nextCmd);

    const success = await runNextCommand(nextCmd);
    if (!success) {
      Deno.exit(1);
    }

    currentCommand = nextCmd;
  }
}
