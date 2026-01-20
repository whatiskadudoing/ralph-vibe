/**
 * @module services/session_tracker
 *
 * Tracks session statistics and writes them to a temp file.
 * Enables detailed reporting of token usage, caching savings, etc.
 */

import { ensureDir } from '@std/fs';
import { join } from '@std/path';

// ============================================================================
// Types
// ============================================================================

export interface IterationStats {
  readonly iteration: number;
  readonly task: string;
  readonly model: 'opus' | 'sonnet';
  readonly durationSec: number;
  readonly operations: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly success: boolean;
  readonly timestamp: string;
}

export interface SessionData {
  readonly sessionId: string;
  readonly startTime: string;
  readonly projectPath: string;
  readonly forking: boolean;
  readonly specsCount: number;
  readonly iterations: IterationStats[];
}

// ============================================================================
// Session Tracker
// ============================================================================

/**
 * Manages session tracking data.
 */
export class SessionTracker {
  private data: SessionData;
  private filePath: string;

  constructor(forking: boolean, specsCount: number) {
    const sessionId = crypto.randomUUID().slice(0, 8);
    const now = new Date();

    this.data = {
      sessionId,
      startTime: now.toISOString(),
      projectPath: Deno.cwd(),
      forking,
      specsCount,
      iterations: [],
    };

    // Store in system temp directory
    this.filePath = join(Deno.env.get('TMPDIR') ?? '/tmp', `ralph-session-${sessionId}.json`);
  }

  /**
   * Records an iteration's statistics.
   */
  async recordIteration(stats: Omit<IterationStats, 'timestamp'>): Promise<void> {
    const iteration: IterationStats = {
      ...stats,
      timestamp: new Date().toISOString(),
    };

    this.data = {
      ...this.data,
      iterations: [...this.data.iterations, iteration],
    };

    await this.save();
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
    const stats = {
      totalIterations: this.data.iterations.length,
      totalOperations: 0,
      totalDurationSec: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheWriteTokens: 0,
      successfulIterations: 0,
      failedIterations: 0,
      tokensSavedByCache: 0,
      modelBreakdown: { opus: 0, sonnet: 0 },
    };

    for (const iter of this.data.iterations) {
      stats.totalOperations += iter.operations;
      stats.totalDurationSec += iter.durationSec;
      stats.totalInputTokens += iter.inputTokens;
      stats.totalOutputTokens += iter.outputTokens;
      stats.totalCacheReadTokens += iter.cacheReadTokens ?? 0;
      stats.totalCacheWriteTokens += iter.cacheWriteTokens ?? 0;

      if (iter.success) {
        stats.successfulIterations++;
      } else {
        stats.failedIterations++;
      }

      stats.modelBreakdown[iter.model]++;
    }

    // Cache read tokens represent tokens that didn't need to be re-sent
    // Each cache read saves ~90% of what would have been input tokens
    stats.tokensSavedByCache = Math.round(stats.totalCacheReadTokens * 0.9);

    return stats;
  }

  /**
   * Gets the session file path.
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Gets raw session data.
   */
  getData(): SessionData {
    return this.data;
  }

  /**
   * Gets whether forking is enabled.
   */
  isForking(): boolean {
    return this.data.forking;
  }

  /**
   * Saves session data to temp file.
   */
  private async save(): Promise<void> {
    try {
      const dir = this.filePath.split('/').slice(0, -1).join('/');
      await ensureDir(dir);
      await Deno.writeTextFile(this.filePath, JSON.stringify(this.data, null, 2));
    } catch {
      // Silent fail - tracking is optional
    }
  }
}

/**
 * Formats token count with K/M suffix.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

/**
 * Formats session summary for display.
 */
export function formatSessionSummary(tracker: SessionTracker): string[] {
  const stats = tracker.getAggregateStats();
  const lines: string[] = [];

  // Basic stats
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  lines.push(`${stats.totalIterations} iterations · ${stats.totalOperations} ops · ${formatDuration(stats.totalDurationSec)}`);

  if (totalTokens > 0) {
    lines.push(`${formatTokens(totalTokens)} tokens (${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out)`);
  }

  // Model breakdown
  if (stats.modelBreakdown.opus > 0 || stats.modelBreakdown.sonnet > 0) {
    const modelParts: string[] = [];
    if (stats.modelBreakdown.opus > 0) modelParts.push(`opus: ${stats.modelBreakdown.opus}`);
    if (stats.modelBreakdown.sonnet > 0) modelParts.push(`sonnet: ${stats.modelBreakdown.sonnet}`);
    lines.push(`Models: ${modelParts.join(', ')}`);
  }

  // Cache savings (only if forking was enabled)
  if (tracker.isForking() && stats.totalCacheReadTokens > 0) {
    lines.push(`Cache: ${formatTokens(stats.totalCacheReadTokens)} read · ~${formatTokens(stats.tokensSavedByCache)} saved`);
  }

  return lines;
}

/**
 * Formats duration nicely.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}
