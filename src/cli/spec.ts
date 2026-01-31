/**
 * @module cli/spec
 *
 * The `ralph spec` command.
 * Launches an interactive interview to add new feature specs to an existing project.
 *
 * NOTE: This command uses plain console output instead of Ink because it launches
 * an interactive Claude session that requires stdin/stdout access.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { error, muted, success, dim, orange } from '@/ui/colors.ts';
import { CROSS, CHECK, BULLET } from '@/ui/symbols.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { readTextFile } from '@/services/file_service.ts';
import { resolvePaths, type ResolvedPaths } from '@/services/path_resolver.ts';
import { RALPH_DONE_MARKER } from '@/core/constants.ts';
import { getSubscriptionUsage, type SubscriptionUsage } from '@/services/usage_service.ts';
import { errorBox } from '@/ui/components.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
  showVibeActivated,
} from './vibe.ts';

// ============================================================================
// Prompt Reading
// ============================================================================

/**
 * Reads the spec prompt from the project's configured spec prompt file.
 * If a feature hint is provided, it's prepended to help start the interview.
 */
async function readSpecPrompt(paths: ResolvedPaths, featureHint?: string): Promise<string | null> {
  const result = await readTextFile(paths.specPrompt);
  if (!result.ok) {
    return null;
  }

  let prompt = result.value;

  // If a feature hint is provided, prepend it to the prompt
  if (featureHint) {
    prompt = `The user wants to add a new activity: "${featureHint}"\n\n${prompt}`;
  }

  return prompt;
}

// ============================================================================
// Command
// ============================================================================

interface SpecOptions {
  readonly feature?: string;
  readonly vibe?: boolean;
}

// ============================================================================
// Simple Console Output (no Ink - for interactive Claude session)
// ============================================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function printHeader(featureHint?: string, usage?: SubscriptionUsage): void {
  console.log('');
  console.log(`${orange(BULLET)} ${orange('Ralph Spec')} ${dim('· Add new feature specifications')}`);

  if (usage) {
    const fiveHr = usage.fiveHour.utilization.toFixed(1);
    const sevenDay = usage.sevenDay.utilization.toFixed(1);
    console.log(dim(`  5h: ${fiveHr}% · 7d: ${sevenDay}%`));
  }

  if (featureHint) {
    console.log('');
    console.log(`${orange('Feature:')} ${featureHint}`);
  }

  console.log('');
  console.log(dim('Starting Claude interview...'));
  console.log(dim('─'.repeat(50)));
  console.log('');
}

function printSummary(options: {
  successResult: boolean;
  durationSec: number;
  usageDelta?: number;
  outputPath?: string;
  nextCommand?: string;
}): void {
  console.log('');
  console.log(dim('─'.repeat(50)));
  console.log('');

  if (options.successResult) {
    console.log(`${success(CHECK)} ${success('Spec created!')}`);
  } else {
    console.log(`${error(CROSS)} ${error('Interview failed')}`);
  }

  // Stats
  const stats = [formatDuration(options.durationSec)];
  if (options.usageDelta !== undefined && options.usageDelta > 0) {
    stats.push(`+${options.usageDelta.toFixed(1)}% usage`);
  }
  console.log(dim(stats.join(' · ')));

  // Output path
  if (options.outputPath) {
    console.log('');
    console.log(`${dim('→')} ${orange(options.outputPath)}`);
  }

  // Next command
  if (options.nextCommand) {
    console.log('');
    console.log(`Next: ${orange(options.nextCommand)}`);
  }

  console.log('');
}

/**
 * The spec command action.
 * NOTE: Uses plain console output because this launches an interactive Claude session.
 */
async function specAction(options: SpecOptions): Promise<void> {
  // Handle vibe mode
  if (options.vibe) {
    enableVibeMode();
    const nextSteps = getNextCommands('spec');
    showVibeActivated([
      'Add new feature spec via interview',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'plan':
            return 'Generate implementation plan';
          case 'work':
            return 'Run autonomous build loop';
          default:
            return cmd;
        }
      }),
    ]);
  }

  // Resolve paths from config (finds nearest .ralph.json)
  let paths: ResolvedPaths;
  try {
    paths = await resolvePaths();
  } catch {
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

  // Get the spec interview prompt from project file
  const prompt = await readSpecPrompt(paths, options.feature);

  if (!prompt) {
    console.log(errorBox({
      title: 'Spec prompt file not found',
      description: `Expected: ${paths.specPrompt}\nRun \`ralph init\` to create the prompt file.`,
    }));
    Deno.exit(1);
  }

  // Fetch subscription usage
  const initialUsage = await getSubscriptionUsage();
  const usage = initialUsage.ok ? initialUsage.value : undefined;

  // Print header (plain console - no Ink)
  printHeader(options.feature, usage);

  const startTime = Date.now();

  // Marker file path - use absolute path in current working directory
  const markerPath = `${Deno.cwd()}/${RALPH_DONE_MARKER}`;

  // Clean up any existing marker file
  try {
    await Deno.remove(markerPath);
  } catch {
    // File doesn't exist, that's fine
  }

  // Launch Claude interactively with the prompt
  // NOTE: No Ink rendering here - Claude gets full terminal control
  const command = new Deno.Command('claude', {
    args: ['--dangerously-skip-permissions', prompt],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const process = command.spawn();

  // Watch for the marker file in the background
  let markerFound = false;
  let killedByUs = false;

  const watchForMarker = async () => {
    while (!markerFound) {
      try {
        await Deno.stat(markerPath);
        // Marker file exists - Claude is done
        markerFound = true;
        // Give a moment for Claude to finish output, then kill it
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          killedByUs = true;
          process.kill('SIGTERM');
        } catch {
          // Process may have already exited
        }
        // Clean up the marker file
        try {
          await Deno.remove(markerPath);
        } catch {
          // Ignore cleanup errors
        }
        break;
      } catch {
        // File doesn't exist yet, keep waiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

  // Start watching and wait for process to complete
  const watchPromise = watchForMarker();
  const status = await process.status;
  markerFound = true; // Stop the watcher if process exited naturally

  // Wait for watcher to finish
  await watchPromise;

  // If we killed Claude ourselves after marker was found, treat as success
  const succeeded = status.success || killedByUs;

  // Get final usage
  const finalUsage = await getSubscriptionUsage();
  const durationSec = Math.floor((Date.now() - startTime) / 1000);

  // Calculate usage delta
  let usageDelta: number | undefined;
  if (initialUsage.ok && finalUsage.ok) {
    usageDelta = finalUsage.value.fiveHour.utilization - initialUsage.value.fiveHour.utilization;
  }

  // Print summary (plain console - no Ink)
  printSummary({
    successResult: succeeded,
    durationSec,
    usageDelta,
    outputPath: succeeded ? 'specs/' : undefined,
    nextCommand: isVibeMode() ? undefined : (succeeded ? 'ralph plan' : undefined),
  });

  // Continue vibe flow if active and successful
  if (succeeded) {
    if (isVibeMode()) {
      await continueVibeFlow('spec');
    } else {
      Deno.exit(0);
    }
  } else {
    Deno.exit(1);
  }
}

/**
 * Creates the spec command.
 */
// deno-lint-ignore no-explicit-any
export function createSpecCommand(): Command<any> {
  return new Command()
    .description('Add a new feature spec via interview')
    .option('-f, --feature <description:string>', 'Feature hint to start the interview')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .action(specAction);
}
