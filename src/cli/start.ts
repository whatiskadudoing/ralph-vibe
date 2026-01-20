/**
 * @module cli/start
 *
 * The `ralph start` command.
 * Launches an interactive interview to help users create their first specs.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, bold, dim, error, muted, orange } from '@/ui/colors.ts';
import { CHECK, CROSS } from '@/ui/symbols.ts';
import { isRalphProject } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { renderAudiencePrompt, renderStartPrompt } from '@/core/templates.ts';
import { RALPH_DONE_MARKER } from '@/core/constants.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import { commandHeader, errorBox } from '@/ui/components.ts';
import { createBox } from '@/ui/box.ts';
import { getTerminalWidth } from '@/ui/claude_renderer.ts';
import { exists, getAudienceJtbdPath, readTextFile } from '@/services/file_service.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
  showVibeActivated,
} from './vibe.ts';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Checks if AUDIENCE_JTBD.md has been populated (not just the template).
 * Returns true if audience discovery has been done.
 */
async function hasAudienceDiscovery(): Promise<boolean> {
  const audiencePath = getAudienceJtbdPath();

  if (!(await exists(audiencePath))) {
    return false;
  }

  const result = await readTextFile(audiencePath);
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
async function startAction(options: StartOptions): Promise<void> {
  // Handle vibe mode
  if (options.vibe) {
    enableVibeMode();
    const nextSteps = getNextCommands('start');
    showVibeActivated([
      'Create feature specs via interview',
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

  // Fetch subscription usage
  const initialUsage = await getSubscriptionUsage();
  const termWidth = getTerminalWidth();

  // Check if audience discovery is needed
  const hasAudience = options.skipAudience || (await hasAudienceDiscovery());

  if (!hasAudience) {
    // Show header for audience interview
    console.log();
    console.log(commandHeader({
      name: 'Ralph Start',
      description: 'Step 1: Discover your audience & jobs-to-be-done',
      usage: initialUsage.ok ? initialUsage.value : undefined,
    }));
    console.log();

    // Show progress box for audience interview
    const audienceProgressLines = [
      `${orange('◆')} ${bold('Audience & JTBD Interview')} ${dim('[1/2]')}`,
      '',
      dim('First, let\'s understand WHO you\'re building for and WHAT they need'),
      '',
      `${dim('Steps:')}`,
      `  ${amber('1.')} Discover your primary audience`,
      `  ${amber('2.')} Identify their jobs-to-be-done (outcomes)`,
      `  ${amber('3.')} Map activities to those jobs`,
    ];

    console.log(createBox(audienceProgressLines.join('\n'), {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: orange,
      minWidth: termWidth - 6,
    }));
    console.log();

    // Run audience interview
    const audiencePrompt = renderAudiencePrompt();
    const audienceSuccess = await runInteractiveSession(audiencePrompt);

    if (!audienceSuccess) {
      console.log(errorBox({
        title: 'Audience interview failed',
        description: 'Check the error above and try again.',
      }));
      Deno.exit(1);
    }

    console.log();

    // Show transition message
    const transitionLines = [
      `${orange('◆')} ${bold('Audience Documented!')} ${CHECK}`,
      '',
      `${dim('→')} AUDIENCE_JTBD.md created`,
      '',
      `${dim('Now let\'s create activity specs based on those jobs...')}`,
    ];

    console.log(createBox(transitionLines.join('\n'), {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: orange,
      minWidth: termWidth - 6,
    }));
    console.log();
  }

  // Show header for spec interview
  console.log();
  console.log(commandHeader({
    name: 'Ralph Start',
    description: hasAudience ? 'Create your feature specifications' : 'Step 2: Create activity specifications',
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Show progress box for spec interview
  const progressLines = [
    `${orange('◆')} ${bold('Activity Spec Interview')}${hasAudience ? '' : ` ${dim('[2/2]')}`}`,
    '',
    dim('Now let\'s define the activities (features) users will do'),
    '',
    `${dim('Steps:')}`,
    `  ${amber('1.')} Interview you about each activity`,
    `  ${amber('2.')} Link activities to jobs-to-be-done`,
    `  ${amber('3.')} Write spec files to specs/ directory`,
  ];

  console.log(createBox(progressLines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  }));
  console.log();

  // Get the start prompt and run spec interview
  const prompt = renderStartPrompt();
  const success = await runInteractiveSession(prompt);

  console.log();

  // Get final usage
  const finalUsage = await getSubscriptionUsage();

  if (success) {
    // Calculate usage delta
    let usageInfo: string | undefined;
    let usageDelta: number | undefined;

    if (initialUsage.ok && finalUsage.ok) {
      usageDelta = finalUsage.value.fiveHour.utilization - initialUsage.value.fiveHour.utilization;
      usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
      if (usageDelta > 0) {
        usageInfo += ` ${amber(`(+${usageDelta.toFixed(1)}%)`)}`;
      }
    } else if (finalUsage.ok) {
      usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
    }

    // Show completion summary
    const summaryLines = [
      `${orange('◆')} ${bold('Specs Created!')} ${CHECK}`,
      '',
      `${dim('→')} Your specifications are in ${amber('specs/')}`,
    ];

    if (usageInfo) {
      summaryLines.push(`${dim('→')} ${usageInfo}`);
    }

    if (!isVibeMode()) {
      summaryLines.push('');
      summaryLines.push(`${bold('Next steps:')}`);
      summaryLines.push(`  ${orange('▸')} Review and refine specs in ${amber('specs/')}`);
      summaryLines.push(`  ${orange('▸')} Run ${amber('ralph plan')} to generate implementation plan`);
      summaryLines.push(`  ${orange('▸')} Run ${amber('ralph work')} to start autonomous building`);
    }

    console.log(createBox(summaryLines.join('\n'), {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: orange,
      minWidth: termWidth - 6,
    }));

    // Continue vibe flow if active
    await continueVibeFlow('start');
  } else {
    console.log(errorBox({
      title: 'Interview failed',
      description: 'Check the error above and try again.',
    }));
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
