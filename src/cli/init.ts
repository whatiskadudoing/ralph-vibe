/**
 * @module cli/init
 *
 * The `ralph init` command.
 * Initializes a new Ralph project with sensible defaults.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { Checkbox } from '@cliffy/prompt';
import { amber, dim, muted } from '@/ui/colors.ts';
import { withSpinner } from '@/ui/spinner.ts';
import {
  createProjectFiles,
  getProjectFiles,
  initProject,
  isRalphProject,
  type ProjectFile,
} from '@/services/project_service.ts';
import { isGitRepo } from '@/services/git_service.ts';
import { getClaudeVersion, isClaudeInstalled } from '@/services/claude_service.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  checkInfo,
  checkSuccess,
  commandHeader,
  errorBox,
  infoBox,
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

  // Check if already initialized - but allow re-init with file selection
  const projectFiles = await getProjectFiles();
  const existingFiles = projectFiles.filter((f) => f.exists);
  const isAlreadyInit = await isRalphProject();

  if (isAlreadyInit && existingFiles.length > 0) {
    console.log(checkInfo('Project already initialized', 'checking for updates'));
  } else {
    console.log(checkSuccess('Not already initialized'));
  }

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

  // Determine which files to create
  let filesToCreate: Set<ProjectFile>;

  if (isAlreadyInit && existingFiles.length > 0) {
    // Project exists - show checkbox for files to overwrite
    console.log(infoBox({
      title: 'Existing files detected',
      description: 'Select which files to overwrite (new files will be created automatically)',
    }));
    console.log();

    // Separate existing and missing files
    const missingFiles = projectFiles.filter((f) => !f.exists);

    // Show checkbox for existing files
    const selectedToOverwrite = await Checkbox.prompt({
      message: 'Select files to overwrite:',
      options: existingFiles.map((f) => ({
        name: `${f.name} ${muted(`- ${f.description}`)}`,
        value: f.key,
        checked: false, // Default to not overwriting
      })),
    }) as ProjectFile[];

    // Combine: selected existing files + all missing files
    const missingFileKeys = missingFiles.map((f) => f.key);
    filesToCreate = new Set<ProjectFile>([...selectedToOverwrite, ...missingFileKeys]);

    if (filesToCreate.size === 0) {
      console.log();
      console.log(infoBox({
        title: 'Nothing to do',
        description: 'No files selected for update. All files already exist.',
      }));
      Deno.exit(0);
    }

    console.log();
  } else {
    // New project - create all files
    filesToCreate = new Set<ProjectFile>([
      'config',
      'specs',
      'agents',
      'plan',
      'audience_jtbd',
      'prompt_build',
      'prompt_plan',
      'prompt_start',
      'prompt_spec',
      'prompt_audience',
    ]);
  }

  // Initialize project with selected files
  const result = await withSpinner('Creating Ralph project...', async () => {
    return await createProjectFiles(filesToCreate);
  });

  if (!result.ok) {
    console.log(errorBox({
      title: 'Initialization failed',
      description: result.error.message,
    }));
    Deno.exit(1);
  }

  // Build list of created/updated files
  const createdFileDetails: string[] = [`${dim('Created/updated files:')}`];
  if (filesToCreate.has('specs')) {
    createdFileDetails.push(`  ${amber('specs/')}                 ${dim('Feature specifications')}`);
  }
  if (filesToCreate.has('audience_jtbd')) {
    createdFileDetails.push(`  ${amber('AUDIENCE_JTBD.md')}       ${dim('Audience & jobs-to-be-done')}`);
  }
  if (filesToCreate.has('plan')) {
    createdFileDetails.push(`  ${amber('IMPLEMENTATION_PLAN.md')} ${dim('Task checklist')}`);
  }
  if (filesToCreate.has('agents')) {
    createdFileDetails.push(`  ${amber('AGENTS.md')}              ${dim('Build/test commands')}`);
  }
  if (filesToCreate.has('prompt_build')) {
    createdFileDetails.push(`  ${dim('PROMPT_build.md')}         ${dim('Build instructions')}`);
  }
  if (filesToCreate.has('prompt_plan')) {
    createdFileDetails.push(`  ${dim('PROMPT_plan.md')}          ${dim('Planning instructions')}`);
  }
  if (filesToCreate.has('prompt_start')) {
    createdFileDetails.push(`  ${dim('PROMPT_start.md')}         ${dim('Start interview instructions')}`);
  }
  if (filesToCreate.has('prompt_spec')) {
    createdFileDetails.push(`  ${dim('PROMPT_spec.md')}          ${dim('Spec interview instructions')}`);
  }
  if (filesToCreate.has('prompt_audience')) {
    createdFileDetails.push(`  ${dim('PROMPT_audience.md')}      ${dim('Audience interview instructions')}`);
  }
  if (filesToCreate.has('config')) {
    createdFileDetails.push(`  ${dim('.ralph.json')}             ${dim('Configuration')}`);
  }

  // Success box (skip next steps in vibe mode - they'll be done automatically)
  if (isVibeMode()) {
    console.log(successBox({
      title: 'Project Initialized!',
      details: createdFileDetails,
    }));
  } else {
    console.log(successBox({
      title: 'Project Initialized!',
      details: createdFileDetails,
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
