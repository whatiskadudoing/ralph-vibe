/**
 * @module services/git_service
 *
 * Git operations for Ralph CLI.
 * Wraps git commands for project detection and commit operations.
 */

import { err, ok, type Result } from '@/utils/result.ts';

// ============================================================================
// Types
// ============================================================================

export interface GitError {
  readonly type: 'git_error';
  readonly code: 'not_found' | 'not_repo' | 'command_failed';
  readonly message: string;
}

export interface GitStatus {
  readonly branch: string;
  readonly isClean: boolean;
  readonly staged: readonly string[];
  readonly modified: readonly string[];
  readonly untracked: readonly string[];
}

/**
 * Creates a GitError.
 *
 * This is an error factory function following the pattern used throughout the codebase.
 * Error factories create structured error objects with a discriminant `type` field
 * for type-safe error handling using Result types.
 *
 * @param code - The error code indicating the type of git failure
 * @param message - A human-readable error message
 * @returns A structured GitError object
 *
 * @example
 * const error = gitError('not_repo', 'Not a git repository');
 * // Returns: { type: 'git_error', code: 'not_repo', message: 'Not a git repository' }
 */
function gitError(code: GitError['code'], message: string): GitError {
  return { type: 'git_error', code, message };
}

// ============================================================================
// Git Detection
// ============================================================================

/**
 * Checks if git is installed and available.
 */
export async function isGitInstalled(): Promise<boolean> {
  try {
    const command = new Deno.Command('git', {
      args: ['--version'],
      stdout: 'null',
      stderr: 'null',
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Checks if the current directory is a git repository.
 */
export async function isGitRepo(cwd?: string): Promise<boolean> {
  try {
    const command = new Deno.Command('git', {
      args: ['rev-parse', '--git-dir'],
      stdout: 'null',
      stderr: 'null',
      cwd,
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Gets the root directory of the git repository.
 */
export async function getRepoRoot(cwd?: string): Promise<Result<string, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['rev-parse', '--show-toplevel'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout } = await command.output();

    if (!success) {
      return err(gitError('not_repo', 'Not a git repository'));
    }

    return ok(new TextDecoder().decode(stdout).trim());
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Branch Operations
// ============================================================================

/**
 * Gets the current branch name.
 */
export async function getCurrentBranch(cwd?: string): Promise<Result<string, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['branch', '--show-current'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout } = await command.output();

    if (!success) {
      return err(gitError('command_failed', 'Failed to get current branch'));
    }

    return ok(new TextDecoder().decode(stdout).trim());
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Creates a new branch.
 */
export async function createBranch(
  branchName: string,
  cwd?: string,
): Promise<Result<void, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['checkout', '-b', branchName],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Switches to an existing branch.
 */
export async function checkoutBranch(
  branchName: string,
  cwd?: string,
): Promise<Result<void, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['checkout', branchName],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Status Operations
// ============================================================================

/**
 * Gets the git status of the repository.
 */
export async function getStatus(cwd?: string): Promise<Result<GitStatus, GitError>> {
  try {
    // Get current branch
    const branchResult = await getCurrentBranch(cwd);
    if (!branchResult.ok) {
      return branchResult;
    }

    // Get status with porcelain format
    const command = new Deno.Command('git', {
      args: ['status', '--porcelain'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    const output = new TextDecoder().decode(stdout);
    const lines = output.split('\n').filter((line) => line.trim());

    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.slice(3);

      // Staged changes (in index)
      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(filePath);
      }

      // Modified in work tree
      if (workTreeStatus === 'M') {
        modified.push(filePath);
      }

      // Untracked files
      if (indexStatus === '?') {
        untracked.push(filePath);
      }
    }

    return ok({
      branch: branchResult.value,
      isClean: lines.length === 0,
      staged,
      modified,
      untracked,
    });
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Commit Operations
// ============================================================================

/**
 * Stages all changes.
 */
export async function stageAll(cwd?: string): Promise<Result<void, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['add', '-A'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Stages specific files.
 */
export async function stageFiles(
  files: readonly string[],
  cwd?: string,
): Promise<Result<void, GitError>> {
  if (files.length === 0) {
    return ok(undefined);
  }

  try {
    const command = new Deno.Command('git', {
      args: ['add', ...files],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Creates a commit with the given message.
 */
export async function commit(
  message: string,
  cwd?: string,
): Promise<Result<string, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['commit', '-m', message],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    // Extract commit hash from output
    const output = new TextDecoder().decode(stdout);
    const match = output.match(/\[.+ ([a-f0-9]+)\]/);
    const hash = match && match[1] ? match[1] : 'unknown';

    return ok(hash);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Log Operations
// ============================================================================

/**
 * Gets the last N commit messages.
 */
export async function getRecentCommits(
  cwd?: string,
  count: number = 5,
): Promise<Result<readonly string[], GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['log', `--max-count=${count}`, '--pretty=format:%s'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout } = await command.output();

    if (!success) {
      // Might be a new repo with no commits
      return ok([]);
    }

    const output = new TextDecoder().decode(stdout).trim();
    if (!output) {
      return ok([]);
    }

    return ok(output.split('\n'));
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Tag Operations
// ============================================================================

/**
 * Gets the latest semver tag (e.g., v1.2.3).
 * Returns null if no tags exist.
 */
export async function getLatestTag(cwd?: string): Promise<Result<string | null, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['tag', '--sort=-v:refname', '--list', 'v*'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout } = await command.output();

    if (!success) {
      return ok(null);
    }

    const output = new TextDecoder().decode(stdout).trim();
    if (!output) {
      return ok(null);
    }

    // Return the first (latest) tag
    const tags = output.split('\n');
    return ok(tags[0] ?? null);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Creates a new git tag.
 */
export async function createTag(
  tagName: string,
  message?: string,
  cwd?: string,
): Promise<Result<void, GitError>> {
  try {
    const args = message ? ['tag', '-a', tagName, '-m', message] : ['tag', tagName];

    const command = new Deno.Command('git', {
      args,
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

/**
 * Pushes tags to remote.
 */
export async function pushTags(cwd?: string): Promise<Result<void, GitError>> {
  try {
    const command = new Deno.Command('git', {
      args: ['push', '--tags'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(gitError('command_failed', error));
    }

    return ok(undefined);
  } catch {
    return err(gitError('not_found', 'Git not found'));
  }
}

// ============================================================================
// Pure Utility Functions
// ============================================================================

/**
 * Increments a semver version.
 *
 * @pure No side effects - string manipulation only
 *
 * @param version - Current version (e.g., "v1.2.3" or "1.2.3")
 * @param type - Type of increment: "major", "minor", or "patch"
 * @returns New version with "v" prefix
 */
export function incrementVersion(
  version: string | null,
  type: 'major' | 'minor' | 'patch' = 'patch',
): string {
  if (!version) {
    return 'v0.1.0';
  }

  // Remove "v" prefix if present
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  const parts = cleanVersion.split('.').map(Number);

  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;

  switch (type) {
    case 'major':
      return `v${major + 1}.0.0`;
    case 'minor':
      return `v${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `v${major}.${minor}.${patch + 1}`;
  }
}
