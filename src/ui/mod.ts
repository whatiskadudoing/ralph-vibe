/**
 * @module ui
 *
 * Terminal UI components for beautiful CLI output.
 * All display functions are pure - they return strings, not print directly.
 *
 * ## Core Components
 *
 * - `theme` - Semantic color theme
 * - `format` - Formatting utilities (duration, tokens, bytes, etc.)
 * - `createBox` - Enhanced box with title-in-border, nesting, etc.
 * - `progressBar` - Progress bar with thresholds and colors
 * - `status` - Status indicators (success, error, warning, etc.)
 * - `list` - Formatted lists (bullet, numbered, checkbox, arrow)
 * - `statsLine` - Horizontal stats with separators
 * - `badge` / `modelBadge` - Inline indicators
 * - `divider` - Section separators
 * - `table` - Aligned column data display
 * - `gradient` - Multi-color text effects
 * - `createSpinner` - Animated loading indicators
 *
 * ## Usage
 *
 * ```typescript
 * import { createBox, progressBar, status, list, theme } from '@/ui/mod.ts';
 *
 * // Create a box with title
 * const box = createBox({
 *   title: 'Status',
 *   content: 'Everything is working',
 *   border: 'rounded',
 *   borderColor: theme.border.success
 * });
 *
 * // Create a progress bar
 * const progress = progressBar({ percent: 42, width: 20, color: theme.progress.fiveHour });
 *
 * // Create a status indicator
 * const statusText = status({ type: 'success', text: 'Build completed' });
 *
 * // Create a list
 * const taskList = list({
 *   items: [
 *     { text: 'Build', status: 'completed' },
 *     { text: 'Test', status: 'running' },
 *     { text: 'Deploy', status: 'pending' }
 *   ]
 * });
 * ```
 */

// Core infrastructure
export * from './capabilities.ts';
export {
  // Basic colors
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  brightRed,
  brightGreen,
  brightYellow,
  brightBlue,
  brightMagenta,
  brightCyan,
  brightWhite,
  // Semantic colors
  primary,
  success,
  warning,
  error,
  muted,
  info,
  orange,
  amber,
  // Styles
  bold,
  dim,
  italic,
  underline,
  strikethrough,
  // Combined styles
  headerPrimary,
  headerSuccess,
  headerError,
  headerWarning,
  hint,
  // Utilities
  stripAnsi,
  visibleLength,
  colorize,
  // Note: supportsColor is exported from capabilities.ts
} from './colors.ts';
export {
  // Status symbols
  CHECK,
  CROSS,
  WARNING,
  INFO,
  QUESTION,
  // Progress symbols
  CIRCLE_FILLED,
  CIRCLE_EMPTY,
  CIRCLE_HALF,
  ARROW_RIGHT,
  BULLET,
  // Spinner frames
  SPINNER_DOTS,
  SPINNER_LINE,
  SPINNER_BOUNCE,
  // Box drawing
  BOX,
  BOX_DOUBLE,
  BOX_ROUNDED,
  // Formatted status strings
  checkMark,
  crossMark,
  warningMark,
  infoMark,
  bullet,
  arrow,
  // Progress bar chars (but not progressBar function - that comes from progress.ts)
  PROGRESS_BAR,
} from './symbols.ts';

// Theme and formatting
export * from './theme.ts';
export * from './format.ts';

// UI components (ColorFn is re-exported from theme.ts)
export {
  createBox,
  createLine,
  type BoxConfig,
  type BoxOptions,
  type BoxStyle,
  type Spacing,
} from './box.ts';

// Progress bar (progressBar function from here, not from symbols.ts)
export {
  progressBar,
  createProgressBar,
  formatTask,
  createTaskList,
  createTaskSummary,
  createNumberedList,
  createBulletList,
  type ProgressBarConfig,
  type ProgressBarOptions,
  type TaskItem,
} from './progress.ts';

export * from './status.ts';
export * from './list.ts';
export * from './stats.ts';
export * from './badge.ts';
export * from './divider.ts';
export * from './table.ts';
export * from './gradient.ts';
export * from './spinner.ts';

// High-level components
export * from './banner.ts';
export * from './claude_renderer.ts';
export * from './components.ts';
