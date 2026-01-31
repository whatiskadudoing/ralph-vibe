/**
 * @module cli/init
 *
 * The `ralph init` command.
 * Initializes a new Ralph project with sensible defaults.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import {
  createProjectFiles,
  getProjectFiles,
  isRalphProject,
  type ProjectFile,
} from '@/services/project_service.ts';
import { isGitRepo } from '@/services/git_service.ts';
import { getClaudeVersion, isClaudeInstalled } from '@/services/claude_service.ts';
import {
  renderInit,
  type ProjectFileInfo,
} from '@/components/InitScreen.tsx';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
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
  let vibeSteps: string[] = [];
  if (options.vibe) {
    enableVibeMode();
    const nextSteps = getNextCommands('init');
    vibeSteps = [
      'init',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'start':
            return 'start';
          case 'plan':
            return 'plan';
          case 'work':
            return 'work';
          default:
            return cmd;
        }
      }),
    ];
  }

  try {
    // Render the init screen
    const createdFiles = await renderInit({
      checkProject: async () => {
        const projectFiles = await getProjectFiles();
        const existingFiles = projectFiles.filter((f) => f.exists);
        const isInit = await isRalphProject();

        if (isInit && existingFiles.length > 0) {
          return {
            isInit: true,
            message: 'Project already initialized',
            detail: 'checking for updates',
          };
        }
        return {
          isInit: false,
          message: 'Not initialized',
        };
      },

      checkGit: async () => {
        if (await isGitRepo()) {
          return { ok: true, message: 'Git repository detected' };
        }
        return {
          ok: false,
          message: 'Not a git repository',
          detail: 'consider running git init',
        };
      },

      checkClaude: async () => {
        if (await isClaudeInstalled()) {
          const versionResult = await getClaudeVersion();
          const version = versionResult.ok ? versionResult.value : 'unknown';
          return { ok: true, message: 'Claude CLI installed', detail: version };
        }
        return { ok: false, message: 'Claude CLI not found' };
      },

      getProjectFiles: async (): Promise<ProjectFileInfo[]> => {
        const files = await getProjectFiles();
        return files.map((f) => ({
          key: f.key,
          name: f.name,
          description: f.description,
          exists: f.exists,
        }));
      },

      createFiles: async (files) => {
        const result = await createProjectFiles(files);
        if (result.ok) {
          return { ok: true };
        }
        return { ok: false, error: { message: result.error.message } };
      },

      vibeMode: isVibeMode(),
      vibeSteps,
    });

    // Continue vibe flow if active
    if (createdFiles.length > 0) {
      await continueVibeFlow('init');
    }
  } catch (error) {
    // Error was already shown by the component
    Deno.exit(1);
  }
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
