/**
 * @module cli/onboard
 *
 * The `ralph onboard` command.
 * Analyzes an existing codebase and creates Ralph files with discovered patterns.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, bold, dim, error, muted, orange } from '@/ui/colors.ts';
import { CROSS } from '@/ui/symbols.ts';
import { isRalphProject } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { renderOnboardAnalysisPrompt, renderOnboardSynthesisPrompt } from '@/core/templates.ts';
import { getTerminalWidth, runAndRender } from '@/ui/claude_renderer.ts';
import { createBox } from '@/ui/box.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  commandHeader,
  completionBox,
  errorBox,
  infoBox,
  statusBox,
  successBox,
} from '@/ui/components.ts';
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
 * Checks if there's existing source code in the directory.
 * Looks for common source directories or language-specific files.
 */
export async function hasExistingCode(cwd?: string): Promise<boolean> {
  const baseDir = cwd ?? Deno.cwd();

  // Common source directories
  const sourceDirs = ['src', 'lib', 'app', 'packages', 'source'];

  for (const dir of sourceDirs) {
    try {
      const stat = await Deno.stat(`${baseDir}/${dir}`);
      if (stat.isDirectory) {
        return true;
      }
    } catch {
      // Directory doesn't exist
    }
  }

  // Language-specific project files (indicates a real project)
  const projectFiles = [
    'package.json',
    'Cargo.toml',
    'deno.json',
    'deno.jsonc',
    'go.mod',
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'Makefile',
    'CMakeLists.txt',
  ];

  for (const file of projectFiles) {
    try {
      const stat = await Deno.stat(`${baseDir}/${file}`);
      if (stat.isFile) {
        return true;
      }
    } catch {
      // File doesn't exist
    }
  }

  return false;
}

// ============================================================================
// Onboard Command
// ============================================================================

interface OnboardOptions {
  readonly force?: boolean;
  readonly vibe?: boolean;
}

/**
 * The onboard command action.
 */
export async function onboardAction(options: OnboardOptions): Promise<void> {
  // Handle vibe mode
  if (options.vibe) {
    enableVibeMode();
    const nextSteps = getNextCommands('onboard');
    showVibeActivated([
      'Analyze project and create Ralph files',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'spec':
            return 'Add new feature spec';
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

  // Check if already initialized (unless force)
  if (!options.force && (await isRalphProject())) {
    console.log();
    console.log(infoBox({
      title: 'Already initialized',
      description:
        'Ralph project already exists.\n\nUse --force to reinitialize with fresh analysis.',
    }));
    Deno.exit(1);
  }

  // Check Claude CLI
  if (!(await isClaudeInstalled())) {
    console.log(error(`${CROSS} Claude CLI not found.`));
    console.log(muted('  Install from: https://docs.anthropic.com/claude-code'));
    Deno.exit(1);
  }

  // Check for existing code
  if (!(await hasExistingCode())) {
    console.log();
    console.log(infoBox({
      title: 'No source code detected',
      description:
        "This directory doesn't appear to have existing code.\n\nFor new projects, use ralph init instead.",
    }));
    Deno.exit(1);
  }

  // Fetch initial subscription usage
  const initialUsage = await getSubscriptionUsage();
  const beforeVal = initialUsage.ok ? initialUsage.value.fiveHour.utilization : null;

  // Show header
  console.log();
  console.log(commandHeader({
    name: 'Ralph Onboard',
    description: 'Analyze project and create Ralph files',
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Show progress box
  const termWidth = getTerminalWidth();
  const progressLines = [
    `${orange('◆')} ${bold('Project Onboarding')}`,
    '',
    dim('Analyzing your codebase to discover patterns and conventions'),
    '',
    `${dim('Steps:')}`,
    `  ${amber('1.')} Comprehensive codebase analysis`,
    `  ${amber('2.')} Generate Ralph files with discovered patterns`,
  ];

  console.log(createBox(progressLines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  }));
  console.log();

  // Stage 1: Analysis with Sonnet
  console.log(statusBox({
    label: '[1/2]',
    title: 'Analyzing Codebase',
    description: 'Reading docs, architecture, patterns, and conventions',
    active: true,
  }));
  console.log();

  const analysisResult = await runAndRender(
    {
      prompt: renderOnboardAnalysisPrompt(),
      model: 'sonnet',
      skipPermissions: true,
    },
    {
      showSpinner: true,
      showTools: true,
      showStats: false,
    },
  );

  if (!analysisResult.success) {
    console.log();
    console.log(errorBox({
      title: 'Analysis failed',
      description: 'Check the error above and try again.',
    }));
    Deno.exit(1);
  }

  // Show stage 1 complete
  console.log(completionBox(
    '[1/2]',
    'Analysis complete',
    `${analysisResult.usage.operations} ops · ${analysisResult.usage.durationSec}s`,
  ));
  console.log();

  // Stage 2: Synthesis with Opus
  console.log(statusBox({
    label: '[2/2]',
    title: 'Generating Ralph Files',
    description: 'Creating AGENTS.md, specs/PROJECT_CONTEXT.md, and config',
    active: true,
  }));
  console.log();

  const synthesisResult = await runAndRender(
    {
      prompt: renderOnboardSynthesisPrompt(analysisResult.text),
      model: 'opus',
      skipPermissions: true,
    },
    {
      showSpinner: true,
      showTools: true,
      showStats: false,
    },
  );

  if (!synthesisResult.success) {
    console.log();
    console.log(errorBox({
      title: 'File generation failed',
      description: 'Check the error above and try again.',
    }));
    Deno.exit(1);
  }

  // Show stage 2 complete
  console.log(completionBox(
    '[2/2]',
    'Files generated',
    `${synthesisResult.usage.operations} ops · ${synthesisResult.usage.durationSec}s`,
  ));
  console.log();

  // Get final usage
  const finalUsage = await getSubscriptionUsage();
  const afterVal = finalUsage.ok ? finalUsage.value.fiveHour.utilization : null;

  // Calculate usage delta
  let usageInfo: string | undefined;
  if (finalUsage.ok) {
    usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
    if (beforeVal !== null && afterVal !== null && afterVal > beforeVal) {
      const delta = afterVal - beforeVal;
      usageInfo += ` ${amber(`(+${delta.toFixed(1)}%)`)}`;
    }
  }

  // Success message
  if (isVibeMode()) {
    console.log(successBox({
      title: 'Project Onboarded!',
      details: [
        `${dim('Created files:')}`,
        `  ${amber('AGENTS.md')}             ${dim('Build commands and conventions')}`,
        `  ${amber('specs/README.md')}       ${dim('Project overview')}`,
        `  ${amber('specs/PROJECT_CONTEXT.md')} ${dim('Architecture and patterns')}`,
      ],
      usageInfo,
    }));
  } else {
    console.log(successBox({
      title: 'Project Onboarded!',
      details: [
        `${dim('Created files:')}`,
        `  ${amber('AGENTS.md')}             ${dim('Build commands and conventions')}`,
        `  ${amber('specs/README.md')}       ${dim('Project overview')}`,
        `  ${amber('specs/PROJECT_CONTEXT.md')} ${dim('Architecture and patterns')}`,
      ],
      usageInfo,
      nextSteps: [
        { text: 'Review patterns in', command: 'specs/PROJECT_CONTEXT.md' },
        { text: 'Add a feature with', command: 'ralph spec' },
        { text: 'Or generate plan with', command: 'ralph plan' },
      ],
    }));
  }

  // Continue vibe flow if active
  await continueVibeFlow('onboard');
}

/**
 * Creates the onboard command.
 */
// deno-lint-ignore no-explicit-any
export function createOnboardCommand(): Command<any> {
  return new Command()
    .description('Analyze existing project and create Ralph files with discovered patterns')
    .option('-f, --force', 'Force reinitialization even if already a Ralph project')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .action(onboardAction);
}
