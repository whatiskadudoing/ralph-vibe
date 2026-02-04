/**
 * @module services/session_tracker
 *
 * Tracks session statistics using immutable state patterns.
 * Integrates with metrics collector for comprehensive session data.
 * Enables detailed reporting of token usage, caching savings, costs, etc.
 */

import { ensureDir } from '@std/fs';
import { join } from '@std/path';
import { calculateCost, formatCost } from './cost_calculator.ts';
import { formatDuration, formatTokenCount } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Statistics for a single iteration.
 */
export interface IterationStats {
  readonly iteration: number;
  readonly task: string;
  readonly model: 'opus' | 'sonnet' | 'haiku';
  readonly durationSec: number;
  readonly operations: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly success: boolean;
  readonly timestamp: string;
  readonly toolCalls?: readonly string[];
}

/**
 * Immutable session state.
 */
export interface SessionState {
  readonly sessionId: string;
  readonly startTime: string;
  readonly projectPath: string;
  readonly forking: boolean;
  readonly specsCount: number;
  readonly iterations: readonly IterationStats[];
  readonly filePath: string;
}

/**
 * Aggregated statistics for a session.
 */
export interface AggregateStats {
  readonly totalIterations: number;
  readonly totalOperations: number;
  readonly totalDurationSec: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheReadTokens: number;
  readonly totalCacheWriteTokens: number;
  readonly successfulIterations: number;
  readonly failedIterations: number;
  readonly tokensSavedByCache: number;
  readonly modelBreakdown: {
    readonly opus: number;
    readonly sonnet: number;
    readonly haiku: number;
  };
  readonly totalCost: number;
  readonly cacheEfficiency: number;
  readonly averageDurationSec: number;
  readonly successRate: number;
  readonly toolCallBreakdown: Record<string, number>;
}

/**
 * Options for creating a new session.
 */
export interface CreateSessionOptions {
  readonly forking: boolean;
  readonly specsCount: number;
  readonly projectPath?: string;
  readonly sessionId?: string;
}

// ============================================================================
// Session State Creation
// ============================================================================

/**
 * Creates a new session state with the given options.
 *
 * @impure Accesses crypto.randomUUID(), Date.now(), and Deno.env
 *
 * @param options - Configuration options for the session
 * @returns A new immutable SessionState
 */
export function createSession(options: CreateSessionOptions): SessionState {
  const sessionId = options.sessionId ?? crypto.randomUUID().slice(0, 8);
  const now = new Date();
  const tmpDir = Deno.env.get('TMPDIR') ?? '/tmp';

  return {
    sessionId,
    startTime: now.toISOString(),
    projectPath: options.projectPath ?? Deno.cwd(),
    forking: options.forking,
    specsCount: options.specsCount,
    iterations: [],
    filePath: join(tmpDir, `ralph-session-${sessionId}.json`),
  };
}

// ============================================================================
// State Updates (Immutable)
// ============================================================================

/**
 * Records an iteration's statistics.
 * Returns a new session state with the iteration added.
 *
 * @impure Calls Date.now() to generate timestamp
 *
 * @param state - Current session state
 * @param stats - Iteration statistics (timestamp is added automatically)
 * @returns New session state with the iteration recorded
 */
export function recordIteration(
  state: SessionState,
  stats: Omit<IterationStats, 'timestamp'>,
): SessionState {
  const iteration: IterationStats = {
    ...stats,
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    iterations: [...state.iterations, iteration],
  };
}

/**
 * Updates the last iteration in the session.
 * Useful for adding data after initial recording.
 *
 * @pure No side effects - returns new state without mutating input
 *
 * @param state - Current session state
 * @param updates - Partial iteration stats to merge
 * @returns New session state with the last iteration updated
 */
export function updateLastIteration(
  state: SessionState,
  updates: Partial<Omit<IterationStats, 'timestamp'>>,
): SessionState {
  if (state.iterations.length === 0) {
    return state;
  }

  const iterations = [...state.iterations];
  const lastIndex = iterations.length - 1;
  const lastIteration = iterations[lastIndex];

  if (lastIteration === undefined) {
    return state;
  }

  iterations[lastIndex] = {
    ...lastIteration,
    ...updates,
  };

  return {
    ...state,
    iterations,
  };
}

// ============================================================================
// Statistics Calculation (Pure)
// ============================================================================

/**
 * Calculates aggregate statistics for a session.
 *
 * @pure No side effects - computes statistics from input state only
 *
 * @param state - Current session state
 * @returns Aggregated statistics
 */
export function getStats(state: SessionState): AggregateStats {
  const totalIterations = state.iterations.length;

  if (totalIterations === 0) {
    return {
      totalIterations: 0,
      totalOperations: 0,
      totalDurationSec: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheWriteTokens: 0,
      successfulIterations: 0,
      failedIterations: 0,
      tokensSavedByCache: 0,
      modelBreakdown: { opus: 0, sonnet: 0, haiku: 0 },
      totalCost: 0,
      cacheEfficiency: 0,
      averageDurationSec: 0,
      successRate: 0,
      toolCallBreakdown: {},
    };
  }

  // Aggregate metrics
  let totalOperations = 0;
  let totalDurationSec = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let successfulIterations = 0;
  let failedIterations = 0;
  let totalCost = 0;
  const modelBreakdown = { opus: 0, sonnet: 0, haiku: 0 };
  const toolCallBreakdown: Record<string, number> = {};

  for (const iteration of state.iterations) {
    totalOperations += iteration.operations;
    totalDurationSec += iteration.durationSec;
    totalInputTokens += iteration.inputTokens;
    totalOutputTokens += iteration.outputTokens;
    totalCacheReadTokens += iteration.cacheReadTokens ?? 0;
    totalCacheWriteTokens += iteration.cacheWriteTokens ?? 0;

    if (iteration.success) {
      successfulIterations++;
    } else {
      failedIterations++;
    }

    modelBreakdown[iteration.model]++;

    // Calculate cost for this iteration
    const iterationCost = calculateCost(
      {
        inputTokens: iteration.inputTokens,
        outputTokens: iteration.outputTokens,
        cacheReadTokens: iteration.cacheReadTokens ?? 0,
        cacheWriteTokens: iteration.cacheWriteTokens ?? 0,
      },
      iteration.model,
    );
    totalCost += iterationCost;

    // Aggregate tool calls
    if (iteration.toolCalls) {
      for (const tool of iteration.toolCalls) {
        toolCallBreakdown[tool] = (toolCallBreakdown[tool] ?? 0) + 1;
      }
    }
  }

  // Cache read tokens represent tokens that didn't need to be re-sent
  // Each cache read saves ~90% of what would have been input tokens
  const tokensSavedByCache = Math.round(totalCacheReadTokens * 0.9);

  // Calculate cache efficiency
  const totalInputWithCache = totalInputTokens + totalCacheReadTokens;
  const cacheEfficiency = totalInputWithCache > 0
    ? (totalCacheReadTokens / totalInputWithCache) * 100
    : 0;

  // Calculate averages and rates
  const averageDurationSec = totalDurationSec / totalIterations;
  const successRate = (successfulIterations / totalIterations) * 100;

  return {
    totalIterations,
    totalOperations,
    totalDurationSec,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    successfulIterations,
    failedIterations,
    tokensSavedByCache,
    modelBreakdown,
    totalCost,
    cacheEfficiency,
    averageDurationSec,
    successRate,
    toolCallBreakdown,
  };
}

// ============================================================================
// Persistence (Impure)
// ============================================================================

/**
 * Converts session state to a JSON-serializable object.
 * Excludes filePath to avoid circular reference.
 *
 * @pure No side effects - transforms input to output only
 *
 * @param state - Session state to convert
 * @returns JSON-serializable session data
 */
export function sessionToJSON(state: SessionState): Omit<SessionState, 'filePath'> {
  return {
    sessionId: state.sessionId,
    startTime: state.startTime,
    projectPath: state.projectPath,
    forking: state.forking,
    specsCount: state.specsCount,
    iterations: state.iterations,
  };
}

/**
 * Persists session state to its temp file.
 * Silent failure - tracking is optional.
 *
 * @impure Performs file I/O
 *
 * @param state - Session state to save
 */
export async function persistSession(state: SessionState): Promise<void> {
  try {
    const dir = state.filePath.split('/').slice(0, -1).join('/');
    await ensureDir(dir);

    const data = sessionToJSON(state);
    await Deno.writeTextFile(state.filePath, JSON.stringify(data, null, 2));
  } catch {
    // Silent fail - tracking is optional
  }
}

/**
 * Saves session state to its temp file.
 * Alias for persistSession for backward compatibility.
 *
 * @impure Performs file I/O
 * @deprecated Use persistSession instead
 *
 * @param state - Session state to save
 */
export function saveSession(state: SessionState): Promise<void> {
  return persistSession(state);
}

/**
 * Loads a session state from a file.
 *
 * @impure Performs file I/O
 *
 * @param filePath - Path to the session file
 * @returns Session state or null if not found
 */
export async function loadSession(filePath: string): Promise<SessionState | null> {
  try {
    const content = await Deno.readTextFile(filePath);
    const data = JSON.parse(content);

    return {
      sessionId: data.sessionId,
      startTime: data.startTime,
      projectPath: data.projectPath,
      forking: data.forking,
      specsCount: data.specsCount,
      iterations: data.iterations ?? [],
      filePath,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Formatting Utilities (Pure)
// ============================================================================

/**
 * Formats token count with K/M suffix.
 * Re-exported from shared utilities for backward compatibility.
 *
 * @pure
 */
export const formatTokens = formatTokenCount;

/**
 * Wrapper for formatDuration that takes seconds instead of milliseconds.
 * Maintains backward compatibility with integer-second input.
 *
 * @pure No side effects - string formatting only
 *
 * @param seconds - Duration in seconds (integer expected)
 * @returns Human-readable duration (e.g., "30s", "2m 30s", "1h 15m")
 */
function formatDurationSec(seconds: number): string {
  // Floor seconds to ensure integer output matching original behavior
  return formatDuration(Math.floor(seconds) * 1000);
}

/**
 * Formats session summary for display.
 *
 * @pure No side effects - transforms session state to display strings
 *
 * @param state - Session state
 * @returns Array of formatted strings for display
 */
export function formatSessionSummaryFromState(state: SessionState): string[] {
  const stats = getStats(state);
  const lines: string[] = [];

  // Basic stats
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  lines.push(
    `${stats.totalIterations} iterations · ${stats.totalOperations} ops · ${
      formatDurationSec(stats.totalDurationSec)
    }`,
  );

  if (totalTokens > 0) {
    lines.push(
      `${formatTokens(totalTokens)} tokens (${formatTokens(stats.totalInputTokens)} in / ${
        formatTokens(stats.totalOutputTokens)
      } out)`,
    );
  }

  // Model breakdown
  if (
    stats.modelBreakdown.opus > 0 || stats.modelBreakdown.sonnet > 0 ||
    stats.modelBreakdown.haiku > 0
  ) {
    const modelParts: string[] = [];
    if (stats.modelBreakdown.opus > 0) modelParts.push(`opus: ${stats.modelBreakdown.opus}`);
    if (stats.modelBreakdown.sonnet > 0) modelParts.push(`sonnet: ${stats.modelBreakdown.sonnet}`);
    if (stats.modelBreakdown.haiku > 0) modelParts.push(`haiku: ${stats.modelBreakdown.haiku}`);
    lines.push(`Models: ${modelParts.join(', ')}`);
  }

  // Cache savings (only if forking was enabled)
  if (state.forking && stats.totalCacheReadTokens > 0) {
    lines.push(
      `Cache: ${formatTokens(stats.totalCacheReadTokens)} read · ~${
        formatTokens(stats.tokensSavedByCache)
      } saved (${stats.cacheEfficiency.toFixed(1)}% efficiency)`,
    );
  }

  // Cost
  if (stats.totalCost > 0) {
    lines.push(`Cost: ${formatCost(stats.totalCost)}`);
  }

  // Success rate (if there were failures)
  if (stats.failedIterations > 0) {
    lines.push(
      `Success: ${stats.successfulIterations}/${stats.totalIterations} (${
        stats.successRate.toFixed(1)
      }%)`,
    );
  }

  // Tool calls breakdown (top 5)
  const toolEntries = Object.entries(stats.toolCallBreakdown);
  if (toolEntries.length > 0) {
    const totalToolCalls = toolEntries.reduce((sum, [, count]) => sum + count, 0);
    const topTools = toolEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');
    lines.push(`Tool calls: ${totalToolCalls} (${topTools})`);
  }

  return lines;
}

// ============================================================================
// Backward Compatibility - SessionTracker Class Wrapper
// ============================================================================

/**
 * Legacy session data interface for backward compatibility.
 */
export interface SessionData {
  readonly sessionId: string;
  readonly startTime: string;
  readonly projectPath: string;
  readonly forking: boolean;
  readonly specsCount: number;
  readonly iterations: IterationStats[];
}

/**
 * Manages session tracking data.
 * This class wraps the functional API for backward compatibility.
 *
 * @deprecated Use the functional API (createSession, recordIteration, getStats) instead.
 */
export class SessionTracker {
  private state: SessionState;

  constructor(forking: boolean, specsCount: number) {
    this.state = createSession({ forking, specsCount });
  }

  /**
   * Records an iteration's statistics.
   * @impure Performs file I/O via persistSession
   */
  async recordIteration(stats: Omit<IterationStats, 'timestamp'>): Promise<void> {
    this.state = recordIteration(this.state, stats);
    await persistSession(this.state);
  }

  /**
   * Gets aggregate statistics for the session.
   */
  getAggregateStats(): {
    totalIterations: number;
    totalOperations: number;
    totalDurationSec: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheWriteTokens: number;
    successfulIterations: number;
    failedIterations: number;
    tokensSavedByCache: number;
    modelBreakdown: { opus: number; sonnet: number };
  } {
    const stats = getStats(this.state);
    // Return in the old format for backward compatibility
    return {
      totalIterations: stats.totalIterations,
      totalOperations: stats.totalOperations,
      totalDurationSec: stats.totalDurationSec,
      totalInputTokens: stats.totalInputTokens,
      totalOutputTokens: stats.totalOutputTokens,
      totalCacheReadTokens: stats.totalCacheReadTokens,
      totalCacheWriteTokens: stats.totalCacheWriteTokens,
      successfulIterations: stats.successfulIterations,
      failedIterations: stats.failedIterations,
      tokensSavedByCache: stats.tokensSavedByCache,
      modelBreakdown: { opus: stats.modelBreakdown.opus, sonnet: stats.modelBreakdown.sonnet },
    };
  }

  /**
   * Gets the session file path.
   */
  getFilePath(): string {
    return this.state.filePath;
  }

  /**
   * Gets raw session data.
   */
  getData(): SessionData {
    return {
      sessionId: this.state.sessionId,
      startTime: this.state.startTime,
      projectPath: this.state.projectPath,
      forking: this.state.forking,
      specsCount: this.state.specsCount,
      iterations: [...this.state.iterations],
    };
  }

  /**
   * Gets whether forking is enabled.
   */
  isForking(): boolean {
    return this.state.forking;
  }

  /**
   * Gets the underlying functional state.
   */
  getState(): SessionState {
    return this.state;
  }
}

/**
 * Formats session summary for display.
 * Accepts either a SessionTracker or SessionState.
 */
export function formatSessionSummary(trackerOrState: SessionTracker | SessionState): string[] {
  const state = trackerOrState instanceof SessionTracker
    ? trackerOrState.getState()
    : trackerOrState;
  return formatSessionSummaryFromState(state);
}
