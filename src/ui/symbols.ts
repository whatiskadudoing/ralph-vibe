/**
 * @module ui/symbols
 *
 * Unicode symbols for terminal UI.
 * Provides both fancy (Unicode) and fallback (ASCII) versions.
 */

import { supportsUnicode } from './capabilities.ts';

const UNICODE = supportsUnicode();

// ============================================================================
// Status Symbols
// ============================================================================

/** Checkmark for completed/success. */
export const CHECK = UNICODE ? '✓' : '+';

/** X mark for failed/error. */
export const CROSS = UNICODE ? '✗' : 'x';

/** Warning triangle. */
export const WARNING = UNICODE ? '⚠' : '!';

/** Info circle. */
export const INFO = UNICODE ? 'ℹ' : 'i';

/** Question mark for prompts. */
export const QUESTION = UNICODE ? '?' : '?';

// ============================================================================
// Progress Symbols
// ============================================================================

/** Filled circle (for active/current). */
export const CIRCLE_FILLED = UNICODE ? '●' : '*';

/** Empty circle (for inactive/pending). */
export const CIRCLE_EMPTY = UNICODE ? '○' : 'o';

/** Half-filled circle (for partial). */
export const CIRCLE_HALF = UNICODE ? '◐' : '@';

/** Play/arrow for current item. */
export const ARROW_RIGHT = UNICODE ? '▶' : '>';

/** Bullet point. */
export const BULLET = UNICODE ? '•' : '-';

// ============================================================================
// Spinner Frames
// ============================================================================

/** Dots spinner animation frames. */
export const SPINNER_DOTS: readonly string[] = UNICODE
  ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  : ['|', '/', '-', '\\'];

/** Line spinner animation frames. */
export const SPINNER_LINE: readonly string[] = ['|', '/', '-', '\\'];

/** Bouncing bar animation frames. */
export const SPINNER_BOUNCE: readonly string[] = UNICODE
  ? ['⠁', '⠂', '⠄', '⠂']
  : ['.', 'o', 'O', 'o'];

// ============================================================================
// Box Drawing
// ============================================================================

export const BOX = UNICODE
  ? {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    teeRight: '├',
    teeLeft: '┤',
    teeDown: '┬',
    teeUp: '┴',
  }
  : {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    cross: '+',
    teeRight: '+',
    teeLeft: '+',
    teeDown: '+',
    teeUp: '+',
  };

export const BOX_DOUBLE = UNICODE
  ? {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  }
  : BOX;

export const BOX_ROUNDED = UNICODE
  ? {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  }
  : BOX;

// ============================================================================
// Formatted Status Strings
// ============================================================================

import { error, info, muted, success, warning } from './colors.ts';

/** Green checkmark. */
export const checkMark = success(CHECK);

/** Red X mark. */
export const crossMark = error(CROSS);

/** Yellow warning. */
export const warningMark = warning(WARNING);

/** Blue info. */
export const infoMark = info(INFO);

/** Gray bullet. */
export const bullet = muted(BULLET);

/** Cyan arrow. */
export const arrow = info(ARROW_RIGHT);

// ============================================================================
// Progress Bar
// ============================================================================

/** Progress bar characters. */
export const PROGRESS_BAR = UNICODE ? { filled: '█', empty: '░' } : { filled: '#', empty: '-' };

/**
 * Creates a progress bar string.
 * @param percent - Percentage (0-100)
 * @param width - Total width of the bar (default 10)
 * @param label - Optional label after the bar
 */
export function progressBar(percent: number, width?: number, label?: string): string {
  width = width ?? 10;
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;

  const bar = PROGRESS_BAR.filled.repeat(filled) + PROGRESS_BAR.empty.repeat(empty);
  const pct = `${Math.round(clamped)}%`;

  if (label) {
    return `${bar} ${pct} ${label}`;
  }
  return `${bar} ${pct}`;
}
