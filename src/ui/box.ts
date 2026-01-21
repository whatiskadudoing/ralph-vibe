/**
 * @module ui/box
 *
 * Enhanced box drawing utilities for terminal UI.
 * The most fundamental component - everything uses boxes.
 */

import { BOX, BOX_DOUBLE, BOX_ROUNDED } from './symbols.ts';
import { dim, visibleLength } from './colors.ts';
import { getTerminalDimensions } from './capabilities.ts';
import { theme } from './theme.ts';

/** A function that applies color to text */
export type ColorFn = (text: string) => string;

export type BoxStyle = 'none' | 'single' | 'rounded' | 'double' | 'bold' | 'ascii';

/** Padding/margin configuration */
export interface Spacing {
  readonly x?: number;
  readonly y?: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly right?: number;
}

export interface BoxConfig {
  /** Content to display - string or array of strings (joined with newlines) */
  readonly content: string | string[];

  /** Width of the box. 'auto' fits content, 'full' uses terminal width */
  readonly width?: number | 'auto' | 'full';
  /** Minimum width of the box content area */
  readonly minWidth?: number;
  /** Maximum width of the box content area */
  readonly maxWidth?: number;

  /** Border style */
  readonly border?: BoxStyle;
  /** Border color function */
  readonly borderColor?: ColorFn;
  /** Dim the border (Gemini-inspired subtle borders) */
  readonly borderDim?: boolean;

  /** Title displayed in top border */
  readonly title?: string;
  /** Title color function */
  readonly titleColor?: ColorFn;
  /** Title alignment */
  readonly titleAlign?: 'left' | 'center' | 'right';
  /** Icon before title (e.g., '🚀', '✓', '⚠') */
  readonly titleIcon?: string;

  /** Footer displayed in bottom border */
  readonly footer?: string;
  /** Footer color function */
  readonly footerColor?: ColorFn;
  /** Footer alignment */
  readonly footerAlign?: 'left' | 'center' | 'right';

  /** Padding inside the box */
  readonly padding?: number | Spacing;
  /** Margin outside the box */
  readonly margin?: number | Spacing;

  /** Use lighter border chars for nested boxes */
  readonly nested?: boolean;
}

/** Legacy options interface for backward compatibility */
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

/** Box characters for single line style */
const BOX_SINGLE = BOX;

/** Box characters for bold style (using heavy box drawing) */
const BOX_BOLD = {
  topLeft: '┏',
  topRight: '┓',
  bottomLeft: '┗',
  bottomRight: '┛',
  horizontal: '━',
  vertical: '┃',
};

/** Box characters for ASCII style */
const BOX_ASCII = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
};

/**
 * Gets the box characters for a given style.
 */
function getBoxChars(
  style: BoxStyle,
  nested?: boolean,
): { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; horizontal: string; vertical: string } {
  // For nested boxes, use single/light border
  if (nested) {
    return BOX_SINGLE;
  }

  switch (style) {
    case 'rounded':
      return BOX_ROUNDED;
    case 'double':
      return BOX_DOUBLE;
    case 'bold':
      return BOX_BOLD;
    case 'ascii':
      return BOX_ASCII;
    case 'none':
      return {
        topLeft: ' ',
        topRight: ' ',
        bottomLeft: ' ',
        bottomRight: ' ',
        horizontal: ' ',
        vertical: ' ',
      };
    default:
      return BOX_SINGLE;
  }
}

/**
 * Normalizes spacing configuration to individual values.
 */
function normalizeSpacing(spacing?: number | Spacing): { top: number; bottom: number; left: number; right: number } {
  if (spacing === undefined) {
    return { top: 0, bottom: 0, left: 1, right: 1 };
  }

  if (typeof spacing === 'number') {
    return { top: spacing, bottom: spacing, left: spacing, right: spacing };
  }

  const x = spacing.x ?? 1;
  const y = spacing.y ?? 0;

  return {
    top: spacing.top ?? y,
    bottom: spacing.bottom ?? y,
    left: spacing.left ?? x,
    right: spacing.right ?? x,
  };
}

/**
 * Creates a border line with optional embedded text.
 */
function createBorderLine(
  width: number,
  leftChar: string,
  rightChar: string,
  horizontal: string,
  text?: string,
  textColor?: ColorFn,
  align: 'left' | 'center' | 'right' = 'left',
  borderColor?: ColorFn,
): string {
  const colorBorder = borderColor ?? ((s: string) => s);
  const colorText = textColor ?? ((s: string) => s);

  if (!text) {
    return colorBorder(leftChar + horizontal.repeat(width) + rightChar);
  }

  const textWithPadding = ` ${text} `;
  const textVisibleLength = visibleLength(textWithPadding);
  const remainingWidth = width - textVisibleLength;

  if (remainingWidth < 2) {
    // Not enough space, just use the horizontal line
    return colorBorder(leftChar + horizontal.repeat(width) + rightChar);
  }

  let leftWidth: number;
  let rightWidth: number;

  switch (align) {
    case 'center':
      leftWidth = Math.floor(remainingWidth / 2);
      rightWidth = remainingWidth - leftWidth;
      break;
    case 'right':
      leftWidth = remainingWidth - 1;
      rightWidth = 1;
      break;
    case 'left':
    default:
      leftWidth = 1;
      rightWidth = remainingWidth - 1;
      break;
  }

  return (
    colorBorder(leftChar) +
    colorBorder(horizontal.repeat(leftWidth)) +
    colorText(textWithPadding) +
    colorBorder(horizontal.repeat(rightWidth)) +
    colorBorder(rightChar)
  );
}

/**
 * Creates an enhanced box around content.
 * This is the primary box function with full feature support.
 */
export function createBox(content: string | BoxConfig, options?: BoxOptions): string {
  // Handle the new config-based API
  if (typeof content === 'object' && 'content' in content) {
    return createEnhancedBox(content);
  }

  // Legacy string-based API
  return createLegacyBox(content, options);
}

/**
 * Creates a box using the enhanced config-based API.
 */
function createEnhancedBox(config: BoxConfig): string {
  const {
    content,
    width = 'auto',
    minWidth = 0,
    maxWidth,
    border = 'single',
    borderColor: rawBorderColor,
    borderDim = false,
    title,
    titleColor,
    titleAlign = 'left',
    titleIcon,
    footer,
    footerColor,
    footerAlign = 'left',
    padding = 1,
    margin,
    nested = false,
  } = config;

  // Apply dim styling if requested
  let borderColor = rawBorderColor ?? (nested ? dim : theme.border.default);
  if (borderDim) {
    const originalColor = borderColor;
    borderColor = (s: string) => dim(originalColor(s));
  }

  const box = getBoxChars(border, nested);
  const pad = normalizeSpacing(padding);
  const marg = normalizeSpacing(margin);

  // Convert content to lines array
  const contentLines = Array.isArray(content) ? content : content.split('\n');

  // Flatten any nested box content (which may have newlines)
  const lines: string[] = [];
  for (const line of contentLines) {
    lines.push(...line.split('\n'));
  }

  // Calculate content width
  let contentWidth: number;
  const maxLineWidth = Math.max(...lines.map(visibleLength), 0);
  const titleLength = title ? visibleLength(titleIcon ? `${titleIcon} ${title}` : title) + 4 : 0;
  const footerLength = footer ? visibleLength(footer) + 4 : 0;

  if (width === 'full') {
    const termWidth = getTerminalDimensions().width;
    contentWidth = termWidth - 2 - pad.left - pad.right - marg.left - marg.right;
  } else if (width === 'auto') {
    contentWidth = Math.max(maxLineWidth, titleLength, footerLength, minWidth);
  } else {
    contentWidth = width - 2 - pad.left - pad.right;
  }

  // Apply maxWidth constraint
  if (maxWidth !== undefined) {
    contentWidth = Math.min(contentWidth, maxWidth - 2 - pad.left - pad.right);
  }

  // Apply minWidth constraint
  contentWidth = Math.max(contentWidth, minWidth);

  const innerWidth = contentWidth + pad.left + pad.right;
  const leftPad = ' '.repeat(pad.left);
  const rightPadBase = ' '.repeat(pad.right);

  // Build the title text
  const titleText = title ? (titleIcon ? `${titleIcon} ${title}` : title) : undefined;

  // Create top border
  const topBorder = createBorderLine(
    innerWidth,
    box.topLeft,
    box.topRight,
    box.horizontal,
    titleText,
    titleColor,
    titleAlign,
    borderColor,
  );

  // Create bottom border
  const bottomBorder = createBorderLine(
    innerWidth,
    box.bottomLeft,
    box.bottomRight,
    box.horizontal,
    footer,
    footerColor,
    footerAlign,
    borderColor,
  );

  // Create content lines with padding
  const paddedLines = lines.map((line) => {
    const lineLength = visibleLength(line);
    const rightPad = ' '.repeat(Math.max(0, contentWidth - lineLength)) + rightPadBase;
    return `${borderColor(box.vertical)}${leftPad}${line}${rightPad}${borderColor(box.vertical)}`;
  });

  // Add vertical padding
  const emptyLine = `${borderColor(box.vertical)}${' '.repeat(innerWidth)}${borderColor(box.vertical)}`;
  const topPadding = Array(pad.top).fill(emptyLine);
  const bottomPadding = Array(pad.bottom).fill(emptyLine);

  // Assemble the box
  const boxLines = [topBorder, ...topPadding, ...paddedLines, ...bottomPadding, bottomBorder];

  // Apply margin
  const marginLeft = ' '.repeat(marg.left);
  const marginTop = '\n'.repeat(marg.top);
  const marginBottom = '\n'.repeat(marg.bottom);

  const marginedLines = boxLines.map((line) => `${marginLeft}${line}`);
  return marginTop + marginedLines.join('\n') + marginBottom;
}

/**
 * Creates a box using the legacy string-based API.
 * Maintained for backward compatibility.
 */
function createLegacyBox(content: string, options: BoxOptions = {}): string {
  const {
    style = 'single',
    padding = 1,
    paddingX,
    paddingY,
    title,
    minWidth = 0,
    borderColor,
  } = options;

  const box = getBoxChars(style);
  const padX = paddingX ?? padding;
  const padY = paddingY ?? padding;
  const lines = content.split('\n');

  // Apply border color if provided
  const colorBorder = borderColor ?? ((s: string) => s);

  // Calculate the width needed for content
  const maxContentWidth = Math.max(...lines.map(visibleLength), minWidth);
  const innerWidth = maxContentWidth + padX * 2;

  // Create the horizontal padding string
  const hPad = ' '.repeat(padX);

  // Create lines with padding
  const paddedLines = lines.map((line) => {
    const lineLength = visibleLength(line);
    const rightPad = ' '.repeat(maxContentWidth - lineLength);
    return `${colorBorder(box.vertical)}${hPad}${line}${rightPad}${hPad}${colorBorder(box.vertical)}`;
  });

  // Add vertical padding
  const emptyLine = `${colorBorder(box.vertical)}${' '.repeat(innerWidth)}${colorBorder(box.vertical)}`;
  const verticalPadding = Array(padY).fill(emptyLine);

  // Create top border (with optional title)
  let topBorder: string;
  if (title) {
    const titleText = ` ${title} `;
    const remainingWidth = innerWidth - visibleLength(titleText);
    const leftWidth = Math.floor(remainingWidth / 2);
    const rightWidth = remainingWidth - leftWidth;
    topBorder =
      colorBorder(box.topLeft) +
      colorBorder(box.horizontal.repeat(leftWidth)) +
      titleText +
      colorBorder(box.horizontal.repeat(rightWidth)) +
      colorBorder(box.topRight);
  } else {
    topBorder = colorBorder(box.topLeft + box.horizontal.repeat(innerWidth) + box.topRight);
  }

  // Create bottom border
  const bottomBorder = colorBorder(box.bottomLeft + box.horizontal.repeat(innerWidth) + box.bottomRight);

  // Assemble the box
  return [topBorder, ...verticalPadding, ...paddedLines, ...verticalPadding, bottomBorder].join('\n');
}

/**
 * Creates a simple horizontal line.
 */
export function createLine(width: number, style: BoxStyle = 'single'): string {
  const box = getBoxChars(style);
  return box.horizontal.repeat(width);
}
