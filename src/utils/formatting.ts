/**
 * @module utils/formatting
 *
 * Shared formatting utilities for displaying human-readable values.
 * All functions are pure with no side effects.
 */

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Formats milliseconds to a human-readable duration string.
 * Pure function.
 *
 * @param ms - Duration in milliseconds
 * @returns Human-readable duration (e.g., "500ms", "1.5s", "2m 30s", "1h 15m 30s")
 *
 * @example
 * formatDuration(500);     // "500ms"
 * formatDuration(1500);    // "1.5s"
 * formatDuration(65000);   // "1m 5s"
 * formatDuration(3661000); // "1h 1m 1s"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) {
    return '0ms';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  // Show decimal for seconds under a minute
  return `${totalSeconds.toFixed(1)}s`;
}

// ============================================================================
// Token Count Formatting
// ============================================================================

/**
 * Formats token count with K/M suffix for readability.
 * Pure function.
 *
 * @param tokens - Number of tokens
 * @returns Formatted string with suffix (e.g., "500", "1.5K", "2.3M")
 *
 * @example
 * formatTokenCount(500);       // "500"
 * formatTokenCount(1500);      // "1.5K"
 * formatTokenCount(2300000);   // "2.3M"
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 0) {
    return '0';
  }

  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return String(Math.round(tokens));
}

// ============================================================================
// Byte Size Formatting
// ============================================================================

/**
 * Formats byte sizes to human-readable format.
 * Pure function.
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "500B", "1.5KB", "2.3MB", "1.2GB")
 *
 * @example
 * formatBytes(500);        // "500B"
 * formatBytes(1536);       // "1.5KB"
 * formatBytes(2359296);    // "2.3MB"
 * formatBytes(1288490189); // "1.2GB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) {
    return '0B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)}B`;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

// ============================================================================
// Percentage Formatting
// ============================================================================

/**
 * Formats a decimal value as a percentage string.
 * Pure function.
 *
 * @param value - Decimal value (e.g., 0.5 for 50%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "50.0%")
 *
 * @example
 * formatPercentage(0.5);      // "50.0%"
 * formatPercentage(0.1234);   // "12.3%"
 * formatPercentage(0.1234, 2); // "12.34%"
 * formatPercentage(1.5);      // "150.0%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) {
    return '0.0%';
  }

  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}
