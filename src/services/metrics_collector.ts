/**
 * @module services/metrics_collector
 *
 * Collects and aggregates metrics for API iterations and tool calls.
 * Uses an immutable state pattern - all functions return new state, never mutate.
 * Integrates with cost_calculator for cost calculations.
 */

import { calculateCost, formatCost, type TokenUsage } from './cost_calculator.ts';
import { formatDuration, formatTokenCount } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Immutable metrics state for a session.
 */
export interface MetricsState {
  readonly sessionId: string;
  readonly startTime: number;
  readonly iterations: readonly IterationMetrics[];
  readonly toolCalls: readonly ToolCallMetric[];
}

/**
 * Metrics for a single iteration/API call.
 */
export interface IterationMetrics {
  readonly iteration: number;
  readonly model: 'opus' | 'sonnet' | 'haiku';
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly duration: number;
  readonly toolCallCount: number;
  readonly success: boolean;
  readonly timestamp: number;
}

/**
 * Metrics for a single tool call.
 */
export interface ToolCallMetric {
  readonly iteration: number;
  readonly toolName: string;
  readonly duration: number;
  readonly success: boolean;
}

/**
 * Aggregated metrics across all iterations.
 */
export interface AggregatedMetrics {
  readonly totalIterations: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheReadTokens: number;
  readonly totalCacheWriteTokens: number;
  readonly totalDuration: number;
  readonly totalCost: number;
  readonly cacheEfficiency: number;
  readonly averageIterationDuration: number;
  readonly successRate: number;
  readonly toolCallsByType: Record<string, number>;
}

// ============================================================================
// State Creation
// ============================================================================

/**
 * Creates a new metrics state with an optional session ID.
 * If no session ID is provided, generates a random one.
 *
 * @param sessionId - Optional session identifier
 * @returns A new immutable MetricsState
 */
export function createMetricsState(sessionId?: string): MetricsState {
  return {
    sessionId: sessionId ?? crypto.randomUUID().slice(0, 8),
    startTime: Date.now(),
    iterations: [],
    toolCalls: [],
  };
}

// ============================================================================
// State Updates (Immutable)
// ============================================================================

/**
 * Collects token usage from an API response.
 * Creates a new iteration entry if this is new token data.
 *
 * @param state - Current metrics state
 * @param usage - Token usage from API response
 * @param model - Model name used for the call
 * @returns New state with updated token usage
 */
export function collectTokenUsage(
  state: MetricsState,
  usage: TokenUsage,
  model: string,
): MetricsState {
  const normalizedModel = normalizeModelName(model);
  const iterationNumber = state.iterations.length + 1;

  const newIteration: IterationMetrics = {
    iteration: iterationNumber,
    model: normalizedModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
    duration: 0,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  };

  return {
    ...state,
    iterations: [...state.iterations, newIteration],
  };
}

/**
 * Updates the duration of the most recent iteration.
 *
 * @param state - Current metrics state
 * @param duration - Duration in milliseconds
 * @returns New state with updated duration
 */
export function collectDuration(
  state: MetricsState,
  duration: number,
): MetricsState {
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
    duration,
  };

  return {
    ...state,
    iterations,
  };
}

/**
 * Records a tool call metric.
 *
 * @param state - Current metrics state
 * @param toolCall - Tool call metric to record
 * @returns New state with the tool call added
 */
export function collectToolCall(
  state: MetricsState,
  toolCall: ToolCallMetric,
): MetricsState {
  // Also update the tool call count in the corresponding iteration
  const iterations = state.iterations.map((iter) => {
    if (iter.iteration === toolCall.iteration) {
      return {
        ...iter,
        toolCallCount: iter.toolCallCount + 1,
      };
    }
    return iter;
  });

  return {
    ...state,
    iterations,
    toolCalls: [...state.toolCalls, toolCall],
  };
}

/**
 * Records a complete iteration with all metrics.
 *
 * @param state - Current metrics state
 * @param iteration - Complete iteration metrics
 * @returns New state with the iteration recorded
 */
export function recordIteration(
  state: MetricsState,
  iteration: IterationMetrics,
): MetricsState {
  return {
    ...state,
    iterations: [...state.iterations, iteration],
  };
}

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Calculates aggregated metrics across all iterations.
 *
 * @param state - Current metrics state
 * @returns Aggregated metrics summary
 */
export function getAggregatedMetrics(state: MetricsState): AggregatedMetrics {
  const totalIterations = state.iterations.length;

  if (totalIterations === 0) {
    return {
      totalIterations: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheWriteTokens: 0,
      totalDuration: 0,
      totalCost: 0,
      cacheEfficiency: 0,
      averageIterationDuration: 0,
      successRate: 0,
      toolCallsByType: {},
    };
  }

  // Aggregate iteration metrics
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let totalDuration = 0;
  let totalCost = 0;
  let successCount = 0;

  for (const iteration of state.iterations) {
    totalInputTokens += iteration.inputTokens;
    totalOutputTokens += iteration.outputTokens;
    totalCacheReadTokens += iteration.cacheReadTokens;
    totalCacheWriteTokens += iteration.cacheWriteTokens;
    totalDuration += iteration.duration;

    if (iteration.success) {
      successCount++;
    }

    // Calculate cost for this iteration
    const iterationCost = calculateCost(
      {
        inputTokens: iteration.inputTokens,
        outputTokens: iteration.outputTokens,
        cacheReadTokens: iteration.cacheReadTokens,
        cacheWriteTokens: iteration.cacheWriteTokens,
      },
      iteration.model,
    );
    totalCost += iterationCost;
  }

  // Calculate cache efficiency
  const totalInputWithCache = totalInputTokens + totalCacheReadTokens;
  const cacheEfficiency = totalInputWithCache > 0
    ? (totalCacheReadTokens / totalInputWithCache) * 100
    : 0;

  // Calculate average iteration duration
  const averageIterationDuration = totalDuration / totalIterations;

  // Calculate success rate
  const successRate = (successCount / totalIterations) * 100;

  // Aggregate tool calls by type
  const toolCallsByType: Record<string, number> = {};
  for (const toolCall of state.toolCalls) {
    toolCallsByType[toolCall.toolName] = (toolCallsByType[toolCall.toolName] ?? 0) + 1;
  }

  return {
    totalIterations,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    totalDuration,
    totalCost,
    cacheEfficiency,
    averageIterationDuration,
    successRate,
    toolCallsByType,
  };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Formats aggregated metrics for display.
 *
 * @param metrics - Aggregated metrics to format
 * @returns Array of formatted strings for display
 */
export function formatAggregatedMetrics(metrics: AggregatedMetrics): string[] {
  const lines: string[] = [];

  // Basic stats
  lines.push(
    `Iterations: ${metrics.totalIterations} (${metrics.successRate.toFixed(1)}% success)`,
  );

  // Token usage
  const totalTokens = metrics.totalInputTokens + metrics.totalOutputTokens;
  lines.push(
    `Tokens: ${formatTokenCount(totalTokens)} (${formatTokenCount(metrics.totalInputTokens)} in / ${
      formatTokenCount(metrics.totalOutputTokens)
    } out)`,
  );

  // Cache stats
  if (metrics.totalCacheReadTokens > 0 || metrics.totalCacheWriteTokens > 0) {
    lines.push(
      `Cache: ${formatTokenCount(metrics.totalCacheReadTokens)} read / ${
        formatTokenCount(metrics.totalCacheWriteTokens)
      } write (${metrics.cacheEfficiency.toFixed(1)}% efficiency)`,
    );
  }

  // Duration
  lines.push(
    `Duration: ${formatDuration(metrics.totalDuration)} total (${
      formatDuration(metrics.averageIterationDuration)
    } avg)`,
  );

  // Cost
  lines.push(`Cost: ${formatCost(metrics.totalCost)}`);

  // Tool calls breakdown
  const toolCallEntries = Object.entries(metrics.toolCallsByType);
  if (toolCallEntries.length > 0) {
    const totalToolCalls = toolCallEntries.reduce((sum, [, count]) => sum + count, 0);
    const topTools = toolCallEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');
    lines.push(`Tool calls: ${totalToolCalls} (${topTools})`);
  }

  return lines;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Normalizes model name to a standard form.
 */
function normalizeModelName(model: string): 'opus' | 'sonnet' | 'haiku' {
  const lower = model.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('haiku')) return 'haiku';
  return 'opus'; // Default to opus
}

// formatTokenCount and formatDuration are now imported from @/utils/formatting.ts
