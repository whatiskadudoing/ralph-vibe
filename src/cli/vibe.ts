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

import { amber, bold, dim, muted, orange, white } from '@/ui/colors.ts';
import { createBox } from '@/ui/box.ts';
import { getTerminalWidth } from '@/ui/claude_renderer.ts';

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
  const termWidth = getTerminalWidth();

  // Check if first step is interactive
  const hasInteractiveStep = nextSteps.length > 0 &&
    (nextSteps[0]?.includes('interview') || nextSteps[0]?.includes('spec'));

  const interactiveNote = hasInteractiveStep
    ? [
      '',
      dim("🎤 I'll ask you a few questions first, then go fully autonomous."),
      dim('   Make sure you have a beer ready for when we\'re done here!'),
    ]
    : [];

  const lines = [
    `${orange('◆')} ${bold('Vibe Mode Activated')} 🍺`,
    '',
    dim(getVibeMessage()),
    ...interactiveNote,
    '',
    `${dim('Upcoming:')}`,
    ...nextSteps.map((step, i) => `  ${amber(`${i + 1}.`)} ${step}`),
  ];

  console.log();
  console.log(createBox(lines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  }));
  console.log();
}

/**
 * Shows a transition message between commands in vibe mode.
 */
export function showVibeTransition(fromCommand: string, toCommand: string): void {
  const termWidth = getTerminalWidth();
  console.log();
  console.log(createBox(
    `${dim('Vibe mode:')} ${muted(fromCommand)} ${dim('→')} ${orange(toCommand)}`,
    { style: 'rounded', padding: 1, paddingY: 0, borderColor: dim, minWidth: termWidth - 6 },
  ));
  console.log();
}

/**
 * Shows the "autonomous mode starting" box with a countdown.
 * This appears after interactive commands (start, spec) complete.
 */
async function showAutonomousStarting(): Promise<void> {
  const termWidth = getTerminalWidth();
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

  // Show the box with countdown
  for (let i = countdownSeconds; i >= 0; i--) {
    // Clear previous output (move cursor up and clear)
    if (i < countdownSeconds) {
      // Move up enough lines to clear the box (estimate ~12 lines)
      await Deno.stdout.write(encoder.encode('\x1b[12A\x1b[J'));
    }

    const countdown = i > 0 ? `Starting in ${orange(String(i))} seconds...` : `${orange('Starting now!')}`;

    const lines = [
      `${msg.emoji}  ${bold(orange(msg.title))}`,
      '',
      white(msg.message),
      '',
      dim('─'.repeat(Math.min(50, termWidth - 10))),
      '',
      countdown,
    ];

    console.log();
    console.log(createBox(lines.join('\n'), {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: orange,
      minWidth: termWidth - 6,
    }));

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
const INTERACTIVE_COMMANDS = ['init', 'start', 'spec'];

// ============================================================================
// Flow Execution
// ============================================================================

/**
 * The command flow order.
 */
const FLOW_ORDER = ['init', 'start', 'plan', 'work'] as const;

type FlowCommand = typeof FLOW_ORDER[number];

/**
 * Gets the next commands in the flow after a given command.
 */
export function getNextCommands(currentCommand: string): string[] {
  // Special case: 'spec' flows into 'plan' then 'work'
  if (currentCommand === 'spec') {
    return ['plan', 'work'];
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
