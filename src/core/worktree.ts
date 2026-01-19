/**
 * @module core/worktree
 *
 * Git worktree management for parallel execution.
 * Handles creating, removing, and managing git worktrees for isolated worker environments.
 */

import { err, ok, type Result } from '@/utils/result.ts';

// ============================================================================
// Types
// ============================================================================

export interface WorktreeError {
  readonly type: 'worktree_error';
  readonly code: 'create_failed' | 'remove_failed' | 'merge_failed' | 'list_failed' | 'not_found';
  readonly message: string;
}

export interface WorktreeInfo {
  /** Path to the worktree directory */
  readonly path: string;
  /** Branch name for this worktree */
  readonly branch: string;
  /** Whether this is the main worktree */
  readonly isMain: boolean;
}

export interface MergeResult {
  /** Whether the merge was successful */
  readonly success: boolean;
  /** Commit hash if merge succeeded */
  readonly commitHash?: string;
  /** Whether there were conflicts */
  readonly hasConflicts: boolean;
  /** Conflict details if any */
  readonly conflictDetails?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a WorktreeError.
 */
function worktreeError(code: WorktreeError['code'], message: string): WorktreeError {
  return { type: 'worktree_error', code, message };
}

/**
 * Runs a git command and returns the output.
 */
async function runGitCommand(
  args: string[],
  cwd?: string,
): Promise<Result<string, WorktreeError>> {
  try {
    const command = new Deno.Command('git', {
      args,
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    const { success, stdout, stderr } = await command.output();

    if (!success) {
      const error = new TextDecoder().decode(stderr);
      return err(worktreeError('create_failed', error.trim()));
    }

    return ok(new TextDecoder().decode(stdout).trim());
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('create_failed', message));
  }
}

// ============================================================================
// Worktree Operations
// ============================================================================

/**
 * Creates a new git worktree with a new branch.
 *
 * @param repoRoot - Root directory of the main repository
 * @param worktreePath - Path where the worktree will be created
 * @param branchName - Name for the new branch
 * @param baseBranch - Branch to base the new branch on (e.g., 'main')
 */
export async function createWorktree(
  repoRoot: string,
  worktreePath: string,
  branchName: string,
  baseBranch: string,
): Promise<Result<WorktreeInfo, WorktreeError>> {
  // Create the worktree with a new branch based on the base branch
  const result = await runGitCommand(
    ['worktree', 'add', '-b', branchName, worktreePath, baseBranch],
    repoRoot,
  );

  if (!result.ok) {
    return err(worktreeError('create_failed', result.error.message));
  }

  return ok({
    path: worktreePath,
    branch: branchName,
    isMain: false,
  });
}

/**
 * Removes a git worktree.
 *
 * @param repoRoot - Root directory of the main repository
 * @param worktreePath - Path to the worktree to remove
 * @param options - Removal options
 */
export async function removeWorktree(
  repoRoot: string,
  worktreePath: string,
  options?: { force?: boolean },
): Promise<Result<void, WorktreeError>> {
  const args = ['worktree', 'remove'];
  if (options?.force) {
    args.push('--force');
  }
  args.push(worktreePath);

  const result = await runGitCommand(args, repoRoot);

  if (!result.ok) {
    return err(worktreeError('remove_failed', result.error.message));
  }

  return ok(undefined);
}

/**
 * Lists all worktrees in the repository.
 *
 * @param repoRoot - Root directory of the main repository
 */
export async function listWorktrees(
  repoRoot: string,
): Promise<Result<WorktreeInfo[], WorktreeError>> {
  const result = await runGitCommand(['worktree', 'list', '--porcelain'], repoRoot);

  if (!result.ok) {
    return err(worktreeError('list_failed', result.error.message));
  }

  const worktrees: WorktreeInfo[] = [];
  const blocks = result.value.split('\n\n').filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split('\n');
    let path = '';
    let branch = '';

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice(9);
      } else if (line.startsWith('branch ')) {
        // Branch format: refs/heads/branch-name
        branch = line.slice(7).replace('refs/heads/', '');
      }
    }

    if (path) {
      worktrees.push({
        path,
        branch: branch || 'HEAD',
        isMain: worktrees.length === 0, // First worktree is the main one
      });
    }
  }

  return ok(worktrees);
}

/**
 * Checks if a merge would have conflicts.
 *
 * @param repoRoot - Root directory of the repository
 * @param sourceBranch - Branch to merge from
 * @param targetBranch - Branch to merge into
 */
export async function checkMergeConflicts(
  repoRoot: string,
  sourceBranch: string,
  targetBranch: string,
): Promise<Result<boolean, WorktreeError>> {
  // Use git merge-tree to check for conflicts without actually merging
  // First, get the merge base
  const baseResult = await runGitCommand(
    ['merge-base', targetBranch, sourceBranch],
    repoRoot,
  );

  if (!baseResult.ok) {
    // No common ancestor - branches are unrelated
    return ok(true);
  }

  const mergeBase = baseResult.value;

  // Use merge-tree to detect conflicts
  const mergeTreeResult = await runGitCommand(
    ['merge-tree', mergeBase, targetBranch, sourceBranch],
    repoRoot,
  );

  if (!mergeTreeResult.ok) {
    return err(worktreeError('merge_failed', mergeTreeResult.error.message));
  }

  // Check for conflict markers in the output
  const hasConflicts = mergeTreeResult.value.includes('<<<<<<<') ||
    mergeTreeResult.value.includes('changed in both');

  return ok(hasConflicts);
}

/**
 * Merges a branch into the target branch.
 *
 * @param repoRoot - Root directory of the repository
 * @param sourceBranch - Branch to merge from
 * @param targetBranch - Branch to merge into
 * @param options - Merge options
 */
export async function mergeWorktree(
  repoRoot: string,
  sourceBranch: string,
  targetBranch: string,
  options?: { noFf?: boolean; message?: string },
): Promise<Result<MergeResult, WorktreeError>> {
  // First, checkout the target branch
  const checkoutResult = await runGitCommand(
    ['checkout', targetBranch],
    repoRoot,
  );

  if (!checkoutResult.ok) {
    return err(
      worktreeError(
        'merge_failed',
        `Failed to checkout ${targetBranch}: ${checkoutResult.error.message}`,
      ),
    );
  }

  // Build merge command
  const mergeArgs = ['merge', sourceBranch];
  if (options?.noFf) {
    mergeArgs.push('--no-ff');
  }
  if (options?.message) {
    mergeArgs.push('-m', options.message);
  }

  // Attempt the merge
  try {
    const command = new Deno.Command('git', {
      args: mergeArgs,
      stdout: 'piped',
      stderr: 'piped',
      cwd: repoRoot,
    });
    const { success, stdout, stderr } = await command.output();

    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    if (!success) {
      // Check if it's a conflict
      if (errorOutput.includes('CONFLICT') || output.includes('CONFLICT')) {
        return ok({
          success: false,
          hasConflicts: true,
          conflictDetails: errorOutput || output,
        });
      }

      return err(worktreeError('merge_failed', errorOutput || output));
    }

    // Extract commit hash from merge output
    const hashMatch = output.match(/([a-f0-9]{7,40})/);
    const commitHash = hashMatch ? hashMatch[1] : undefined;

    return ok({
      success: true,
      hasConflicts: false,
      commitHash,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('merge_failed', message));
  }
}

/**
 * Deletes a branch.
 *
 * @param repoRoot - Root directory of the repository
 * @param branchName - Name of the branch to delete
 * @param options - Deletion options
 */
export async function deleteBranch(
  repoRoot: string,
  branchName: string,
  options?: { force?: boolean },
): Promise<Result<void, WorktreeError>> {
  const flag = options?.force ? '-D' : '-d';
  const result = await runGitCommand(['branch', flag, branchName], repoRoot);

  if (!result.ok) {
    return err(worktreeError('remove_failed', result.error.message));
  }

  return ok(undefined);
}

/**
 * Prunes stale worktree entries.
 *
 * @param repoRoot - Root directory of the repository
 */
export async function pruneWorktrees(
  repoRoot: string,
): Promise<Result<void, WorktreeError>> {
  const result = await runGitCommand(['worktree', 'prune'], repoRoot);

  if (!result.ok) {
    return err(worktreeError('remove_failed', result.error.message));
  }

  return ok(undefined);
}

/**
 * Creates the worktree directory if it doesn't exist.
 *
 * @param dirPath - Path to create
 */
export async function ensureWorktreeDir(dirPath: string): Promise<Result<void, WorktreeError>> {
  try {
    await Deno.mkdir(dirPath, { recursive: true });
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('create_failed', `Failed to create directory: ${message}`));
  }
}

/**
 * Removes a directory recursively.
 *
 * @param dirPath - Path to remove
 */
export async function removeWorktreeDir(dirPath: string): Promise<Result<void, WorktreeError>> {
  try {
    await Deno.remove(dirPath, { recursive: true });
    return ok(undefined);
  } catch (e) {
    // Ignore if directory doesn't exist
    if (e instanceof Deno.errors.NotFound) {
      return ok(undefined);
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('remove_failed', `Failed to remove directory: ${message}`));
  }
}

/**
 * Generates a unique branch name for a parallel worker.
 *
 * @param workerId - Worker identifier
 */
export function generateWorkerBranchName(workerId: number): string {
  const timestamp = Date.now();
  return `ralph-parallel-${timestamp}-worker-${workerId}`;
}

/**
 * Generates the path for a worker's worktree.
 *
 * @param baseDir - Base directory for worktrees (e.g., '.ralph-workers')
 * @param workerId - Worker identifier
 */
export function getWorkerWorktreePath(baseDir: string, workerId: number): string {
  return `${baseDir}/worker-${workerId}`;
}

/**
 * Gets the list of files with merge conflicts.
 *
 * @param repoRoot - Root directory of the repository
 */
export async function getConflictedFiles(
  repoRoot: string,
): Promise<Result<string[], WorktreeError>> {
  const result = await runGitCommand(['diff', '--name-only', '--diff-filter=U'], repoRoot);

  if (!result.ok) {
    return err(worktreeError('merge_failed', result.error.message));
  }

  const files = result.value.split('\n').filter((f) => f.trim());
  return ok(files);
}

/**
 * Gets the content of a conflicted file.
 *
 * @param repoRoot - Root directory of the repository
 * @param filePath - Path to the conflicted file
 */
export async function getConflictContent(
  repoRoot: string,
  filePath: string,
): Promise<Result<string, WorktreeError>> {
  try {
    const fullPath = `${repoRoot}/${filePath}`;
    const content = await Deno.readTextFile(fullPath);
    return ok(content);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('merge_failed', `Failed to read conflicted file: ${message}`));
  }
}

/**
 * Writes the resolved content to a file.
 *
 * @param repoRoot - Root directory of the repository
 * @param filePath - Path to the file
 * @param content - Resolved content
 */
export async function writeResolvedContent(
  repoRoot: string,
  filePath: string,
  content: string,
): Promise<Result<void, WorktreeError>> {
  try {
    const fullPath = `${repoRoot}/${filePath}`;
    await Deno.writeTextFile(fullPath, content);
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err(worktreeError('merge_failed', `Failed to write resolved file: ${message}`));
  }
}

/**
 * Stages a resolved file.
 *
 * @param repoRoot - Root directory of the repository
 * @param filePath - Path to the resolved file
 */
export async function stageResolvedFile(
  repoRoot: string,
  filePath: string,
): Promise<Result<void, WorktreeError>> {
  const result = await runGitCommand(['add', filePath], repoRoot);

  if (!result.ok) {
    return err(worktreeError('merge_failed', result.error.message));
  }

  return ok(undefined);
}

/**
 * Completes a merge after conflicts have been resolved.
 *
 * @param repoRoot - Root directory of the repository
 * @param message - Commit message for the merge
 */
export async function completeMerge(
  repoRoot: string,
  message: string,
): Promise<Result<string, WorktreeError>> {
  const result = await runGitCommand(['commit', '-m', message], repoRoot);

  if (!result.ok) {
    return err(worktreeError('merge_failed', result.error.message));
  }

  // Get the commit hash
  const hashResult = await runGitCommand(['rev-parse', 'HEAD'], repoRoot);
  if (!hashResult.ok) {
    return ok('unknown');
  }

  return ok(hashResult.value.slice(0, 7));
}

/**
 * Aborts a merge in progress.
 *
 * @param repoRoot - Root directory of the repository
 */
export async function abortMerge(
  repoRoot: string,
): Promise<Result<void, WorktreeError>> {
  const result = await runGitCommand(['merge', '--abort'], repoRoot);

  if (!result.ok) {
    return err(worktreeError('merge_failed', result.error.message));
  }

  return ok(undefined);
}
