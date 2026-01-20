/**
 * @module ui/capabilities
 *
 * Unified terminal capabilities detection.
 * Provides a single source of truth for terminal features.
 */

/**
 * Color support level.
 * - 'none': No color support (NO_COLOR set or non-TTY)
 * - '16': Basic ANSI colors (16 colors)
 * - '256': Extended colors (256 colors)
 * - 'truecolor': Full 24-bit color support
 */
export type ColorLevel = 'none' | '16' | '256' | 'truecolor';

/**
 * Terminal capabilities interface.
 */
export interface TerminalCapabilities {
  /** Whether the terminal supports any colors. */
  readonly supportsColor: boolean;
  /** Color support level. */
  readonly colorLevel: ColorLevel;
  /** Whether the terminal supports Unicode characters. */
  readonly supportsUnicode: boolean;
  /** Terminal width in columns. */
  readonly width: number;
  /** Terminal height in rows. */
  readonly height: number;
  /** Whether stdout is a TTY. */
  readonly isTTY: boolean;
}

/**
 * Cached capabilities instance.
 */
let cachedCapabilities: TerminalCapabilities | null = null;

/**
 * Detects the color level supported by the terminal.
 */
function detectColorLevel(): ColorLevel {
  // Respect NO_COLOR convention: https://no-color.org/
  if (Deno.env.get('NO_COLOR') !== undefined) {
    return 'none';
  }

  // Check if stdout is a TTY
  let isTTY = false;
  try {
    isTTY = Deno.stdout.isTerminal();
  } catch {
    // Not a TTY
  }

  if (!isTTY) {
    return 'none';
  }

  // Check for true color support
  const colorTerm = Deno.env.get('COLORTERM')?.toLowerCase() ?? '';
  if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    return 'truecolor';
  }

  // Check for 256 color support
  const term = Deno.env.get('TERM') ?? '';
  if (term.includes('256color') || term.includes('256')) {
    return '256';
  }

  // Windows Terminal and modern terminals support at least 256 colors
  if (Deno.env.get('WT_SESSION') || Deno.env.get('ConEmuANSI')) {
    return '256';
  }

  // Most modern terminals support at least 16 colors
  if (term.includes('xterm') || term.includes('screen') || term.includes('vt100')) {
    return '16';
  }

  // Default to basic color support for TTYs
  return '16';
}

/**
 * Detects if the terminal supports Unicode characters.
 */
function detectUnicodeSupport(): boolean {
  // Windows cmd.exe doesn't support Unicode well
  if (Deno.build.os === 'windows') {
    // Windows Terminal and PowerShell support Unicode
    const term = Deno.env.get('WT_SESSION') || Deno.env.get('ConEmuANSI');
    return term !== undefined;
  }

  // Most Unix terminals support Unicode if LANG contains UTF
  const lang = Deno.env.get('LANG') || '';
  if (lang.includes('UTF') || lang.includes('utf')) {
    return true;
  }

  // LC_ALL and LC_CTYPE can also indicate UTF-8 support
  const lcAll = Deno.env.get('LC_ALL') || '';
  const lcCtype = Deno.env.get('LC_CTYPE') || '';
  if (
    lcAll.includes('UTF') || lcAll.includes('utf') ||
    lcCtype.includes('UTF') || lcCtype.includes('utf')
  ) {
    return true;
  }

  // Most modern terminals support Unicode by default
  // Be optimistic for non-Windows (we already returned early for Windows above)
  return true;
}

/**
 * Gets terminal dimensions.
 */
function getTerminalSize(): { width: number; height: number } {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { width: columns, height: rows };
  } catch {
    // Default fallback for non-TTY environments
    return { width: 80, height: 24 };
  }
}

/**
 * Checks if stdout is a TTY.
 */
function checkIsTTY(): boolean {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/**
 * Detects terminal capabilities.
 */
function detectCapabilities(): TerminalCapabilities {
  const colorLevel = detectColorLevel();
  const { width, height } = getTerminalSize();
  const isTTY = checkIsTTY();

  return {
    supportsColor: colorLevel !== 'none',
    colorLevel,
    supportsUnicode: detectUnicodeSupport(),
    width,
    height,
    isTTY,
  };
}

/**
 * Gets the current terminal capabilities.
 * Caches the result for performance.
 */
export function getCapabilities(): TerminalCapabilities {
  if (cachedCapabilities === null) {
    cachedCapabilities = detectCapabilities();
  }
  return cachedCapabilities;
}

/**
 * Refreshes cached capabilities.
 * Call this when the terminal environment may have changed
 * (e.g., after window resize).
 */
export function refreshCapabilities(): TerminalCapabilities {
  cachedCapabilities = detectCapabilities();
  return cachedCapabilities;
}

/**
 * Gets just the terminal dimensions (always fresh, for resize handling).
 */
export function getTerminalDimensions(): { width: number; height: number } {
  return getTerminalSize();
}

/**
 * Checks if color is supported (convenience function).
 */
export function supportsColor(): boolean {
  return getCapabilities().supportsColor;
}

/**
 * Checks if Unicode is supported (convenience function).
 */
export function supportsUnicode(): boolean {
  return getCapabilities().supportsUnicode;
}
