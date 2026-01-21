/**
 * @module ui/status
 *
 * Status indicator components for consistent styling.
 */

import { blue, cyan, dim, gray, green, red, yellow } from './colors.ts';
import { CHECK, CROSS, INFO, WARNING, CIRCLE_EMPTY, SPINNER_DOTS } from './symbols.ts';
import { theme, type ColorFn } from './theme.ts';

// ============================================================================
// Status Types
// ============================================================================

/** All possible status types */
export type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/** Configuration for status display */
export interface StatusConfig {
  /** The status type */
  readonly type: StatusType;
  /** Text to display after the icon */
  readonly text?: string;
  /** Whether to show the status icon. Default: true */
  readonly showIcon?: boolean;
}

// ============================================================================
// Status Icons
// ============================================================================

/** Status icons mapping */
export const STATUS_ICONS: Record<StatusType, string> = {
  success: CHECK,
  completed: CHECK,
  error: CROSS,
  failed: CROSS,
  warning: WARNING,
  info: INFO,
  pending: CIRCLE_EMPTY,
  running: SPINNER_DOTS[0] ?? '⠋', // Static frame for non-animated
  skipped: '⊘',
};

/** Status colors mapping */
export const STATUS_COLORS: Record<StatusType, ColorFn> = {
  success: green,
  completed: green,
  error: red,
  failed: red,
  warning: yellow,
  info: blue,
  pending: gray,
  running: cyan,
  skipped: dim,
};

// ============================================================================
// Status Functions
// ============================================================================

/**
 * Gets the icon for a status type.
 */
export function getStatusIcon(type: StatusType): string {
  return STATUS_ICONS[type];
}

/**
 * Gets the color function for a status type.
 */
export function getStatusColor(type: StatusType): ColorFn {
  return STATUS_COLORS[type];
}

/**
 * Creates a status indicator string.
 *
 * @example
 * status({ type: 'success', text: 'Build completed' });
 * // ✓ Build completed
 *
 * @example
 * status({ type: 'running', text: 'Installing dependencies' });
 * // ⠋ Installing dependencies
 *
 * @example
 * status({ type: 'pending', text: 'Run tests' });
 * // ○ Run tests
 */
export function status(config: StatusConfig): string {
  const { type, text, showIcon = true } = config;

  const icon = STATUS_ICONS[type];
  const color = STATUS_COLORS[type];

  if (!showIcon) {
    return text ? color(text) : '';
  }

  if (!text) {
    return color(icon);
  }

  // For running status, colorize the icon but not the text
  if (type === 'running') {
    return `${color(icon)} ${text}`;
  }

  return `${color(icon)} ${text}`;
}

/**
 * Creates a colored status icon only.
 */
export function statusIcon(type: StatusType): string {
  return STATUS_COLORS[type](STATUS_ICONS[type]);
}

/**
 * Creates a status line with a specific type.
 * Convenience functions for common use cases.
 */
export const statusSuccess = (text: string): string => status({ type: 'success', text });
export const statusError = (text: string): string => status({ type: 'error', text });
export const statusWarning = (text: string): string => status({ type: 'warning', text });
export const statusInfo = (text: string): string => status({ type: 'info', text });
export const statusPending = (text: string): string => status({ type: 'pending', text });
export const statusRunning = (text: string): string => status({ type: 'running', text });
export const statusCompleted = (text: string): string => status({ type: 'completed', text });
export const statusFailed = (text: string): string => status({ type: 'failed', text });
export const statusSkipped = (text: string): string => status({ type: 'skipped', text });
