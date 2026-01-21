/**
 * @module ui/theme
 *
 * Semantic color theme for Ralph CLI.
 * All components use this theme for consistent styling.
 */

import {
  amber,
  blue,
  cyan,
  dim,
  gray,
  green,
  orange,
  red,
  white,
  yellow,
} from './colors.ts';

/**
 * The semantic theme used by all UI components.
 */
export const theme = {
  /** Text colors for different contexts */
  text: {
    primary: white,
    secondary: dim,
    accent: cyan,
    muted: gray,
  },

  /** Status colors for different states */
  status: {
    success: green,
    error: red,
    warning: yellow,
    info: blue,
    pending: gray,
    running: cyan,
  },

  /** Model-specific colors for Claude models */
  models: {
    opus: amber,
    sonnet: cyan,
    haiku: dim,
  },

  /** Progress bar colors */
  progress: {
    fiveHour: amber,
    sevenDay: dim,
    default: cyan,
    warning: yellow,
    danger: red,
  },

  /** Border colors for different box states */
  border: {
    default: dim,
    active: amber,
    success: green,
    error: red,
    info: cyan,
    warning: yellow,
  },

  /** Accent colors for highlights */
  accent: {
    primary: orange,
    secondary: amber,
    tertiary: cyan,
  },
} as const;

/** Type for color functions */
export type ColorFn = (text: string) => string;

/** Type-safe access to theme colors */
export type Theme = typeof theme;
