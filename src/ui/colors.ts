/**
 * @module ui/colors
 *
 * ANSI color functions for terminal output.
 * All functions are pure - they take a string and return a colored string.
 *
 * Color Palette:
 * - Primary (Cyan): Main brand color, used for headers and emphasis
 * - Success (Green): Completed tasks, success messages
 * - Warning (Yellow): Warnings, pending items
 * - Error (Red): Errors, failures
 * - Muted (Gray): Secondary text, hints
 */

// ANSI escape codes
const ESC = '\x1b[';
const RESET = `${ESC}0m`;

// Foreground colors (30-37, 90-97 for bright)
const FG_BLACK = `${ESC}30m`;
const FG_RED = `${ESC}31m`;
const FG_GREEN = `${ESC}32m`;
const FG_YELLOW = `${ESC}33m`;
const FG_BLUE = `${ESC}34m`;
const FG_MAGENTA = `${ESC}35m`;
const FG_CYAN = `${ESC}36m`;
const FG_WHITE = `${ESC}37m`;
const FG_GRAY = `${ESC}90m`;
const FG_BRIGHT_RED = `${ESC}91m`;
const FG_BRIGHT_GREEN = `${ESC}92m`;
const FG_BRIGHT_YELLOW = `${ESC}93m`;
const FG_BRIGHT_BLUE = `${ESC}94m`;
const FG_BRIGHT_MAGENTA = `${ESC}95m`;
const FG_BRIGHT_CYAN = `${ESC}96m`;
const FG_BRIGHT_WHITE = `${ESC}97m`;

// 256-color mode for orange/amber
const FG_ORANGE = `${ESC}38;5;214m`; // Bright orange
const FG_AMBER = `${ESC}38;5;208m`; // Amber/gold
const _FG_DARK_ORANGE = `${ESC}38;5;166m`; // Darker orange (unused, kept for future)

// Text styles
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;
const STRIKETHROUGH = `${ESC}9m`;

/**
 * Creates a color function that wraps text with ANSI codes.
 */
function createColorFn(code: string): (text: string) => string {
  return (text: string): string => `${code}${text}${RESET}`;
}

/**
 * Combines multiple style codes into a single function.
 */
function createStyleFn(...codes: string[]): (text: string) => string {
  const combined = codes.join('');
  return (text: string): string => `${combined}${text}${RESET}`;
}

// ============================================================================
// Brand Colors (Semantic)
// ============================================================================

/** Primary brand color - Cyan. Use for headers, emphasis. */
export const primary = createColorFn(FG_BRIGHT_CYAN);

/** Success color - Green. Use for completed tasks, success messages. */
export const success = createColorFn(FG_BRIGHT_GREEN);

/** Warning color - Yellow. Use for warnings, pending items. */
export const warning = createColorFn(FG_BRIGHT_YELLOW);

/** Error color - Red. Use for errors, failures. */
export const error = createColorFn(FG_BRIGHT_RED);

/** Muted color - Gray. Use for secondary text, hints. */
export const muted = createColorFn(FG_GRAY);

/** Info color - Blue. Use for informational messages. */
export const info = createColorFn(FG_BRIGHT_BLUE);

/** Orange color - For highlights, active items. */
export const orange = createColorFn(FG_ORANGE);

/** Amber/gold color - For accents, emphasis. */
export const amber = createColorFn(FG_AMBER);

// ============================================================================
// Basic Colors
// ============================================================================

export const black = createColorFn(FG_BLACK);
export const red = createColorFn(FG_RED);
export const green = createColorFn(FG_GREEN);
export const yellow = createColorFn(FG_YELLOW);
export const blue = createColorFn(FG_BLUE);
export const magenta = createColorFn(FG_MAGENTA);
export const cyan = createColorFn(FG_CYAN);
export const white = createColorFn(FG_WHITE);
export const gray = createColorFn(FG_GRAY);

// Bright variants
export const brightRed = createColorFn(FG_BRIGHT_RED);
export const brightGreen = createColorFn(FG_BRIGHT_GREEN);
export const brightYellow = createColorFn(FG_BRIGHT_YELLOW);
export const brightBlue = createColorFn(FG_BRIGHT_BLUE);
export const brightMagenta = createColorFn(FG_BRIGHT_MAGENTA);
export const brightCyan = createColorFn(FG_BRIGHT_CYAN);
export const brightWhite = createColorFn(FG_BRIGHT_WHITE);

// ============================================================================
// Text Styles
// ============================================================================

/** Makes text bold. */
export const bold = createColorFn(BOLD);

/** Makes text dim/faint. */
export const dim = createColorFn(DIM);

/** Makes text italic. */
export const italic = createColorFn(ITALIC);

/** Underlines text. */
export const underline = createColorFn(UNDERLINE);

/** Strikes through text. */
export const strikethrough = createColorFn(STRIKETHROUGH);

// ============================================================================
// Combined Styles
// ============================================================================

/** Bold primary - for main headers. */
export const headerPrimary = createStyleFn(BOLD, FG_BRIGHT_CYAN);

/** Bold success - for important success messages. */
export const headerSuccess = createStyleFn(BOLD, FG_BRIGHT_GREEN);

/** Bold error - for important error messages. */
export const headerError = createStyleFn(BOLD, FG_BRIGHT_RED);

/** Bold warning - for important warnings. */
export const headerWarning = createStyleFn(BOLD, FG_BRIGHT_YELLOW);

/** Dim italic - for hints and secondary info. */
export const hint = createStyleFn(DIM, ITALIC);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Strips all ANSI codes from a string.
 * Useful for getting the actual display length.
 */
export function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Gets the visible length of a string (excluding ANSI codes).
 */
export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Checks if the terminal supports colors.
 * Returns false if NO_COLOR env var is set or not a TTY.
 */
export function supportsColor(): boolean {
  // Respect NO_COLOR convention: https://no-color.org/
  if (Deno.env.get('NO_COLOR') !== undefined) {
    return false;
  }

  // Check if stdout is a TTY
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/**
 * Conditionally applies color only if terminal supports it.
 */
export function colorize(colorFn: (s: string) => string, text: string): string {
  return supportsColor() ? colorFn(text) : text;
}
