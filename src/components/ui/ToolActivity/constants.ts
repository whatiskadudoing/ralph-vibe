/**
 * @module components/ui/ToolActivity/constants
 *
 * Constants and configuration for ToolActivity components.
 */

import { colors } from '../theme.ts';
import type { ToolStatus } from './types.ts';

// ============================================================================
// Tool Icons and Colors
// ============================================================================

/** Minimalist tool icons - vibrant, consistent color scheme */
export const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  Read: { icon: '\u25CB', color: colors.info }, // Blue for read operations
  Write: { icon: '+', color: colors.success }, // Green for write
  Edit: { icon: '~', color: colors.accent }, // Orange for edit
  Bash: { icon: '$', color: colors.accent }, // Orange for commands
  Glob: { icon: '\u25CB', color: colors.info }, // Blue for search
  Grep: { icon: '\u25CB', color: colors.info }, // Blue for search
  Task: { icon: '\u25CF', color: colors.accent }, // Orange for tasks
  WebFetch: { icon: '\u2197', color: colors.cyan }, // Cyan for web
  WebSearch: { icon: '\u25CE', color: colors.cyan }, // Cyan for web
  NotebookEdit: { icon: '\u25A1', color: colors.magenta }, // Magenta for notebooks
  TodoRead: { icon: '\u2610', color: colors.info },
  TodoWrite: { icon: '\u2611', color: colors.success },
};

/** Status indicators */
export const STATUS_INDICATORS: Record<ToolStatus, { char: string; color: string }> = {
  pending: { char: '\u25CB', color: colors.dim },
  running: { char: '\u25CF', color: colors.accent },
  success: { char: '\u2713', color: colors.success },
  error: { char: '\u2717', color: colors.error },
};

/** Spinner frames for running status */
export const SPINNER_FRAMES = [
  '\u280B',
  '\u2819',
  '\u2839',
  '\u2838',
  '\u283C',
  '\u2834',
  '\u2826',
  '\u2827',
  '\u2807',
  '\u280F',
];

/** Colors for animated dots - vibrant cycling colors */
export const DOT_COLORS = [
  colors.accent, // orange
  colors.success, // green
  colors.cyan, // cyan
  colors.magenta, // magenta
];

// ============================================================================
// Layout Constants
// ============================================================================

/** Column widths */
export const COL_ICON = 2;
export const COL_TOOL_NAME = 10;
export const COL_TIMING = 7;
export const COL_STATUS = 3;
export const COL_RESULT_MIN = 12;

/** Tree connector characters */
export const TREE_BRANCH = '\u251C\u2500';
export const TREE_LAST = '\u2514\u2500';

/** Nested indent width */
export const NESTED_INDENT = 4;

/** Model badge colors */
export const MODEL_COLORS: Record<string, string> = {
  opus: colors.accent,
  sonnet: colors.info,
  haiku: colors.success,
};
