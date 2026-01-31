/**
 * @module ui/theme
 *
 * Semantic color theme for Ralph CLI, using the new color palette.
 * All components use this theme for consistent styling.
 */

import * as colors from './colors.ts';

/**
 * The semantic theme used by all UI components.
 */
export const theme = {
  /** Text colors for different contexts */
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    accent: colors.text.accent,
    muted: colors.text.muted,
  },

  /** Status colors for different states */
  status: {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    pending: colors.gray.base,
    running: colors.cyan,
  },

  /** Model-specific colors (example) */
  models: {
    opus: colors.accent.orange,
    sonnet: colors.primary,
    haiku: colors.accent.green,
  },

  /** Progress bar colors */
  progress: {
    default: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.error,
  },

  /** Border colors for different box states */
  border: {
    default: colors.gray.dark,
    active: colors.accent.orange,
    success: colors.success,
    error: colors.error,
    info: colors.info,
    warning: colors.warning,
  },

  /** Accent colors for highlights */
  accent: {
    primary: colors.accent.orange,
    secondary: colors.accent.yellow,
    tertiary: colors.accent.purple,
  },
} as const;

/** Type for color functions */
export type ColorFn = (text: string) => string;

/** Type-safe access to theme colors */
export type Theme = typeof theme;
