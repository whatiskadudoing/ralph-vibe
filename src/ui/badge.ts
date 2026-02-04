/**
 * @module ui/badge
 *
 * Badge/tag component for small inline indicators.
 */

import { dim } from './colors.ts';
import { type ColorFn, theme } from './theme.ts';

// ============================================================================
// Badge Types
// ============================================================================

/** Badge configuration */
export interface BadgeConfig {
  /** Text to display */
  readonly text: string;
  /** Text color function */
  readonly color?: ColorFn;
  /** Icon to show before the text */
  readonly icon?: string;
}

/** Model names for model badges */
export type ModelName = 'opus' | 'sonnet' | 'haiku';

// ============================================================================
// Badge Functions
// ============================================================================

/**
 * Creates a badge/tag.
 *
 * @example
 * badge({ text: 'opus', color: amber, icon: '●' });
 * // ● opus
 *
 * @example
 * badge({ text: 'NEW', color: success });
 * // NEW
 */
export function badge(config: BadgeConfig): string {
  const { text, color, icon } = config;
  const colorFn = color ?? ((s: string) => s);

  if (icon) {
    return `${colorFn(icon)} ${colorFn(text)}`;
  }

  return colorFn(text);
}

/**
 * Creates a model badge with predefined colors.
 *
 * @example
 * modelBadge('opus');    // ● opus (amber)
 * modelBadge('sonnet');  // ● sonnet (cyan)
 * modelBadge('haiku');   // ● haiku (dim)
 */
export function modelBadge(model: ModelName | string): string {
  const icon = '●';

  switch (model.toLowerCase()) {
    case 'opus':
    case 'claude-opus':
    case 'claude-3-opus':
      return `${theme.models.opus(icon)} ${theme.models.opus('opus')}`;

    case 'sonnet':
    case 'claude-sonnet':
    case 'claude-3-sonnet':
    case 'claude-3.5-sonnet':
      return `${theme.models.sonnet(icon)} ${theme.models.sonnet('sonnet')}`;

    case 'haiku':
    case 'claude-haiku':
    case 'claude-3-haiku':
      return `${theme.models.haiku(icon)} ${theme.models.haiku('haiku')}`;

    default:
      return `${dim(icon)} ${dim(model)}`;
  }
}

/**
 * Creates a status badge.
 */
export function statusBadge(
  text: string,
  status: 'success' | 'warning' | 'error' | 'info',
): string {
  const colors: Record<string, ColorFn> = {
    success: theme.status.success,
    warning: theme.status.warning,
    error: theme.status.error,
    info: theme.status.info,
  };

  const color = colors[status] ?? dim;
  return color(text);
}

/**
 * Creates a label badge with brackets.
 *
 * @example
 * labelBadge('1/2');    // [1/2]
 * labelBadge('NEW', amber);  // [NEW] (in amber)
 */
export function labelBadge(text: string, color?: ColorFn): string {
  const colorFn = color ?? dim;
  return colorFn(`[${text}]`);
}

/**
 * Creates a pill badge.
 *
 * @example
 * pillBadge('beta');  // (beta)
 */
export function pillBadge(text: string, color?: ColorFn): string {
  const colorFn = color ?? dim;
  return colorFn(`(${text})`);
}
