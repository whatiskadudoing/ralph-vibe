/**
 * @module services/status_reporter
 *
 * Provides real-time status reporting with observer pattern for tracking
 * progress, metrics, and status updates during CLI operations.
 *
 * @example
 * import {
 *   createReporter,
 *   subscribe,
 *   reportStatus,
 *   reportProgress,
 *   reportMetrics,
 * } from "@/services/status_reporter.ts";
 *
 * const reporter = createReporter();
 *
 * // Subscribe to updates
 * const unsubscribe = subscribe(reporter, (update) => {
 *   console.log(`[${update.type}] ${update.message}`);
 * });
 *
 * // Report various updates
 * reportStatus(reporter, "Starting operation...");
 * reportProgress(reporter, { current: 5, total: 10, percentage: 50, label: "Processing" });
 * reportMetrics(reporter, { inputTokens: 1000, outputTokens: 500, totalCost: 0.05, duration: 5000, operationCount: 3 });
 *
 * // Cleanup
 * unsubscribe();
 */

import { formatCost } from '@/services/cost_calculator.ts';
import { formatDuration } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a status update event.
 */
export interface StatusUpdate {
  readonly type: 'status' | 'progress' | 'metrics';
  readonly timestamp: number;
  readonly message: string;
  readonly data?: Record<string, unknown>;
}

/**
 * Represents progress information for an ongoing operation.
 */
export interface ProgressUpdate {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly label: string;
  readonly eta?: number; // estimated time remaining in ms
}

/**
 * Represents metrics collected during operations.
 */
export interface MetricsUpdate {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalCost: number;
  readonly duration: number;
  readonly cacheEfficiency?: number;
  readonly operationCount: number;
}

/**
 * Observer function that receives status updates.
 */
export type StatusObserver = (update: StatusUpdate) => void;

/**
 * Internal state for the status reporter.
 */
export interface StatusReporter {
  readonly observers: Set<StatusObserver>;
}

// ============================================================================
// Constants
// ============================================================================

/** Default width for progress bars */
const DEFAULT_PROGRESS_BAR_WIDTH = 30;

/** Progress bar characters */
const PROGRESS_FILLED = '\u2588'; // Full block
const PROGRESS_EMPTY = '\u2591'; // Light shade

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new status reporter instance.
 *
 * @returns A new StatusReporter with an empty observer set
 *
 * @example
 * const reporter = createReporter();
 */
export function createReporter(): StatusReporter {
  return {
    observers: new Set(),
  };
}

// ============================================================================
// Observer Management
// ============================================================================

/**
 * Subscribes an observer to receive status updates.
 *
 * @param reporter - The status reporter to subscribe to
 * @param observer - The callback function to receive updates
 * @returns An unsubscribe function to remove the observer
 *
 * @example
 * const unsubscribe = subscribe(reporter, (update) => {
 *   console.log(update.message);
 * });
 * // Later: unsubscribe();
 */
export function subscribe(
  reporter: StatusReporter,
  observer: StatusObserver,
): () => void {
  reporter.observers.add(observer);
  return () => {
    reporter.observers.delete(observer);
  };
}

/**
 * Notifies all observers of an update.
 * Internal helper function with side effects (impure).
 *
 * @param reporter - The status reporter containing observers
 * @param update - The status update to broadcast
 */
function notifyObservers(reporter: StatusReporter, update: StatusUpdate): void {
  for (const observer of reporter.observers) {
    observer(update);
  }
}

// ============================================================================
// Reporting Functions
// ============================================================================

/**
 * Reports a general status message.
 *
 * @param reporter - The status reporter
 * @param message - The status message
 * @param data - Optional additional data to include
 *
 * @example
 * reportStatus(reporter, "Operation started");
 * reportStatus(reporter, "Processing file", { filename: "data.json" });
 */
export function reportStatus(
  reporter: StatusReporter,
  message: string,
  data?: Record<string, unknown>,
): void {
  const update: StatusUpdate = {
    type: 'status',
    timestamp: Date.now(),
    message,
    data,
  };
  notifyObservers(reporter, update);
}

/**
 * Reports progress on an ongoing operation.
 *
 * @param reporter - The status reporter
 * @param progress - The progress information
 *
 * @example
 * reportProgress(reporter, {
 *   current: 5,
 *   total: 10,
 *   percentage: 50,
 *   label: "Processing items",
 *   eta: 5000 // 5 seconds remaining
 * });
 */
export function reportProgress(
  reporter: StatusReporter,
  progress: ProgressUpdate,
): void {
  const message = formatProgressMessage(progress);
  const update: StatusUpdate = {
    type: 'progress',
    timestamp: Date.now(),
    message,
    data: progress as unknown as Record<string, unknown>,
  };
  notifyObservers(reporter, update);
}

/**
 * Reports metrics for operations.
 *
 * @param reporter - The status reporter
 * @param metrics - The metrics data
 *
 * @example
 * reportMetrics(reporter, {
 *   inputTokens: 1500,
 *   outputTokens: 800,
 *   totalCost: 0.045,
 *   duration: 3500,
 *   cacheEfficiency: 25.5,
 *   operationCount: 5
 * });
 */
export function reportMetrics(
  reporter: StatusReporter,
  metrics: MetricsUpdate,
): void {
  const message = formatMetricsSummary(metrics);
  const update: StatusUpdate = {
    type: 'metrics',
    timestamp: Date.now(),
    message,
    data: metrics as unknown as Record<string, unknown>,
  };
  notifyObservers(reporter, update);
}

// ============================================================================
// Pure Formatting Functions
// ============================================================================

/**
 * Formats a progress update into a human-readable message.
 * Pure function.
 */
function formatProgressMessage(progress: ProgressUpdate): string {
  const parts = [
    `${progress.label}: ${progress.current}/${progress.total} (${progress.percentage.toFixed(1)}%)`,
  ];

  if (progress.eta !== undefined && progress.eta > 0) {
    parts.push(`ETA: ${formatDuration(progress.eta)}`);
  }

  return parts.join(' - ');
}

/**
 * Formats metrics into a single-line summary.
 * Pure function.
 */
function formatMetricsSummary(metrics: MetricsUpdate): string {
  const totalTokens = metrics.inputTokens + metrics.outputTokens;
  return `${formatTokenCountWithSeparators(totalTokens)} tokens | ${
    formatCost(metrics.totalCost)
  } | ${formatDuration(metrics.duration)} | ${metrics.operationCount} ops`;
}

/**
 * Formats metrics data into display lines.
 * Pure function.
 *
 * @param metrics - The metrics to format
 * @returns Array of formatted strings for display
 *
 * @example
 * const lines = formatMetricsDisplay(metrics);
 * // ["Input: 1,500 tokens", "Output: 800 tokens", "Cost: $0.0450", ...]
 */
export function formatMetricsDisplay(metrics: MetricsUpdate): string[] {
  const lines: string[] = [];

  lines.push(`Input: ${formatTokenCountWithSeparators(metrics.inputTokens)} tokens`);
  lines.push(`Output: ${formatTokenCountWithSeparators(metrics.outputTokens)} tokens`);
  lines.push(
    `Total: ${formatTokenCountWithSeparators(metrics.inputTokens + metrics.outputTokens)} tokens`,
  );
  lines.push(`Cost: ${formatCost(metrics.totalCost)}`);
  lines.push(`Duration: ${formatDuration(metrics.duration)}`);
  lines.push(`Operations: ${metrics.operationCount}`);

  if (metrics.cacheEfficiency !== undefined) {
    lines.push(`Cache efficiency: ${metrics.cacheEfficiency.toFixed(1)}%`);
  }

  return lines;
}

/**
 * Formats a progress bar as a string.
 * Pure function.
 *
 * @param progress - The progress information
 * @param width - The width of the bar in characters (default: 30)
 * @returns A formatted progress bar string
 *
 * @example
 * formatProgressBar({ current: 5, total: 10, percentage: 50, label: "Loading" });
 * // "Loading [███████████████░░░░░░░░░░░░░░░] 50.0%"
 */
export function formatProgressBar(
  progress: ProgressUpdate,
  width: number = DEFAULT_PROGRESS_BAR_WIDTH,
): string {
  const filledWidth = Math.round((progress.percentage / 100) * width);
  const emptyWidth = width - filledWidth;

  const filled = PROGRESS_FILLED.repeat(filledWidth);
  const empty = PROGRESS_EMPTY.repeat(emptyWidth);

  const bar = `[${filled}${empty}]`;
  const percentStr = `${progress.percentage.toFixed(1)}%`;

  const parts = [progress.label, bar, percentStr];

  if (progress.eta !== undefined && progress.eta > 0) {
    parts.push(`(${formatDuration(progress.eta)} remaining)`);
  }

  return parts.join(' ');
}

/**
 * Creates a progress update from current/total values.
 * Pure function.
 *
 * @param current - Current progress value
 * @param total - Total value for completion
 * @param label - Label for the progress
 * @param startTime - Optional start time for ETA calculation
 * @returns A ProgressUpdate object
 *
 * @example
 * const progress = createProgressUpdate(5, 10, "Processing");
 * // { current: 5, total: 10, percentage: 50, label: "Processing" }
 */
export function createProgressUpdate(
  current: number,
  total: number,
  label: string,
  startTime?: number,
): ProgressUpdate {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  let eta: number | undefined;
  if (startTime !== undefined && current > 0 && current < total) {
    const elapsed = Date.now() - startTime;
    const rate = current / elapsed;
    const remaining = total - current;
    eta = remaining / rate;
  }

  return {
    current,
    total,
    percentage,
    label,
    eta,
  };
}

/**
 * Creates a metrics update from component values.
 * Pure function.
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param totalCost - Total cost in dollars
 * @param duration - Duration in milliseconds
 * @param operationCount - Number of operations
 * @param cacheEfficiency - Optional cache efficiency percentage
 * @returns A MetricsUpdate object
 */
export function createMetricsUpdate(
  inputTokens: number,
  outputTokens: number,
  totalCost: number,
  duration: number,
  operationCount: number,
  cacheEfficiency?: number,
): MetricsUpdate {
  return {
    inputTokens,
    outputTokens,
    totalCost,
    duration,
    operationCount,
    cacheEfficiency,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a token count with thousand separators.
 * Pure function.
 *
 * Note: This uses locale-based formatting (e.g., "1,500") for display purposes,
 * unlike the compact formatTokenCount in utils/formatting.ts (e.g., "1.5K").
 */
function formatTokenCountWithSeparators(tokens: number): string {
  return tokens.toLocaleString();
}

// Re-export formatDuration from shared utilities for backward compatibility.
// This module previously had its own implementation; now consolidated.
export { formatDuration };

/**
 * Calculates tokens per second rate.
 * Pure function.
 *
 * @param tokens - Number of tokens
 * @param durationMs - Duration in milliseconds
 * @returns Tokens per second
 */
export function calculateTokensPerSecond(
  tokens: number,
  durationMs: number,
): number {
  if (durationMs === 0) return 0;
  return (tokens / durationMs) * 1000;
}

/**
 * Formats a rate as tokens per second.
 * Pure function.
 */
export function formatTokenRate(tokensPerSecond: number): string {
  if (tokensPerSecond >= 1000) {
    return `${(tokensPerSecond / 1000).toFixed(1)}k tok/s`;
  }
  return `${tokensPerSecond.toFixed(0)} tok/s`;
}
