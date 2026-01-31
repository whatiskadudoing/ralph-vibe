/**
 * @module components/Table
 *
 * Table component for aligned column display using deno-ink.
 */

import React from "react";
import { Box, Text, measureText } from "@ink/mod.ts";

export type ColumnAlign = "left" | "right" | "center";

export interface ColumnConfig {
  /** Column header text */
  header: string;
  /** Column width (auto-calculated if not specified) */
  width?: number;
  /** Column alignment (default: "left") */
  align?: ColumnAlign;
  /** Color for column values */
  color?: string;
}

export type HeaderStyle = "bold" | "underline" | "dim" | "none";

export interface TableProps {
  /** Column definitions */
  columns: ColumnConfig[];
  /** Row data (array of arrays) */
  rows: (string | number)[][];
  /** Header style (default: "bold") */
  headerStyle?: HeaderStyle;
  /** Show row separators */
  rowSeparator?: boolean;
  /** Gap between columns (default: 2) */
  columnGap?: number;
}

function padString(str: string, width: number, align: ColumnAlign): string {
  const strWidth = measureText(str).width;
  if (strWidth >= width) {
    return str;
  }

  const padding = width - strWidth;

  switch (align) {
    case "right":
      return " ".repeat(padding) + str;
    case "center": {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return " ".repeat(left) + str + " ".repeat(right);
    }
    case "left":
    default:
      return str + " ".repeat(padding);
  }
}

function calculateColumnWidths(columns: ColumnConfig[], rows: (string | number)[][]): number[] {
  return columns.map((col, colIndex) => {
    if (col.width !== undefined) {
      return col.width;
    }

    const headerWidth = measureText(col.header).width;
    const maxRowWidth = rows.reduce((max, row) => {
      const cell = row[colIndex];
      const cellStr = cell !== undefined ? String(cell) : "";
      return Math.max(max, measureText(cellStr).width);
    }, 0);

    return Math.max(headerWidth, maxRowWidth);
  });
}

interface TableCellProps {
  value: string;
  width: number;
  align: ColumnAlign;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

function TableCell({ value, width, align, color, bold, dimColor }: TableCellProps): React.ReactElement {
  const paddedValue = padString(value, width, align);
  return (
    <Text color={color} bold={bold} dimColor={dimColor}>
      {paddedValue}
    </Text>
  );
}

export function Table({
  columns,
  rows,
  headerStyle = "bold",
  rowSeparator = false,
  columnGap = 2,
}: TableProps): React.ReactElement {
  const widths = calculateColumnWidths(columns, rows);
  const gap = " ".repeat(columnGap);

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        {columns.map((col, i) => (
          <Box key={i}>
            {i > 0 && <Text>{gap}</Text>}
            <TableCell
              value={col.header}
              width={widths[i] ?? 0}
              align={col.align ?? "left"}
              bold={headerStyle === "bold"}
              dimColor={headerStyle === "dim"}
            />
          </Box>
        ))}
      </Box>

      {/* Separator after header */}
      {rowSeparator && (
        <Box>
          {columns.map((_, i) => (
            <Box key={i}>
              {i > 0 && <Text>{gap}</Text>}
              <Text dimColor>{"─".repeat(widths[i] ?? 0)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Data rows */}
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} flexDirection="column">
          <Box>
            {columns.map((col, colIndex) => {
              const value = row[colIndex];
              const valueStr = value !== undefined ? String(value) : "";
              return (
                <Box key={colIndex}>
                  {colIndex > 0 && <Text>{gap}</Text>}
                  <TableCell
                    value={valueStr}
                    width={widths[colIndex] ?? 0}
                    align={col.align ?? "left"}
                    color={col.color}
                  />
                </Box>
              );
            })}
          </Box>
          {rowSeparator && rowIndex < rows.length - 1 && (
            <Box>
              {columns.map((_, i) => (
                <Box key={i}>
                  {i > 0 && <Text>{gap}</Text>}
                  <Text dimColor>{"─".repeat(widths[i] ?? 0)}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Key-value table (two columns)
export function KeyValueTable({
  data,
  keyColor,
  valueColor,
}: {
  data: Record<string, string | number>;
  keyColor?: string;
  valueColor?: string;
}): React.ReactElement {
  const entries = Object.entries(data);
  const maxKeyWidth = Math.max(...entries.map(([key]) => measureText(key).width));

  return (
    <Box flexDirection="column">
      {entries.map(([key, value], index) => (
        <Box key={index}>
          <Text color={keyColor} dimColor={!keyColor}>
            {key.padEnd(maxKeyWidth)}
          </Text>
          <Text>  </Text>
          <Text color={valueColor}>{String(value)}</Text>
        </Box>
      ))}
    </Box>
  );
}
