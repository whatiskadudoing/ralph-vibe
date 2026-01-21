/**
 * @module ui/progress
 *
 * Progress bar and task list display utilities.
 */

import { dim, muted, primary, success, warning, visibleLength } from './colors.ts';
import { ARROW_RIGHT, CHECK, CIRCLE_EMPTY, PROGRESS_BAR } from './symbols.ts';
import { theme, type ColorFn } from './theme.ts';

// ============================================================================
// Progress Bar Component
// ============================================================================

export interface ProgressBarConfig {
  /** Percentage complete (0-100) */
  readonly percent: number;
  /** Character width of the bar */
  readonly width?: number;

  /** Character for filled portion. Default: '█' */
  readonly filled?: string;
  /** Character for empty portion. Default: '░' */
  readonly empty?: string;
  /** Color for filled portion */
  readonly color?: ColorFn;
  /** Color for empty portion (default: dim) */
  readonly emptyColor?: ColorFn;

  /** Show percentage after bar */
  readonly showPercent?: boolean;
  /** Custom label after bar */
  readonly label?: string;
  /** Position of label */
  readonly labelPosition?: 'right' | 'left';

  /** Auto-color thresholds */
  readonly thresholds?: {
    /** Percentage at which to use warning color (yellow) */
    readonly warning?: number;
    /** Percentage at which to use danger color (red) */
    readonly danger?: number;
  };
}

/**
 * Creates a progress bar string.
 * Enhanced version with full configuration support.
 *
 * @example
 * progressBar({ percent: 42, width: 20, color: amber });
 * // ████████░░░░░░░░░░░░ 42%
 *
 * @example
 * progressBar({ percent: 95, thresholds: { warning: 70, danger: 90 } });
 * // ███████████████████░ 95%  (auto-red because > 90)
 */
export function progressBar(config: ProgressBarConfig | number, width?: number, label?: string): string {
  // Support legacy call signature: progressBar(percent, width?, label?)
  if (typeof config === 'number') {
    return legacyProgressBar(config, width, label);
  }

  const {
    percent,
    width: barWidth = 20,
    filled = PROGRESS_BAR.filled,
    empty = PROGRESS_BAR.empty,
    color: providedColor,
    emptyColor = dim,
    showPercent = true,
    label: barLabel,
    labelPosition = 'right',
    thresholds,
  } = config;

  // Clamp percentage
  const clamped = Math.max(0, Math.min(100, percent));

  // Determine color based on thresholds
  let color = providedColor ?? theme.progress.default;
  if (thresholds && !providedColor) {
    if (thresholds.danger !== undefined && clamped >= thresholds.danger) {
      color = theme.progress.danger;
    } else if (thresholds.warning !== undefined && clamped >= thresholds.warning) {
      color = theme.progress.warning;
    }
  }

  // Calculate filled/empty portions
  const filledCount = Math.round((clamped / 100) * barWidth);
  const emptyCount = barWidth - filledCount;

  // Build the bar
  const bar = color(filled.repeat(filledCount)) + emptyColor(empty.repeat(emptyCount));

  // Build percentage string
  const percentStr = showPercent ? ` ${Math.round(clamped)}%` : '';

  // Build label
  const labelStr = barLabel ? ` ${barLabel}` : '';

  // Assemble based on label position
  if (labelPosition === 'left' && barLabel) {
    return `${barLabel}  ${bar}${percentStr}`;
  }

  return `${bar}${percentStr}${labelStr}`;
}

/**
 * Legacy progress bar function for backward compatibility.
 */
function legacyProgressBar(percent: number, width?: number, label?: string): string {
  const barWidth = width ?? 10;
  const clamped = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((clamped / 100) * barWidth);
  const emptyCount = barWidth - filledCount;

  const bar = PROGRESS_BAR.filled.repeat(filledCount) + PROGRESS_BAR.empty.repeat(emptyCount);
  const pct = `${Math.round(clamped)}%`;

  if (label) {
    return `${bar} ${pct} ${label}`;
  }
  return `${bar} ${pct}`;
}

// ============================================================================
// Legacy Progress Bar (deprecated)
// ============================================================================

export interface ProgressBarOptions {
  /** Total width of the bar in characters. Default: 40. */
  readonly width?: number;
  /** Character for completed portion. Default: '█'. */
  readonly completeChar?: string;
  /** Character for incomplete portion. Default: '░'. */
  readonly incompleteChar?: string;
  /** Whether to show percentage. Default: true. */
  readonly showPercent?: boolean;
}

const DEFAULT_PROGRESS_OPTIONS: Required<ProgressBarOptions> = {
  width: 40,
  completeChar: '█',
  incompleteChar: '░',
  showPercent: true,
};

/**
 * Creates a progress bar string.
 * Pure function - returns the progress bar as a string.
 *
 * @deprecated Use `progressBar` with ProgressBarConfig instead.
 * This function may be removed in a future version.
 *
 * @param current - Current value
 * @param total - Total value
 * @param options - Display options
 */
export function createProgressBar(
  current: number,
  total: number,
  options: ProgressBarOptions = {},
): string {
  const opts = { ...DEFAULT_PROGRESS_OPTIONS, ...options };

  const percent = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const completed = Math.round(opts.width * percent);
  const remaining = opts.width - completed;

  const bar = primary(opts.completeChar.repeat(completed)) +
    muted(opts.incompleteChar.repeat(remaining));

  if (opts.showPercent) {
    const percentText = `${Math.round(percent * 100)}%`.padStart(4);
    return `${bar} ${muted(percentText)}`;
  }

  return bar;
}

// ============================================================================
// Task List Components
// ============================================================================

export interface TaskItem {
  /** Task text/description. */
  readonly text: string;
  /** Task status. */
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Formats a single task item for display.
 */
export function formatTask(task: TaskItem): string {
  switch (task.status) {
    case 'completed':
      return `  ${success(CHECK)} ${task.text}`;
    case 'in_progress':
      return `  ${primary(ARROW_RIGHT)} ${primary(task.text)}`;
    case 'failed':
      return `  ${warning('✗')} ${warning(task.text)}`;
    case 'pending':
    default:
      return `  ${muted(CIRCLE_EMPTY)} ${muted(task.text)}`;
  }
}

/**
 * Creates a task list display.
 * Pure function - returns the formatted list as a string.
 */
export function createTaskList(tasks: readonly TaskItem[]): string {
  return tasks.map(formatTask).join('\n');
}

/**
 * Creates a summary line for task progress.
 * Example: "Completed: 5/10 tasks (50%)"
 */
export function createTaskSummary(completed: number, total: number): string {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return `Completed: ${primary(`${completed}/${total}`)} tasks ${muted(`(${percent}%)`)}`;
}

/**
 * Formats a numbered list.
 */
export function createNumberedList(items: readonly string[], startAt = 1): string {
  return items.map((item, i) => `  ${muted(`${i + startAt}.`)} ${item}`).join('\n');
}

/**
 * Formats a bulleted list.
 */
export function createBulletList(items: readonly string[]): string {
  return items.map((item) => `  ${muted('•')} ${item}`).join('\n');
}
