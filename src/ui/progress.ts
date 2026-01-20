/**
 * @module ui/progress
 *
 * Progress bar and task list display utilities.
 */

import { muted, primary, success, warning } from './colors.ts';
import { ARROW_RIGHT, CHECK, CIRCLE_EMPTY } from './symbols.ts';

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
 * @deprecated Use `progressBar` from `./symbols.ts` instead for simpler API.
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
