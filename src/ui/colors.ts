/**
 * @module ui/colors
 *
 * ANSI color functions for terminal output, based on a modern palette.
 * All functions are pure - they take a string and return a colored string.
 */

import { palette } from './palette.ts';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;
const STRIKETHROUGH = `${ESC}9m`;

// Helper function to convert a hex color to the nearest ANSI 256 color code.
function hexToAnsi256(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r === g && g === b) {
    if (r < 8) return '16';
    if (r > 248) return '231';
    return String(Math.round(((r - 8) / 247) * 24) + 232);
  }

  const ansi = 16 +
    (36 * Math.round(r / 255 * 5)) +
    (6 * Math.round(g / 255 * 5)) +
    Math.round(b / 255 * 5);

  return String(ansi);
}

function createColorFn(hex: string): (text: string) => string {
  const code = `${ESC}38;5;${hexToAnsi256(hex)}m`;
  return (text: string): string => `${code}${text}${RESET}`;
}

function createStyleFn(...codes: string[]): (text: string) => string {
  const combined = codes.join('');
  return (text: string): string => `${combined}${text}${RESET}`;
}

// ============================================================================
// Theme Colors from Palette
// ============================================================================
export const primary = createColorFn(palette.primary.base);
export const success = createColorFn(palette.success);
export const warning = createColorFn(palette.warning);
export const error = createColorFn(palette.error);
export const info = createColorFn(palette.info);

// Text
export const text = {
  primary: createColorFn(palette.gray.lightest),
  secondary: createColorFn(palette.gray.base),
  muted: createColorFn(palette.gray.dark),
  accent: createColorFn(palette.primary.light),
};

export const muted = text.muted; // Export muted directly

// Accents
export const accent = {
  orange: createColorFn(palette.accent.orange),
  yellow: createColorFn(palette.accent.yellow),
  green: createColorFn(palette.accent.green),
  purple: createColorFn(palette.accent.purple),
};

// Grays
export const gray = {
  black: createColorFn(palette.gray.black),
  darkest: createColorFn(palette.gray.darkest),
  dark: createColorFn(palette.gray.dark),
  base: createColorFn(palette.gray.base),
  light: createColorFn(palette.gray.light),
  lightest: createColorFn(palette.gray.lightest),
  white: createColorFn(palette.gray.white),
};

// Original basic colors, now mapped to the new palette for compatibility
export const red = error;
export const green = success;
export const yellow = warning;
export const blue = primary;
export const magenta = accent.purple;
export const cyan = createColorFn(palette.primary.light);
export const white = gray.white;

// For compatibility with the old theme structure
export const dim = createColorFn(palette.gray.dark);
export const amber = accent.yellow;
export const orange = accent.orange;

// ============================================================================
// Text Styles
// ============================================================================
export const bold = (text: string): string => `${BOLD}${text}${RESET}`;
export const italic = (text: string): string => `${ITALIC}${text}${RESET}`;
export const underline = (text: string): string => `${UNDERLINE}${text}${RESET}`;
export const strikethrough = (text: string): string => `${STRIKETHROUGH}${text}${RESET}`;

// ============================================================================
// Utility Functions
// ============================================================================
export function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

// Keep supportsColor and colorize for robustness, though they are not in the provided snippet
import { supportsColor as checkSupportsColor } from './capabilities.ts';

export function supportsColor(): boolean {
  return checkSupportsColor();
}

export function colorize(colorFn: (s: string) => string, text: string): string {
  return supportsColor() ? colorFn(text) : text;
}
