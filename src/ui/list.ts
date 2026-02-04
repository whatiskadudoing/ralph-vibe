/**
 * @module ui/list
 *
 * List component for formatted lists with consistent styling.
 */

import { muted } from './colors.ts';
import { ARROW_RIGHT, BULLET } from './symbols.ts';
import { statusIcon, type StatusType } from './status.ts';
import { type ColorFn } from './theme.ts';

// ============================================================================
// List Types
// ============================================================================

/** List style types */
export type ListStyle = 'bullet' | 'numbered' | 'checkbox' | 'arrow' | 'custom';

/** Simple list item (just a string) or rich list item */
export interface ListItem {
  /** Item text */
  readonly text: string;
  /** Optional status icon */
  readonly status?: StatusType;
  /** Nested sub-items */
  readonly subItems?: ListItem[];
  /** Custom color for this item */
  readonly color?: ColorFn;
}

/** List configuration */
export interface ListConfig {
  /** Items to display (strings or ListItem objects) */
  readonly items: (string | ListItem)[];

  /** List style. Default: 'bullet' */
  readonly style?: ListStyle;
  /** Custom bullet character (for style: 'custom') */
  readonly bullet?: string;

  /** Left indentation (number of spaces) */
  readonly indent?: number;

  /** Default color for items */
  readonly itemColor?: ColorFn;

  /** Color for bullets/arrows (default: muted) */
  readonly bulletColor?: ColorFn;

  /** Indices of checked items (for style: 'checkbox') */
  readonly checkedItems?: number[];
}

// ============================================================================
// List Bullets
// ============================================================================

const _LIST_BULLETS: Record<ListStyle, string> = {
  bullet: '•',
  numbered: '', // Handled specially
  checkbox: '', // Handled with status icons
  arrow: '▶',
  custom: '•',
};

// ============================================================================
// List Functions
// ============================================================================

/**
 * Normalizes a list item to the rich format.
 */
function normalizeItem(item: string | ListItem): ListItem {
  if (typeof item === 'string') {
    return { text: item };
  }
  return item;
}

/**
 * Renders a single list item.
 */
function renderItem(
  item: ListItem,
  index: number,
  config: ListConfig,
  depth: number = 0,
): string[] {
  const {
    style = 'bullet',
    bullet: customBullet,
    indent = 0,
    itemColor,
    bulletColor = muted,
    checkedItems = [],
  } = config;

  const lines: string[] = [];
  const baseIndent = ' '.repeat(indent + depth * 2);
  const color = item.color ?? itemColor ?? ((s: string) => s);

  // Determine the bullet/prefix
  let prefix: string;

  if (item.status) {
    // If item has a status, use the status icon
    prefix = statusIcon(item.status);
  } else {
    switch (style) {
      case 'numbered':
        prefix = bulletColor(`${index + 1}.`);
        break;
      case 'checkbox':
        // For checkbox style, check if this index is in checkedItems
        prefix = checkedItems.includes(index) ? statusIcon('completed') : statusIcon('pending');
        break;
      case 'arrow':
        prefix = bulletColor(ARROW_RIGHT);
        break;
      case 'custom':
        prefix = bulletColor(customBullet ?? BULLET);
        break;
      case 'bullet':
      default:
        prefix = bulletColor(BULLET);
        break;
    }
  }

  // Build the main line
  const text = item.status ? item.text : color(item.text);
  lines.push(`${baseIndent}${prefix} ${text}`);

  // Render sub-items recursively
  if (item.subItems && item.subItems.length > 0) {
    for (let i = 0; i < item.subItems.length; i++) {
      const rawSubItem = item.subItems[i];
      if (rawSubItem !== undefined) {
        const subItem = normalizeItem(rawSubItem);
        lines.push(...renderItem(subItem, i, config, depth + 1));
      }
    }
  }

  return lines;
}

/**
 * Creates a formatted list.
 *
 * @example
 * list({
 *   items: ['First item', 'Second item', 'Third item'],
 *   style: 'bullet'
 * });
 * // • First item
 * // • Second item
 * // • Third item
 *
 * @example
 * list({
 *   items: [
 *     { text: 'Build project', status: 'completed' },
 *     { text: 'Run tests', status: 'running' },
 *     { text: 'Deploy', status: 'pending' }
 *   ],
 *   style: 'checkbox'
 * });
 * // ✓ Build project
 * // ⠋ Run tests
 * // ○ Deploy
 *
 * @example
 * list({
 *   items: [
 *     {
 *       text: 'Authentication',
 *       subItems: [
 *         { text: 'Login endpoint', status: 'completed' },
 *         { text: 'Logout endpoint', status: 'completed' }
 *       ]
 *     }
 *   ],
 *   style: 'arrow'
 * });
 * // ▶ Authentication
 * //   ✓ Login endpoint
 * //   ✓ Logout endpoint
 */
export function list(config: ListConfig): string {
  const { items } = config;
  const lines: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];
    if (rawItem !== undefined) {
      const item = normalizeItem(rawItem);
      lines.push(...renderItem(item, i, config));
    }
  }

  return lines.join('\n');
}

/**
 * Creates a simple bullet list.
 * Convenience wrapper around list().
 */
export function bulletList(items: string[], indent?: number): string {
  return list({ items, style: 'bullet', indent });
}

/**
 * Creates a numbered list.
 * Convenience wrapper around list().
 */
export function numberedList(items: string[], indent?: number): string {
  return list({ items, style: 'numbered', indent });
}

/**
 * Creates an arrow list.
 * Convenience wrapper around list().
 */
export function arrowList(items: string[], indent?: number): string {
  return list({ items, style: 'arrow', indent });
}

/**
 * Creates a checkbox list with status indicators.
 */
export function checkboxList(
  items: Array<{ text: string; checked?: boolean }>,
  indent?: number,
): string {
  return list({
    items: items.map((item) => ({
      text: item.text,
      status: item.checked ? 'completed' : 'pending',
    })),
    indent,
  });
}
