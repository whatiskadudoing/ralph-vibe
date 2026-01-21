/**
 * @module ui/table
 *
 * Table component for aligned columns data display.
 */

import { bold, dim, underline, visibleLength } from './colors.ts';
import { theme, type ColorFn } from './theme.ts';

// ============================================================================
// Table Types
// ============================================================================

/** Column alignment */
export type ColumnAlign = 'left' | 'right' | 'center';

/** Column configuration */
export interface ColumnConfig {
  /** Column header text */
  readonly header: string;
  /** Column width (or 'auto' to fit content) */
  readonly width?: number | 'auto';
  /** Column alignment */
  readonly align?: ColumnAlign;
  /** Color function for column values */
  readonly color?: ColorFn;
}

/** Header style */
export type HeaderStyle = 'bold' | 'underline' | 'none';

/** Table configuration */
export interface TableConfig {
  /** Column definitions */
  readonly columns: ColumnConfig[];
  /** Row data (array of arrays) */
  readonly rows: (string | number)[][];

  /** Whether to show borders */
  readonly border?: boolean;
  /** Style for header row */
  readonly headerStyle?: HeaderStyle;
  /** Whether to show row separators */
  readonly rowSeparator?: boolean;

  /** Column gap (spaces between columns). Default: 2 */
  readonly columnGap?: number;
  /** Left padding. Default: 0 */
  readonly indent?: number;
}

// ============================================================================
// Table Functions
// ============================================================================

/**
 * Pads a string to a given width with alignment.
 */
function padString(str: string, width: number, align: ColumnAlign): string {
  const strLength = visibleLength(str);
  if (strLength >= width) {
    return str;
  }

  const padding = width - strLength;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center': {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    }
    case 'left':
    default:
      return str + ' '.repeat(padding);
  }
}

/**
 * Calculates column widths based on content and configuration.
 */
function calculateColumnWidths(config: TableConfig): number[] {
  const { columns, rows } = config;

  return columns.map((col, colIndex) => {
    if (col.width !== undefined && col.width !== 'auto') {
      return col.width;
    }

    // Calculate auto width based on content
    const headerWidth = visibleLength(col.header);
    const maxRowWidth = rows.reduce((max, row) => {
      const cell = row[colIndex];
      const cellStr = cell !== undefined ? String(cell) : '';
      return Math.max(max, visibleLength(cellStr));
    }, 0);

    return Math.max(headerWidth, maxRowWidth);
  });
}

/**
 * Creates a formatted table.
 *
 * @example
 * table({
 *   columns: [
 *     { header: 'Model', width: 10 },
 *     { header: 'Ops', width: 6, align: 'right' },
 *     { header: 'Time', width: 8, align: 'right' }
 *   ],
 *   rows: [
 *     ['opus', 24, '1m 23s'],
 *     ['sonnet', 12, '45s']
 *   ],
 *   headerStyle: 'bold'
 * });
 * // Model      Ops    Time
 * // opus        24   1m 23s
 * // sonnet      12      45s
 */
export function table(config: TableConfig): string {
  const {
    columns,
    rows,
    border = false,
    headerStyle = 'bold',
    rowSeparator = false,
    columnGap = 2,
    indent = 0,
  } = config;

  const widths = calculateColumnWidths(config);
  const gap = ' '.repeat(columnGap);
  const indentStr = ' '.repeat(indent);
  const lines: string[] = [];

  // Build header row
  const headerCells = columns.map((col, i) => {
    const align = col.align ?? 'left';
    const cell = padString(col.header, widths[i] ?? 0, align);

    switch (headerStyle) {
      case 'bold':
        return bold(cell);
      case 'underline':
        return underline(cell);
      case 'none':
      default:
        return cell;
    }
  });

  lines.push(indentStr + headerCells.join(gap));

  // Add separator after header if using underline style or if border is enabled
  if (rowSeparator || border) {
    const separatorCells = widths.map((w) => '─'.repeat(w));
    lines.push(indentStr + dim(separatorCells.join(gap)));
  }

  // Build data rows
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;
    const cells = columns.map((col, colIndex) => {
      const value = row[colIndex];
      const valueStr = value !== undefined ? String(value) : '';
      const align = col.align ?? 'left';
      const paddedCell = padString(valueStr, widths[colIndex] ?? 0, align);

      if (col.color) {
        return col.color(paddedCell);
      }
      return paddedCell;
    });

    lines.push(indentStr + cells.join(gap));

    // Add row separator if enabled (but not after last row)
    if (rowSeparator && rowIndex < rows.length - 1) {
      const separatorCells = widths.map((w) => '─'.repeat(w));
      lines.push(indentStr + dim(separatorCells.join(gap)));
    }
  }

  return lines.join('\n');
}

/**
 * Creates a simple two-column key-value table.
 */
export function keyValueTable(
  data: Record<string, string | number>,
  options?: {
    readonly keyColor?: ColorFn;
    readonly valueColor?: ColorFn;
    readonly indent?: number;
  },
): string {
  const { keyColor = dim, valueColor, indent = 0 } = options ?? {};

  const entries = Object.entries(data);
  const maxKeyWidth = Math.max(...entries.map(([key]) => visibleLength(key)));

  const lines = entries.map(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyWidth);
    const keyStr = keyColor(paddedKey);
    const valueStr = valueColor ? valueColor(String(value)) : String(value);
    return ' '.repeat(indent) + `${keyStr}  ${valueStr}`;
  });

  return lines.join('\n');
}
