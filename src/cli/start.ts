/**
 * @module cli/start
 *
 * The `ralph start` command.
 * Launches an interactive interview to help users create their first specs.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { error, muted } from '@/ui/colors.ts';
import { CROSS } from '@/ui/symbols.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { RALPH_DONE_MARKER } from '@/core/constants.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import { exists, readTextFile } from '@/services/file_service.ts';
import { resolvePaths, type ResolvedPaths } from '@/services/path_resolver.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  isVibeMode,
} from './vibe.ts';
import {
  renderStartOptions,
  printAudienceInterviewHeader,
  printAudienceCompleted,
  printSpecsInterviewHeader,
  printCompletionSummary,
  printError,
} from '@/components/StartScreen.tsx';

// ============================================================================
// Prompt Reading
// ============================================================================

/**
 * Reads the audience prompt from the project's configured audience prompt file.
 */
async function readAudiencePrompt(paths: ResolvedPaths): Promise<string | null> {
  const result = await readTextFile(paths.audiencePrompt);
  if (!result.ok) {
    return null;
  }
  return result.value;
}

/**
 * Reads the start prompt from the project's configured start prompt file.
 */
async function readStartPrompt(paths: ResolvedPaths): Promise<string | null> {
  const result = await readTextFile(paths.startPrompt);
  if (!result.ok) {
    return null;
  }
  return result.value;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Checks if AUDIENCE_JTBD.md has been populated (not just the template).
 * Returns true if audience discovery has been done.
 */
async function hasAudienceDiscovery(paths: ResolvedPaths): Promise<boolean> {
  if (!(await exists(paths.audienceJtbd))) {
    return false;
  }

  const result = await readTextFile(paths.audienceJtbd);
  if (!result.ok) {
    return false;
  }

  // Check if it's still the template (contains "To be discovered")
  const content = result.value;
  return !content.includes('(To be discovered)') && !content.includes('(TBD)');
}

/**
 * Runs an interactive Claude session with a prompt.
 * Returns success status.
 */
async function runInteractiveSession(prompt: string): Promise<boolean> {
  // Marker file path - use absolute path in current working directory
  const markerPath = `${Deno.cwd()}/${RALPH_DONE_MARKER}`;

  // Clean up any existing marker file
  try {
    await Deno.remove(markerPath);
  } catch {
    // File doesn't exist, that's fine
  }

  // Launch Claude interactively with the prompt
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
  return status.success || killedByUs;
}

// ============================================================================
// Command
// ============================================================================

interface StartOptions {
  readonly vibe?: boolean;
  readonly skipAudience?: boolean;
}

/**
 * The start command action.
 */
async function startAction(cliOptions: StartOptions): Promise<void> {
  // Resolve paths from config (finds nearest .ralph.json)
  let paths;
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

  // Check if audience discovery is already done
  const hasAudienceAlready = await hasAudienceDiscovery(paths);

  // If CLI flags are provided, use them directly; otherwise show options UI
  let vibeMode = cliOptions.vibe ?? false;
  let skipAudience = cliOptions.skipAudience ?? false;

  // Show options UI if no CLI flags provided
  if (!cliOptions.vibe && !cliOptions.skipAudience) {
    const { options } = await renderStartOptions(hasAudienceAlready);
    if (options) {
      vibeMode = options.vibeMode;
      skipAudience = options.skipAudience;
    }
  }

  // Enable vibe mode if selected
  if (vibeMode) {
    enableVibeMode();
  }

  // Fetch subscription usage
  const initialUsage = await getSubscriptionUsage();

  // Check if audience discovery is needed
  const needsAudience = !skipAudience && !hasAudienceAlready;

  if (needsAudience) {
    // Show header for audience interview
    printAudienceInterviewHeader();

    // Run audience interview - read prompt from project file
    const audiencePrompt = await readAudiencePrompt(paths);
    if (!audiencePrompt) {
      printError(
        'Audience prompt file not found',
        `Expected: ${paths.audiencePrompt}\nRun \`ralph init\` to create the prompt file.`
      );
      Deno.exit(1);
    }
    const audienceSuccess = await runInteractiveSession(audiencePrompt);

    if (!audienceSuccess) {
      printError('Audience interview failed', 'Check the error above and try again.');
      Deno.exit(1);
    }

    // Show transition message
    printAudienceCompleted();
  }

  // Show header for spec interview
  printSpecsInterviewHeader(needsAudience);

  // Get the start prompt from project file and run spec interview
  const prompt = await readStartPrompt(paths);
  if (!prompt) {
    printError(
      'Start prompt file not found',
      `Expected: ${paths.startPrompt}\nRun \`ralph init\` to create the prompt file.`
    );
    Deno.exit(1);
  }
  const success = await runInteractiveSession(prompt);

  if (success) {
    // Get final usage and calculate delta
    const finalUsage = await getSubscriptionUsage();
    let usageInfo: string | undefined;

    if (initialUsage.ok && finalUsage.ok) {
      const usageDelta = finalUsage.value.fiveHour.utilization - initialUsage.value.fiveHour.utilization;
      usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
      if (usageDelta > 0) {
        usageInfo += ` (+${usageDelta.toFixed(1)}%)`;
      }
    } else if (finalUsage.ok) {
      usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
    }

    // Show completion summary
    printCompletionSummary(usageInfo, isVibeMode());

    // Continue vibe flow if active
    await continueVibeFlow('start');

    Deno.exit(0);
  } else {
    printError('Interview failed', 'Check the error above and try again.');
    Deno.exit(1);
  }
}

/**
 * Creates the start command.
 */
// deno-lint-ignore no-explicit-any
export function createStartCommand(): Command<any> {
  return new Command()
    .description('Start an interactive interview to create your first specs')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .option('--skip-audience', 'Skip audience interview (jump to specs)')
    .action(startAction);
}
