/**
 * @module cli/init
 *
 * The `ralph init` command.
 * Initializes a new Ralph project with sensible defaults.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, dim } from '@/ui/colors.ts';
import { withSpinner } from '@/ui/spinner.ts';
import { initProject, isRalphProject } from '@/services/project_service.ts';
import { isGitRepo } from '@/services/git_service.ts';
import { getClaudeVersion, isClaudeInstalled } from '@/services/claude_service.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  checkInfo,
  checkSuccess,
  commandHeader,
  errorBox,
  prerequisiteHeader,
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
// Command
// ============================================================================

interface InitOptions {
  readonly vibe?: boolean;
}

/**
 * The init command action.
 */
async function initAction(options: InitOptions): Promise<void> {
  // Handle vibe mode
  if (options.vibe) {
    enableVibeMode();
    const nextSteps = getNextCommands('init');
    showVibeActivated([
      'Initialize project',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'start':
            return 'Create feature specs via interview';
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

  // Fetch subscription usage
  const initialUsage = await getSubscriptionUsage();

  // Show header
  console.log();
  console.log(commandHeader({
    name: 'Ralph Init',
    description: 'Initialize a new Ralph project',
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Check prerequisites
  console.log(prerequisiteHeader());
  console.log();

  // Check if already initialized
  if (await isRalphProject()) {
    console.log(errorBox({
      title: 'Already initialized',
      description: 'Ralph project already exists in this directory.',
    }));
    Deno.exit(1);
  }
  console.log(checkSuccess('Not already initialized'));

  // Check git
  if (await isGitRepo()) {
    console.log(checkSuccess('Git repository detected'));
  } else {
    console.log(checkInfo('Not a git repository', 'consider running git init'));
  }

  // Check Claude CLI
  if (await isClaudeInstalled()) {
    const versionResult = await getClaudeVersion();
    const version = versionResult.ok ? versionResult.value : 'unknown';
    console.log(checkSuccess('Claude CLI installed', version));
  } else {
    console.log();
    console.log(errorBox({
      title: 'Claude CLI not found',
      description: 'Install from: https://docs.anthropic.com/claude-code',
    }));
    Deno.exit(1);
  }

  console.log();

  // Initialize project
  const result = await withSpinner('Creating Ralph project...', async () => {
    return await initProject();
  });

  if (!result.ok) {
    console.log(errorBox({
      title: 'Initialization failed',
      description: result.error.message,
    }));
    Deno.exit(1);
  }

  // Success box (skip next steps in vibe mode - they'll be done automatically)
  if (isVibeMode()) {
    console.log(successBox({
      title: 'Project Initialized!',
      details: [
        `${dim('Created files:')}`,
        `  ${amber('specs/')}                ${dim('Feature specifications')}`,
        `  ${amber('IMPLEMENTATION_PLAN.md')} ${dim('Task checklist')}`,
        `  ${amber('AGENTS.md')}             ${dim('Build/test commands')}`,
      ],
    }));
  } else {
    console.log(successBox({
      title: 'Project Initialized!',
      details: [
        `${dim('Created files:')}`,
        `  ${amber('specs/')}                ${dim('Feature specifications')}`,
        `  ${amber('IMPLEMENTATION_PLAN.md')} ${dim('Task checklist')}`,
        `  ${amber('AGENTS.md')}             ${dim('Build/test commands')}`,
        `  ${dim('PROMPT_build.md')}        ${dim('Build instructions')}`,
        `  ${dim('PROMPT_plan.md')}         ${dim('Planning instructions')}`,
        `  ${dim('.ralph.json')}            ${dim('Configuration')}`,
      ],
      nextSteps: [
        { text: 'Run', command: 'ralph start' },
        { text: 'Or write specs manually in', command: 'specs/' },
        { text: 'Then run', command: 'ralph plan' },
        { text: 'Finally run', command: 'ralph work' },
      ],
    }));
  }

  // Continue vibe flow if active
  await continueVibeFlow('init');
}

/**
 * Creates the init command.
 */
// deno-lint-ignore no-explicit-any
export function createInitCommand(): Command<any> {
  return new Command()
    .description('Initialize a new Ralph project')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .action(initAction);
}
