/**
 * @module ui/divider
 *
 * Divider component for section separators.
 */

import { dim, visibleLength } from './colors.ts';
import { getTerminalDimensions } from './capabilities.ts';
import { type ColorFn } from './theme.ts';

// ============================================================================
// Divider Types
// ============================================================================

/** Divider style types */
export type DividerStyle = 'line' | 'double' | 'dashed' | 'dots' | 'space';

/** Divider configuration */
export interface DividerConfig {
  /** Width of the divider. 'full' uses terminal width */
  readonly width?: number | 'full';
  /** Style of the divider */
  readonly style?: DividerStyle;
  /** Optional label to embed in the divider */
  readonly label?: string;
  /** Label alignment */
  readonly labelAlign?: 'left' | 'center' | 'right';
  /** Color function */
  readonly color?: ColorFn;
}

// ============================================================================
// Divider Characters
// ============================================================================

const DIVIDER_CHARS: Record<DividerStyle, string> = {
  line: '─',
  double: '═',
  dashed: '- ',
  dots: '·',
  space: ' ',
};

// ============================================================================
// Divider Functions
// ============================================================================

/**
 * Creates a divider/separator.
 *
 * @example
 * divider({ style: 'line' });
 * // ────────────────────────────────
 *
 * @example
 * divider({ style: 'line', label: 'Section' });
 * // ──────── Section ────────────────
 *
 * @example
 * divider({ style: 'dashed' });
 * // - - - - - - - - - - - - - - - - -
 *
 * @example
 * divider({ style: 'space' });
 * // (empty line)
 */
export function divider(config: DividerConfig = {}): string {
  const {
    width: configWidth = 'full',
    style = 'line',
    label,
    labelAlign = 'center',
    color = dim,
  } = config;

  // Calculate width
  const width = configWidth === 'full' ? getTerminalDimensions().width - 2 : configWidth;

  // Handle space style (just returns empty line)
  if (style === 'space') {
    return '';
  }

  const char = DIVIDER_CHARS[style];

  // If no label, just create a simple line
  if (!label) {
    if (style === 'dashed') {
      // For dashed, we need to repeat the pattern
      const count = Math.floor(width / 2);
      return color(char.repeat(count).trimEnd());
    }
    return color(char.repeat(width));
  }

  // Create labeled divider
  const labelWithPadding = ` ${label} `;
  const labelLength = visibleLength(labelWithPadding);
  const remainingWidth = width - labelLength;

  if (remainingWidth < 4) {
    // Not enough space for a proper divider
    return color(label);
  }

  let leftWidth: number;
  let rightWidth: number;

  switch (labelAlign) {
    case 'left':
      leftWidth = 2;
      rightWidth = remainingWidth - 2;
      break;
    case 'right':
      leftWidth = remainingWidth - 2;
      rightWidth = 2;
      break;
    case 'center':
    default:
      leftWidth = Math.floor(remainingWidth / 2);
      rightWidth = remainingWidth - leftWidth;
      break;
  }

  if (style === 'dashed') {
    const leftCount = Math.floor(leftWidth / 2);
    const rightCount = Math.floor(rightWidth / 2);
    return (
      color(char.repeat(leftCount).trimEnd()) +
      labelWithPadding +
      color(char.repeat(rightCount).trimEnd())
    );
  }

  return color(char.repeat(leftWidth)) + labelWithPadding + color(char.repeat(rightWidth));
}

/**
 * Creates a simple line divider.
 */
export function line(width?: number | 'full'): string {
  return divider({ width, style: 'line' });
}

/**
 * Creates a double-line divider.
 */
export function doubleLine(width?: number | 'full'): string {
  return divider({ width, style: 'double' });
}

/**
 * Creates a dashed divider.
 */
export function dashedLine(width?: number | 'full'): string {
  return divider({ width, style: 'dashed' });
}

/**
 * Creates a section header with label.
 */
export function sectionHeader(label: string, width?: number | 'full', color?: ColorFn): string {
  return divider({ width, style: 'line', label, labelAlign: 'center', color });
}
