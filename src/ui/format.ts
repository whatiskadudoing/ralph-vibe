/**
 * @module ui/format
 *
 * Formatting utilities for consistent display of values.
 */

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "45s", "2m 34s", "1h 23m"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Formats a token count to a human-readable string.
 * Examples: "1.2K", "45.6K", "1.2M"
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${millions.toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return `${thousands.toFixed(1)}K`;
  }

  return String(tokens);
}

/**
 * Formats a byte count to a human-readable string.
 * Examples: "1.2 KB", "45.6 MB", "1.2 GB"
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${size} ${units[unitIndex]}`;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Formats a number with thousands separators.
 * Examples: "1,234", "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Formats a percentage with optional decimal places.
 * Examples: "42%", "42.5%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a cost in dollars.
 * Examples: "$0.05", "$1.23", "$12.34"
 */
export function formatCost(dollars: number): string {
  if (dollars < 0.01) {
    return `$${dollars.toFixed(4)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

/**
 * Truncates a string to a maximum length, adding ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength - 1)}…`;
}

/**
 * Pads a string to a minimum length.
 */
export function pad(str: string, length: number, position: 'left' | 'right' = 'right'): string {
  if (str.length >= length) {
    return str;
  }
  const padding = ' '.repeat(length - str.length);
  return position === 'left' ? `${padding}${str}` : `${str}${padding}`;
}

/**
 * Centers a string within a given width.
 */
export function center(str: string, width: number): string {
  if (str.length >= width) {
    return str;
  }
  const totalPadding = width - str.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return ' '.repeat(leftPadding) + str + ' '.repeat(rightPadding);
}

/**
 * Formats a relative time from now.
 * Examples: "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 30) {
    return `${diffDay}d ago`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}
