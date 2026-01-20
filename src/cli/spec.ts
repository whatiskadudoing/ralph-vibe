/**
 * @module cli/spec
 *
 * The `ralph spec` command.
 * Launches an interactive interview to add new feature specs to an existing project.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, bold, dim, error, muted, orange } from '@/ui/colors.ts';
import { CHECK, CROSS } from '@/ui/symbols.ts';
import { isRalphProject } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { getSpecPromptPath, readTextFile } from '@/services/file_service.ts';
import { RALPH_DONE_MARKER } from '@/core/constants.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import { commandHeader, errorBox } from '@/ui/components.ts';
import { createBox } from '@/ui/box.ts';
import { getTerminalWidth } from '@/ui/claude_renderer.ts';
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
 * Reads the spec prompt from the project's PROMPT_spec.md file.
 * If a feature hint is provided, it's prepended to help start the interview.
 */
async function readSpecPrompt(featureHint?: string): Promise<string | null> {
  const promptPath = getSpecPromptPath();
  const result = await readTextFile(promptPath);
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

/**
 * The spec command action.
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

  // Show header
  console.log();
  console.log(commandHeader({
    name: 'Ralph Spec',
    description: 'Add new feature specifications',
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Show progress box
  const termWidth = getTerminalWidth();
  const featureHint = options.feature
    ? `Feature: ${options.feature}`
    : 'Describe your new feature through a quick interview';

  const progressLines = [
    `${orange('◆')} ${bold('Spec Interview')}`,
    '',
    dim(featureHint),
    '',
    `${dim('Steps:')}`,
    `  ${amber('1.')} Read existing specs for context`,
    `  ${amber('2.')} Interview you about the feature`,
    `  ${amber('3.')} Write spec to specs/ directory`,
  ];

  console.log(createBox(progressLines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  }));
  console.log();

  // Get the spec interview prompt from project file
  const prompt = await readSpecPrompt(options.feature);

  if (!prompt) {
    console.log(errorBox({
      title: 'PROMPT_spec.md not found',
      description: 'Run `ralph init` to create the prompt file.',
    }));
    Deno.exit(1);
  }

  // Marker file path - use absolute path in current working directory
  const markerPath = `${Deno.cwd()}/${RALPH_DONE_MARKER}`;

  // Clean up any existing marker file
  try {
    await Deno.remove(markerPath);
  } catch {
    // File doesn't exist, that's fine
  }

  // Launch Claude interactively with the prompt
  // Keep stdout: inherit for full interactivity
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
  const success = status.success || killedByUs;

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
      `${orange('◆')} ${bold('Spec Created!')} ${CHECK}`,
      '',
      `${dim('→')} New spec file added to ${amber('specs/')}`,
    ];

    if (usageInfo) {
      summaryLines.push(`${dim('→')} ${usageInfo}`);
    }

    if (!isVibeMode()) {
      summaryLines.push('');
      summaryLines.push(`${bold('Next steps:')}`);
      summaryLines.push(`  ${orange('▸')} Review the spec in ${amber('specs/')}`);
      summaryLines.push(`  ${orange('▸')} Run ${amber('ralph plan')} to update implementation plan`);
      summaryLines.push(`  ${orange('▸')} Run ${amber('ralph work')} to start building`);
    }

    console.log(createBox(summaryLines.join('\n'), {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
      borderColor: orange,
      minWidth: termWidth - 6,
    }));

    // Continue vibe flow if active
    await continueVibeFlow('spec');
  } else {
    console.log(errorBox({
      title: 'Interview failed',
      description: 'Check the error above and try again.',
    }));
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
