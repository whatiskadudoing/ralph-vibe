/**
 * @module ui/stats
 *
 * Stats line component for horizontal stats display with separators.
 */

import { dim, muted } from './colors.ts';
import { type ColorFn } from './theme.ts';

// ============================================================================
// Stats Types
// ============================================================================

/** A single stat item */
export interface StatItem {
  /** Label for the stat (optional) */
  readonly label?: string;
  /** The value to display */
  readonly value: string | number;
  /** Color function for the value */
  readonly color?: ColorFn;
  /** Icon to show before the value */
  readonly icon?: string;
}

/** Stats line configuration */
export interface StatsLineConfig {
  /** Items to display */
  readonly items: StatItem[];
  /** Separator between items. Default: ' · ' */
  readonly separator?: string;
  /** Compact mode - removes labels, just shows values */
  readonly compact?: boolean;
  /** Color for labels */
  readonly labelColor?: ColorFn;
}

// ============================================================================
// Stats Functions
// ============================================================================

/**
 * Renders a single stat item.
 */
function renderStatItem(item: StatItem, compact: boolean, labelColor: ColorFn): string {
  const { label, value, color, icon } = item;
  const valueColor = color ?? ((s: string) => s);
  const valueStr = typeof value === 'number' ? String(value) : value;

  const parts: string[] = [];

  // Add icon if present
  if (icon) {
    parts.push(icon);
  }

  // Add label if present and not in compact mode
  if (label && !compact) {
    parts.push(`${labelColor(label)}:`);
  }

  // Add value
  parts.push(valueColor(valueStr));

  return parts.join(' ');
}

/**
 * Creates a horizontal stats line.
 *
 * @example
 * statsLine({
 *   items: [
 *     { label: 'model', value: 'opus', color: amber },
 *     { label: 'ops', value: 12 },
 *     { label: 'time', value: '45s' },
 *     { label: 'tokens', value: '12.4K' }
 *   ]
 * });
 * // model: opus  ·  ops: 12  ·  time: 45s  ·  tokens: 12.4K
 *
 * @example
 * statsLine({
 *   items: [
 *     { icon: '⏱', value: '2m 34s' },
 *     { icon: '🔄', value: '3' },
 *     { icon: '⚡', value: '47' }
 *   ],
 *   compact: true
 * });
 * // ⏱ 2m 34s  ·  🔄 3  ·  ⚡ 47
 */
export function statsLine(config: StatsLineConfig): string {
  const {
    items,
    separator = ' · ',
    compact = false,
    labelColor = muted,
  } = config;

  const renderedItems = items.map((item) => renderStatItem(item, compact, labelColor));
  return renderedItems.join(dim(separator));
}

/**
 * Creates a simple key-value stat display.
 */
export function stat(label: string, value: string | number, color?: ColorFn): string {
  const valueColor = color ?? ((s: string) => s);
  const valueStr = typeof value === 'number' ? String(value) : value;
  return `${muted(label)}: ${valueColor(valueStr)}`;
}

/**
 * Creates a stat with an icon.
 */
export function iconStat(icon: string, value: string | number, color?: ColorFn): string {
  const valueColor = color ?? ((s: string) => s);
  const valueStr = typeof value === 'number' ? String(value) : value;
  return `${icon} ${valueColor(valueStr)}`;
}
