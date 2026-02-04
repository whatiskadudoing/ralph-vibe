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
  amber,
  // Basic colors
  black,
  blue,
  // Styles
  bold,
  brightBlue,
  brightCyan,
  brightGreen,
  brightMagenta,
  brightRed,
  brightWhite,
  brightYellow,
  colorize,
  cyan,
  dim,
  error,
  gray,
  green,
  headerError,
  // Combined styles
  headerPrimary,
  headerSuccess,
  headerWarning,
  hint,
  info,
  italic,
  magenta,
  muted,
  orange,
  // Semantic colors
  primary,
  red,
  strikethrough,
  // Utilities
  stripAnsi,
  success,
  underline,
  visibleLength,
  warning,
  white,
  yellow,
  // Note: supportsColor is exported from capabilities.ts
} from './colors.ts';
export {
  arrow,
  ARROW_RIGHT,
  // Box drawing
  BOX,
  BOX_DOUBLE,
  BOX_ROUNDED,
  BULLET,
  bullet,
  // Status symbols
  CHECK,
  // Formatted status strings
  checkMark,
  CIRCLE_EMPTY,
  // Progress symbols
  CIRCLE_FILLED,
  CIRCLE_HALF,
  CROSS,
  crossMark,
  INFO,
  infoMark,
  // Progress bar chars (but not progressBar function - that comes from progress.ts)
  PROGRESS_BAR,
  QUESTION,
  SPINNER_BOUNCE,
  // Spinner frames
  SPINNER_DOTS,
  SPINNER_LINE,
  WARNING,
  warningMark,
} from './symbols.ts';

// Theme and formatting
export * from './theme.ts';
export * from './format.ts';

// UI components (ColorFn is re-exported from theme.ts)
export {
  type BoxConfig,
  type BoxOptions,
  type BoxStyle,
  createBox,
  createLine,
  type Spacing,
} from './box.ts';

// Progress bar (progressBar function from here, not from symbols.ts)
export {
  createBulletList,
  createNumberedList,
  createProgressBar,
  createTaskList,
  createTaskSummary,
  formatTask,
  progressBar,
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
