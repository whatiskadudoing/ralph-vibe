/**
 * @module core/parallel
 *
 * Parallel execution orchestration for Ralph CLI.
 * Manages multiple Claude workers running in isolated git worktrees.
 */

import { err, ok, type Result } from '@/utils/result.ts';
import {
  abortMerge,
  completeMerge,
  createWorktree,
  deleteBranch,
  ensureWorktreeDir,
  generateWorkerBranchName,
  getConflictContent,
  getConflictedFiles,
  getWorkerWorktreePath,
  mergeWorktree,
  pruneWorktrees,
  removeWorktree,
  removeWorktreeDir,
  stageResolvedFile,
  writeResolvedContent,
} from './worktree.ts';
import type { Task } from './plan.ts';

// ============================================================================
// Types
// ============================================================================

export interface ParallelError {
  readonly type: 'parallel_error';
  readonly code: 'init_failed' | 'execution_failed' | 'merge_failed' | 'cleanup_failed';
  readonly message: string;
}

/**
 * Dependency information for a task.
 */
export interface TaskDependency {
  /** Task IDs this task depends on (1-indexed from plan) */
  readonly dependsOn: number[];
  /** Whether this task can run in parallel with others */
  readonly parallelizable: boolean;
}

/**
 * Extended task with dependency information.
 */
export interface ParallelTask {
  /** Unique task ID (1-indexed) */
  readonly id: number;
  /** Original task from the plan */
  readonly task: Task;
  /** Display text (without dependency metadata) */
  readonly displayText: string;
  /** Dependency information */
  readonly dependency: TaskDependency;
  /** Current execution status */
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'blocked';
  /** Worker ID if assigned */
  workerId?: number;
  /** Execution result */
  result?: TaskResult;
}

/**
 * Result of executing a task.
 */
export interface TaskResult {
  readonly success: boolean;
  readonly error?: string;
  readonly duration: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly modelUsed: 'opus' | 'sonnet';
}

/**
 * Worker state machine states.
 */
export type WorkerState = 'idle' | 'initializing' | 'running' | 'merging' | 'error' | 'done';

/**
 * Worker statistics.
 */
export interface WorkerStats {
  tasksCompleted: number;
  tasksFailed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDuration: number;
  modelUsed: 'opus' | 'sonnet';
}

/**
 * Worker information.
 */
export interface Worker {
  readonly id: number;
  readonly worktreePath: string;
  readonly branchName: string;
  state: WorkerState;
  currentTask?: ParallelTask;
  stats: WorkerStats;
}

/**
 * Configuration for parallel execution.
 */
export interface ParallelConfig {
  /** Number of parallel workers */
  readonly workerCount: number;
  /** Directory for worktrees */
  readonly worktreeDir: string;
  /** Model to use for workers */
  readonly model: 'opus' | 'sonnet' | 'adaptive';
  /** Maximum iterations per worker */
  readonly maxIterations: number;
  /** Whether to auto-cleanup on completion */
  readonly autoCleanup: boolean;
}

/**
 * Summary of parallel execution.
 */
export interface ParallelSummary {
  workers: WorkerSummary[];
  totalDuration: number;
  tasksCompleted: number;
  tasksFailed: number;
  mergesSuccessful: number;
  mergeConflicts: number;
  totalCost: number;
  targetBranch: string;
}

export interface WorkerSummary {
  id: number;
  tasksCompleted: number;
  tasksFailed: number;
  model: 'opus' | 'sonnet';
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function parallelError(code: ParallelError['code'], message: string): ParallelError {
  return { type: 'parallel_error', code, message };
}

// ============================================================================
// Dependency Parsing
// ============================================================================

/**
 * Parses dependency metadata from a task description.
 * Looks for patterns like [depends: 1,2] and [parallel: true]
 *
 * @param text - Task description text
 */
export function parseTaskDependency(text: string): TaskDependency {
  const dependsOn: number[] = [];
  let parallelizable = true; // Default to parallelizable

  // Match [depends: ...] pattern - capture everything inside brackets
  const dependsMatch = text.match(/\[depends:\s*([^\]]+)\]/i);
  if (dependsMatch && dependsMatch[1]) {
    // Split by comma and parse each part
    const parts = dependsMatch[1].split(',');
    for (const part of parts) {
      const num = parseInt(part.trim(), 10);
      if (!isNaN(num) && num > 0) {
        dependsOn.push(num);
      }
    }
  }

  // Match [parallel: true/false] pattern
  const parallelMatch = text.match(/\[parallel:\s*(true|false)\]/i);
  if (parallelMatch && parallelMatch[1]) {
    parallelizable = parallelMatch[1].toLowerCase() === 'true';
  }

  // If task has dependencies, it's not parallelizable until deps are met
  if (dependsOn.length > 0) {
    parallelizable = false;
  }

  return { dependsOn, parallelizable };
}

/**
 * Strips dependency metadata from task text for display.
 *
 * @param text - Task description with potential metadata
 */
export function stripDependencyMetadata(text: string): string {
  return text
    .replace(/\[depends:\s*[0-9,\s]+\]/gi, '')
    .replace(/\[parallel:\s*(true|false)\]/gi, '')
    .trim();
}

// ============================================================================
// Dependency Graph
// ============================================================================

/**
 * Manages task dependencies and determines execution order.
 */
export class DependencyGraph {
  private tasks: Map<number, ParallelTask> = new Map();

  constructor(tasks: readonly Task[]) {
    // Convert tasks to ParallelTasks with dependencies
    tasks.forEach((task, index) => {
      const id = index + 1;
      const dependency = parseTaskDependency(task.text);
      const displayText = stripDependencyMetadata(task.text);

      this.tasks.set(id, {
        id,
        task,
        displayText,
        dependency,
        status: 'pending',
      });
    });

    // Initial pass to mark ready tasks
    this.updateReadyTasks();
  }

  /**
   * Gets all tasks.
   */
  getAllTasks(): ParallelTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Gets a task by ID.
   */
  getTask(id: number): ParallelTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Gets tasks that are ready to execute.
   * A task is ready if all its dependencies are completed and it's marked as ready.
   */
  getReadyTasks(): ParallelTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'ready');
  }

  /**
   * Gets the next ready task and marks it as running.
   */
  claimTask(workerId: number): ParallelTask | null {
    const readyTasks = this.getReadyTasks();
    if (readyTasks.length === 0) return null;

    const task = readyTasks[0];
    if (!task) return null;

    task.status = 'running';
    task.workerId = workerId;
    return task;
  }

  /**
   * Marks a task as completed and updates dependent tasks.
   */
  completeTask(id: number, result: TaskResult): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = result.success ? 'completed' : 'failed';
    task.result = result;

    // Update dependent tasks
    this.updateReadyTasks();
  }

  /**
   * Updates which tasks are ready based on completed dependencies.
   */
  private updateReadyTasks(): void {
    for (const task of this.tasks.values()) {
      if (task.status !== 'pending') continue;

      // First check if any dependency failed - if so, mark as blocked
      const depFailed = task.dependency.dependsOn.some((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'failed';
      });

      if (depFailed) {
        task.status = 'blocked';
        continue;
      }

      // Check if all dependencies are completed successfully
      const depsCompleted = task.dependency.dependsOn.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });

      if (depsCompleted) {
        task.status = 'ready';
      }
    }
  }

  /**
   * Gets execution statistics.
   */
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    blocked: number;
    running: number;
    pending: number;
    ready: number;
  } {
    let total = 0;
    let completed = 0;
    let failed = 0;
    let blocked = 0;
    let running = 0;
    let pending = 0;
    let ready = 0;

    for (const task of this.tasks.values()) {
      total++;
      switch (task.status) {
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'blocked':
          blocked++;
          break;
        case 'running':
          running++;
          break;
        case 'pending':
          pending++;
          break;
        case 'ready':
          ready++;
          break;
      }
    }

    return { total, completed, failed, blocked, running, pending, ready };
  }

  /**
   * Checks if there's a deadlock (no tasks can make progress).
   */
  hasDeadlock(): boolean {
    const stats = this.getStats();
    // Deadlock if nothing running, nothing ready, but tasks remaining
    return stats.running === 0 && stats.ready === 0 &&
      (stats.pending > 0 || stats.blocked > 0);
  }

  /**
   * Checks if all tasks are done (completed, failed, or blocked).
   */
  isComplete(): boolean {
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' || task.status === 'ready' || task.status === 'running') {
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// Parallel Worker
// ============================================================================

/**
 * Represents a single parallel worker running in an isolated worktree.
 */
export class ParallelWorker {
  readonly id: number;
  private _worktreePath: string = '';
  private _branchName: string = '';
  private _state: WorkerState = 'idle';
  private _currentTask?: ParallelTask;
  private _stats: WorkerStats;
  private onStateChange?: (worker: Worker) => void;
  private onToolCall?: (workerId: number, tool: string) => void;

  constructor(
    id: number,
    private config: ParallelConfig,
    callbacks?: {
      onStateChange?: (worker: Worker) => void;
      onToolCall?: (workerId: number, tool: string) => void;
    },
  ) {
    this.id = id;
    this._stats = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalDuration: 0,
      modelUsed: config.model === 'adaptive' ? 'opus' : config.model,
    };
    this.onStateChange = callbacks?.onStateChange;
    this.onToolCall = callbacks?.onToolCall;
  }

  get state(): WorkerState {
    return this._state;
  }

  get worktreePath(): string {
    return this._worktreePath;
  }

  get branchName(): string {
    return this._branchName;
  }

  get currentTask(): ParallelTask | undefined {
    return this._currentTask;
  }

  get stats(): WorkerStats {
    return this._stats;
  }

  private setState(state: WorkerState): void {
    this._state = state;
    this.onStateChange?.(this.toWorkerInfo());
  }

  toWorkerInfo(): Worker {
    return {
      id: this.id,
      worktreePath: this._worktreePath,
      branchName: this._branchName,
      state: this._state,
      currentTask: this._currentTask,
      stats: { ...this._stats },
    };
  }

  /**
   * Initializes the worker's git worktree.
   */
  async initialize(repoRoot: string, baseBranch: string): Promise<Result<void, ParallelError>> {
    this.setState('initializing');

    // Generate unique branch and path
    this._branchName = generateWorkerBranchName(this.id);
    this._worktreePath = `${repoRoot}/${getWorkerWorktreePath(this.config.worktreeDir, this.id)}`;

    // Ensure worktree directory exists
    const dirResult = await ensureWorktreeDir(`${repoRoot}/${this.config.worktreeDir}`);
    if (!dirResult.ok) {
      this.setState('error');
      return err(parallelError('init_failed', dirResult.error.message));
    }

    // Create the worktree
    const result = await createWorktree(repoRoot, this._worktreePath, this._branchName, baseBranch);
    if (!result.ok) {
      this.setState('error');
      return err(parallelError('init_failed', result.error.message));
    }

    this.setState('idle');
    return ok(undefined);
  }

  /**
   * Executes a task in the worker's worktree.
   */
  async executeTask(task: ParallelTask): Promise<TaskResult> {
    this._currentTask = task;
    this.setState('running');

    const startTime = Date.now();

    try {
      // Determine model to use
      const model = this.config.model === 'adaptive' ? 'opus' : this.config.model;

      // Build the task-specific prompt
      const prompt = this.buildTaskPrompt(task);

      // Run Claude in the worktree
      const result = await this.runClaude(prompt, model);

      const duration = (Date.now() - startTime) / 1000;
      const taskResult: TaskResult = {
        success: result.success,
        error: result.error,
        duration,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        modelUsed: model,
      };

      // Update stats
      if (result.success) {
        this._stats.tasksCompleted++;
      } else {
        this._stats.tasksFailed++;
      }
      this._stats.totalInputTokens += result.inputTokens;
      this._stats.totalOutputTokens += result.outputTokens;
      this._stats.totalDuration += duration;

      this._currentTask = undefined;
      this.setState('idle');

      return taskResult;
    } catch (e) {
      const duration = (Date.now() - startTime) / 1000;
      this._stats.tasksFailed++;
      this._stats.totalDuration += duration;
      this._currentTask = undefined;
      this.setState('error');

      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      return {
        success: false,
        error: errorMsg,
        duration,
        inputTokens: 0,
        outputTokens: 0,
        modelUsed: this.config.model === 'adaptive' ? 'opus' : this.config.model,
      };
    }
  }

  /**
   * Merges the worker's branch into the target branch.
   * If conflicts occur, uses Claude to resolve them automatically.
   */
  async merge(repoRoot: string, targetBranch: string): Promise<Result<string, ParallelError>> {
    this.setState('merging');

    const mergeMessage = `Merge parallel worker ${this.id}: ${this._branchName}`;
    const result = await mergeWorktree(
      repoRoot,
      this._branchName,
      targetBranch,
      { noFf: true, message: mergeMessage },
    );

    if (!result.ok) {
      this.setState('error');
      return err(parallelError('merge_failed', result.error.message));
    }

    if (result.value.hasConflicts) {
      // Attempt automatic conflict resolution using Claude
      const resolveResult = await this.resolveConflictsWithClaude(repoRoot, targetBranch);
      if (!resolveResult.ok) {
        // Abort the merge if resolution fails
        await abortMerge(repoRoot);
        this.setState('error');
        return err(resolveResult.error);
      }

      // Complete the merge with resolved conflicts
      const completeResult = await completeMerge(repoRoot, mergeMessage);
      if (!completeResult.ok) {
        this.setState('error');
        return err(parallelError('merge_failed', completeResult.error.message));
      }

      this.setState('done');
      return ok(completeResult.value);
    }

    this.setState('done');
    return ok(result.value.commitHash ?? 'unknown');
  }

  /**
   * Resolves merge conflicts using Claude.
   */
  private async resolveConflictsWithClaude(
    repoRoot: string,
    _targetBranch: string,
  ): Promise<Result<void, ParallelError>> {
    // Get list of conflicted files
    const filesResult = await getConflictedFiles(repoRoot);
    if (!filesResult.ok) {
      return err(parallelError('merge_failed', filesResult.error.message));
    }

    const conflictedFiles = filesResult.value;
    if (conflictedFiles.length === 0) {
      return ok(undefined);
    }

    // Resolve each conflicted file
    for (const filePath of conflictedFiles) {
      const resolveResult = await this.resolveFileConflict(repoRoot, filePath);
      if (!resolveResult.ok) {
        return resolveResult;
      }
    }

    return ok(undefined);
  }

  /**
   * Resolves conflicts in a single file using Claude.
   */
  private async resolveFileConflict(
    repoRoot: string,
    filePath: string,
  ): Promise<Result<void, ParallelError>> {
    // Get the conflicted content
    const contentResult = await getConflictContent(repoRoot, filePath);
    if (!contentResult.ok) {
      return err(parallelError('merge_failed', contentResult.error.message));
    }

    const conflictedContent = contentResult.value;

    // Build prompt for Claude to resolve the conflict
    const prompt = this.buildConflictResolutionPrompt(filePath, conflictedContent);

    // Run Claude to resolve the conflict
    const model = this.config.model === 'adaptive' ? 'sonnet' : this.config.model;
    const resolution = await this.runClaudeForConflictResolution(prompt, model);

    if (!resolution.success || !resolution.resolvedContent) {
      return err(
        parallelError(
          'merge_failed',
          `Failed to resolve conflict in ${filePath}: ${
            resolution.error ?? 'No resolution provided'
          }`,
        ),
      );
    }

    // Write the resolved content
    const writeResult = await writeResolvedContent(repoRoot, filePath, resolution.resolvedContent);
    if (!writeResult.ok) {
      return err(parallelError('merge_failed', writeResult.error.message));
    }

    // Stage the resolved file
    const stageResult = await stageResolvedFile(repoRoot, filePath);
    if (!stageResult.ok) {
      return err(parallelError('merge_failed', stageResult.error.message));
    }

    return ok(undefined);
  }

  /**
   * Builds a prompt for Claude to resolve a merge conflict.
   */
  private buildConflictResolutionPrompt(filePath: string, conflictedContent: string): string {
    // Get info about completed tasks for context
    const completedTasks = this._stats.tasksCompleted;

    // Build list of tasks this worker completed (from current task if available)
    const taskContext = this._currentTask
      ? `This worker was working on: "${this._currentTask.displayText}"`
      : `This worker completed ${completedTasks} task(s)`;

    return `# Merge Conflict Resolution - PRESERVE ALL WORK

You are resolving a merge conflict in a parallel build system where multiple Claude workers implemented different tasks simultaneously.

## CRITICAL RULES
1. **PRESERVE ALL FUNCTIONALITY** - Both sides contain real work. You MUST keep all features from BOTH branches.
2. **NO FEATURE LOSS** - If HEAD added function A and the worker branch added function B, the result MUST have BOTH.
3. **COMBINE INTELLIGENTLY** - Merge imports, exports, functions, classes from both sides.
4. **ORDER MATTERS** - Keep logical ordering (imports at top, exports at bottom, related functions together).

## Context
- Worker ${this.id} completed real implementation work
- ${taskContext}
- HEAD (main branch) may contain work from other workers that was already merged
- The incoming branch contains this worker's completed task implementation
- BOTH sides represent legitimate, completed work that must be preserved

## Conflicted File
Path: ${filePath}

## Conflicted Content (with markers)
\`\`\`
${conflictedContent}
\`\`\`

## How to Resolve
1. **<<<<<<< HEAD** = Changes already in main (from other workers or existing code)
2. **=======** = Separator
3. **>>>>>>> branch** = This worker's changes

### Resolution Strategy:
- For IMPORTS: Include ALL imports from both sides (deduplicate identical ones)
- For FUNCTIONS/CLASSES: Include ALL definitions from both sides
- For EXPORTS: Include ALL exports from both sides
- For MODIFICATIONS to same code: Carefully merge the logic to preserve both intents
- For CONFLICTING implementations: Combine them if possible, or keep the more complete version

## Output Format
Output ONLY the fully resolved file content with:
- NO conflict markers (no <<<<<<<, =======, >>>>>>>)
- ALL functionality from both sides preserved
- Proper syntax and formatting
- No explanations, no code fences, just the raw file content

**YOUR OUTPUT WILL BE WRITTEN DIRECTLY TO THE FILE. OUTPUT ONLY THE RESOLVED CONTENT.**
`;
  }

  /**
   * Runs Claude specifically for conflict resolution (simpler output handling).
   */
  private async runClaudeForConflictResolution(
    prompt: string,
    model: 'opus' | 'sonnet',
  ): Promise<{ success: boolean; resolvedContent?: string; error?: string }> {
    const args = [
      '-p',
      '--dangerously-skip-permissions',
      '--output-format',
      'json',
      '--model',
      model,
    ];

    const command = new Deno.Command('claude', {
      args,
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
      cwd: this._worktreePath,
    });

    try {
      const process = command.spawn();

      // Write prompt to stdin
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(prompt));
      await writer.close();

      // Read output
      const output = await process.output();
      const status = await process.status;

      if (!status.success) {
        const stderr = new TextDecoder().decode(output.stderr);
        return { success: false, error: stderr };
      }

      // Parse the JSON output to extract the result
      const stdout = new TextDecoder().decode(output.stdout);
      try {
        const data = JSON.parse(stdout);
        const resolvedContent = data.result ?? '';

        if (!resolvedContent) {
          return { success: false, error: 'No content in response' };
        }

        return { success: true, resolvedContent };
      } catch {
        // If JSON parse fails, the output might be raw text
        if (stdout.trim()) {
          return { success: true, resolvedContent: stdout };
        }
        return { success: false, error: 'Failed to parse response' };
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Cleans up the worker's worktree and branch.
   */
  async cleanup(repoRoot: string): Promise<Result<void, ParallelError>> {
    // Remove worktree
    const removeResult = await removeWorktree(repoRoot, this._worktreePath, { force: true });
    if (!removeResult.ok) {
      // Try to remove the directory manually
      await removeWorktreeDir(this._worktreePath);
    }

    // Delete branch
    await deleteBranch(repoRoot, this._branchName, { force: true });

    // Prune stale worktrees
    await pruneWorktrees(repoRoot);

    return ok(undefined);
  }

  private buildTaskPrompt(task: ParallelTask): string {
    return `# Parallel Worker Task

You are Worker ${this.id} in a parallel build system.

## Your Task
${task.displayText}

## Instructions
1. Study \`specs/README.md\` for specifications
2. Study \`AGENTS.md\` for build/test commands
3. Implement this specific task completely
4. Run validation commands
5. Mark task \`[x]\` complete in IMPLEMENTATION_PLAN.md
6. Commit with message capturing the "why"

**Important:** Only work on this one task. Complete it fully before finishing.

## Guardrails
- ONE TASK ONLY - Complete this task, commit, exit
- FULL IMPLEMENTATION - No placeholders or TODOs
- TESTS MUST PASS - Fix failures before committing
- MATCH EXISTING PATTERNS - Follow codebase conventions

End with:
\`\`\`
RALPH_STATUS:
task: "${task.displayText.slice(0, 50)}..."
validation: pass/fail
EXIT_SIGNAL: true
\`\`\`
`;
  }

  private async runClaude(
    prompt: string,
    model: 'opus' | 'sonnet',
  ): Promise<{ success: boolean; error?: string; inputTokens: number; outputTokens: number }> {
    const args = [
      '-p',
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      model,
    ];

    const command = new Deno.Command('claude', {
      args,
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
      cwd: this._worktreePath,
    });

    const process = command.spawn();

    // Write prompt to stdin
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(prompt));
    await writer.close();

    // Read and parse output
    const reader = process.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let success = true;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            // Extract tool calls for UI updates
            if (data.type === 'assistant' && data.message?.content) {
              for (const content of data.message.content) {
                if (content.type === 'tool_use') {
                  this.onToolCall?.(this.id, content.name);
                }
              }
            }

            // Extract token usage from result
            if (data.type === 'result') {
              inputTokens = data.usage?.input_tokens ?? 0;
              outputTokens = data.usage?.output_tokens ?? 0;

              // Check for validation failure
              const text = data.result ?? '';
              if (text.includes('validation: fail')) {
                success = false;
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const status = await process.status;
    if (!status.success) {
      success = false;
    }

    return { success, inputTokens, outputTokens };
  }
}

// ============================================================================
// Parallel Orchestrator
// ============================================================================

/**
 * Orchestrates parallel execution of tasks across multiple workers.
 */
export class ParallelOrchestrator {
  private workers: ParallelWorker[] = [];
  private graph: DependencyGraph;
  private startTime: number = 0;
  private onWorkerUpdate?: (worker: Worker) => void;
  private onToolCall?: (workerId: number, tool: string) => void;
  private onStatsUpdate?: (stats: { total: number; completed: number; failed: number }) => void;

  constructor(
    private config: ParallelConfig,
    tasks: readonly Task[],
    callbacks?: {
      onWorkerUpdate?: (worker: Worker) => void;
      onToolCall?: (workerId: number, tool: string) => void;
      onStatsUpdate?: (stats: { total: number; completed: number; failed: number }) => void;
    },
  ) {
    this.graph = new DependencyGraph(tasks);
    this.onWorkerUpdate = callbacks?.onWorkerUpdate;
    this.onToolCall = callbacks?.onToolCall;
    this.onStatsUpdate = callbacks?.onStatsUpdate;

    // Create workers
    for (let i = 1; i <= config.workerCount; i++) {
      this.workers.push(
        new ParallelWorker(i, config, {
          onStateChange: this.onWorkerUpdate,
          onToolCall: this.onToolCall,
        }),
      );
    }
  }

  /**
   * Gets all workers.
   */
  getWorkers(): Worker[] {
    return this.workers.map((w) => w.toWorkerInfo());
  }

  /**
   * Gets the dependency graph.
   */
  getGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * Initializes all workers and starts parallel execution.
   */
  async run(repoRoot: string, baseBranch: string): Promise<Result<ParallelSummary, ParallelError>> {
    this.startTime = Date.now();

    // Initialize all workers in parallel
    const initResults = await Promise.all(
      this.workers.map((w) => w.initialize(repoRoot, baseBranch)),
    );

    // Check for initialization failures
    for (const result of initResults) {
      if (!result.ok) {
        await this.cleanup(repoRoot);
        return err(result.error);
      }
    }

    // Run the task execution loop
    await this.executionLoop();

    // Check for deadlock
    if (this.graph.hasDeadlock()) {
      await this.cleanup(repoRoot);
      return err(
        parallelError('execution_failed', 'Deadlock detected: no tasks can make progress'),
      );
    }

    // Merge phase - sequential for safety
    let mergesSuccessful = 0;
    let mergeConflicts = 0;

    for (const worker of this.workers) {
      if (worker.stats.tasksCompleted > 0) {
        const mergeResult = await worker.merge(repoRoot, baseBranch);
        if (mergeResult.ok) {
          mergesSuccessful++;
        } else {
          mergeConflicts++;
        }
      }
    }

    // Cleanup
    if (this.config.autoCleanup) {
      await this.cleanup(repoRoot);
    }

    // Build summary
    const stats = this.graph.getStats();
    const summary = this.buildSummary(baseBranch, mergesSuccessful, mergeConflicts, stats);

    return ok(summary);
  }

  /**
   * The main execution loop - assigns tasks to idle workers.
   */
  private async executionLoop(): Promise<void> {
    // Track running tasks
    const runningTasks: Map<number, Promise<void>> = new Map();

    while (!this.graph.isComplete()) {
      // Find idle workers and assign tasks
      for (const worker of this.workers) {
        if (worker.state !== 'idle') continue;

        const task = this.graph.claimTask(worker.id);
        if (!task) continue;

        // Start task execution
        const taskPromise = (async () => {
          const result = await worker.executeTask(task);
          this.graph.completeTask(task.id, result);

          // Notify stats update
          const graphStats = this.graph.getStats();
          this.onStatsUpdate?.({
            total: graphStats.total,
            completed: graphStats.completed,
            failed: graphStats.failed,
          });
        })();

        runningTasks.set(task.id, taskPromise);
      }

      // If no tasks running and none ready, we might be done or deadlocked
      if (runningTasks.size === 0 && this.graph.getReadyTasks().length === 0) {
        break;
      }

      // Wait for at least one task to complete
      if (runningTasks.size > 0) {
        await Promise.race(runningTasks.values());

        // Clean up completed tasks
        for (const [taskId, _promise] of runningTasks) {
          const task = this.graph.getTask(taskId);
          if (task && (task.status === 'completed' || task.status === 'failed')) {
            runningTasks.delete(taskId);
          }
        }
      }
    }

    // Wait for all remaining tasks
    await Promise.all(runningTasks.values());
  }

  /**
   * Cleans up all workers.
   */
  async cleanup(repoRoot: string): Promise<void> {
    await Promise.all(this.workers.map((w) => w.cleanup(repoRoot)));

    // Remove the worktree directory
    await removeWorktreeDir(`${repoRoot}/${this.config.worktreeDir}`);
  }

  /**
   * Builds the execution summary.
   */
  private buildSummary(
    targetBranch: string,
    mergesSuccessful: number,
    mergeConflicts: number,
    stats: { total: number; completed: number; failed: number },
  ): ParallelSummary {
    const totalDuration = (Date.now() - this.startTime) / 1000;

    const workerSummaries: WorkerSummary[] = this.workers.map((w) => ({
      id: w.id,
      tasksCompleted: w.stats.tasksCompleted,
      tasksFailed: w.stats.tasksFailed,
      model: w.stats.modelUsed,
      inputTokens: w.stats.totalInputTokens,
      outputTokens: w.stats.totalOutputTokens,
      estimatedCost: this.estimateCost(w.stats),
    }));

    const totalCost = workerSummaries.reduce((sum, w) => sum + w.estimatedCost, 0);

    return {
      workers: workerSummaries,
      totalDuration,
      tasksCompleted: stats.completed,
      tasksFailed: stats.failed,
      mergesSuccessful,
      mergeConflicts,
      totalCost,
      targetBranch,
    };
  }

  /**
   * Estimates cost based on token usage and model.
   */
  private estimateCost(stats: WorkerStats): number {
    // Approximate pricing (as of 2024)
    const pricing = {
      opus: { input: 15 / 1_000_000, output: 75 / 1_000_000 },
      sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    };

    const rates = pricing[stats.modelUsed];
    return (stats.totalInputTokens * rates.input) + (stats.totalOutputTokens * rates.output);
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PARALLEL_CONFIG: ParallelConfig = {
  workerCount: 2,
  worktreeDir: '.ralph-workers',
  model: 'opus',
  maxIterations: 25,
  autoCleanup: true,
};
