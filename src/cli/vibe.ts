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
 */

import { amber, bold, cyan, dim, muted, orange, success as successColor } from '@/ui/colors.ts';
import { CHECK, BULLET } from '@/ui/symbols.ts';
import { DEFAULT_WORK } from '@/core/config.ts';

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
// Vibe State
// ============================================================================

let vibeMode = false;

/**
 * Enables vibe mode (autonomous continuation).
 */
export function enableVibeMode(): void {
  vibeMode = true;
}

/**
 * Checks if vibe mode is enabled.
 */
export function isVibeMode(): boolean {
  return vibeMode;
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
} as const;

/**
 * State for the vibe loop (research → plan → work cycles).
 */
export interface VibeLoopState {
  readonly slcIteration: number;
  readonly maxSlcIterations: number;
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

  return {
    slcIteration: iteration,
    maxSlcIterations: maxIterations,
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
  };
}

/**
 * Initializes vibe loop environment for the first iteration.
 * Call this when starting work with --vibe flag.
 */
export function initializeVibeLoop(maxSlcIterations: number): Record<string, string> {
  return setVibeLoopEnv({
    slcIteration: 1,
    maxSlcIterations,
  });
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
    console.log(dim('   Make sure you have a beer ready for when we\'re done here!'));
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
 */
export function showVibeTransition(fromCommand: string, toCommand: string): void {
  console.log();
  console.log(`${dim('─'.repeat(40))}`);
  console.log(`${dim('Vibe:')} ${muted(fromCommand)} ${dim('→')} ${orange(toCommand)}`);
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
  const msg = selectedMsg
    ? selectedMsg
    : {
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

    const countdown = i > 0 ? `Starting in ${orange(String(i))} seconds...` : `${orange('Starting now!')}`;
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
 */
export function showVibeLoopTransition(
  currentIteration: number,
  maxIterations: number,
): void {
  console.log();
  console.log(`${orange('🔄')} ${bold('SLC Cycle Complete')}`);
  console.log();
  console.log(`${dim('Iteration:')} ${amber(String(currentIteration))} of ${maxIterations}`);
  console.log();
  console.log(dim('Starting next cycle: research → plan → work'));
  console.log();
}

/**
 * Shows message when max SLC iterations reached.
 */
export function showMaxSlcReached(maxIterations: number): void {
  console.log();
  console.log(`${amber('⚠')} ${bold('Max SLC Iterations Reached')}`);
  console.log();
  console.log(`Completed ${amber(String(maxIterations))} research → plan → work cycles.`);
  console.log();
  console.log(dim('The work may need human review to determine next steps.'));
  console.log(dim('You can run `ralph work --vibe` again to continue.'));
  console.log();
}

/**
 * Shows success message when all SLCs are complete.
 */
export function showAllSlcsComplete(totalIterations: number): void {
  console.log();
  console.log(`${successColor(CHECK)} ${bold(orange('All SLCs Complete!'))} 🎉`);
  console.log();
  console.log(`Finished in ${cyan(String(totalIterations))} SLC cycle${totalIterations > 1 ? 's' : ''}.`);
  console.log();
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

  // Create env for next cycle
  const nextEnv = setVibeLoopEnv({
    slcIteration: nextIteration,
    maxSlcIterations: currentState.maxSlcIterations,
  });

  // Run research → plan → work sequence
  const commands = ['research', 'plan', 'work'];

  for (const command of commands) {
    showVibeTransition(command === 'research' ? 'work' : commands[commands.indexOf(command) - 1] ?? 'work', command);

    const success = await runNextCommandWithEnv(command, nextEnv);
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
