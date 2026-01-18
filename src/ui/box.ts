/**
 * @module ui/box
 *
 * Box drawing utilities for terminal UI.
 */

import { BOX, BOX_DOUBLE, BOX_ROUNDED } from './symbols.ts';
import { visibleLength } from './colors.ts';

export type BoxStyle = 'single' | 'rounded' | 'double';

/** A function that applies color to text */
export type ColorFn = (text: string) => string;

export interface BoxOptions {
  /** Box style. Default: 'single'. */
  readonly style?: BoxStyle;
  /** Padding inside the box. Default: 1. */
  readonly padding?: number;
  /** Horizontal padding. Overrides padding for horizontal. */
  readonly paddingX?: number;
  /** Vertical padding. Overrides padding for vertical. */
  readonly paddingY?: number;
  /** Title to display in the top border. */
  readonly title?: string;
  /** Minimum width of the box content area. */
  readonly minWidth?: number;
  /** Color function to apply to the border. */
  readonly borderColor?: ColorFn;
}

const DEFAULT_OPTIONS: Required<
  Omit<BoxOptions, 'title' | 'paddingX' | 'paddingY' | 'borderColor'>
> = {
  style: 'single',
  padding: 1,
  minWidth: 0,
};

/**
 * Gets the box characters for a given style.
 */
function getBoxChars(
  style: BoxStyle,
): typeof BOX | typeof BOX_ROUNDED | typeof BOX_DOUBLE {
  switch (style) {
    case 'rounded':
      return BOX_ROUNDED;
    case 'double':
      return BOX_DOUBLE;
    default:
      return BOX;
  }
}

/**
 * Creates a box around the given content.
 * Pure function - returns the boxed content as a string.
 */
export function createBox(content: string, options: BoxOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const paddingX = opts.paddingX ?? opts.padding;
  const paddingY = opts.paddingY ?? opts.padding;

  const box = getBoxChars(opts.style);
  const lines = content.split('\n');

  // Apply border color if provided
  const colorBorder = opts.borderColor ?? ((s: string) => s);

  // Calculate the width needed for content
  const maxContentWidth = Math.max(...lines.map(visibleLength), opts.minWidth);
  const innerWidth = maxContentWidth + paddingX * 2;

  // Create the horizontal padding string
  const hPad = ' '.repeat(paddingX);

  // Create lines with padding
  const paddedLines = lines.map((line) => {
    const lineLength = visibleLength(line);
    const rightPad = ' '.repeat(maxContentWidth - lineLength);
    return `${colorBorder(box.vertical)}${hPad}${line}${rightPad}${hPad}${
      colorBorder(box.vertical)
    }`;
  });

  // Add vertical padding
  const emptyLine = `${colorBorder(box.vertical)}${' '.repeat(innerWidth)}${
    colorBorder(box.vertical)
  }`;
  const verticalPadding = Array(paddingY).fill(emptyLine);

  // Create top border (with optional title)
  let topBorder: string;
  if (opts.title) {
    const titleText = ` ${opts.title} `;
    const remainingWidth = innerWidth - titleText.length;
    const leftWidth = Math.floor(remainingWidth / 2);
    const rightWidth = remainingWidth - leftWidth;
    topBorder = colorBorder(box.topLeft) +
      colorBorder(box.horizontal.repeat(leftWidth)) +
      titleText +
      colorBorder(box.horizontal.repeat(rightWidth)) +
      colorBorder(box.topRight);
  } else {
    topBorder = colorBorder(box.topLeft + box.horizontal.repeat(innerWidth) + box.topRight);
  }

  // Create bottom border
  const bottomBorder = colorBorder(
    box.bottomLeft + box.horizontal.repeat(innerWidth) + box.bottomRight,
  );

  // Assemble the box
  return [topBorder, ...verticalPadding, ...paddedLines, ...verticalPadding, bottomBorder].join(
    '\n',
  );
}

/**
 * Creates a simple horizontal line.
 */
export function createLine(width: number, style: BoxStyle = 'single'): string {
  const box = getBoxChars(style);
  return box.horizontal.repeat(width);
}
