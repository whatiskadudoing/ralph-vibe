/**
 * @module components/Divider
 *
 * Divider/separator component using deno-ink.
 */

import React from 'react';
import { Box, Text } from '@ink/mod.ts';

export type DividerStyle = 'line' | 'double' | 'dashed' | 'dots' | 'space';

const DIVIDER_CHARS: Record<DividerStyle, string> = {
  line: '─',
  double: '═',
  dashed: '╌',
  dots: '·',
  space: ' ',
};

export interface DividerProps {
  /** Width of the divider (default: 40) */
  width?: number;
  /** Divider style (default: "line") */
  style?: DividerStyle;
  /** Label text to embed in the divider */
  label?: string;
  /** Label alignment (default: "center") */
  labelAlign?: 'left' | 'center' | 'right';
  /** Divider color */
  color?: string;
}

export function Divider({
  width = 40,
  style = 'line',
  label,
  labelAlign = 'center',
  color,
}: DividerProps): React.ReactElement {
  const char = DIVIDER_CHARS[style];

  if (!label) {
    return (
      <Box>
        <Text color={color} dimColor={!color}>
          {char.repeat(width)}
        </Text>
      </Box>
    );
  }

  const labelWithPadding = ` ${label} `;
  const remainingWidth = width - labelWithPadding.length;

  if (remainingWidth <= 0) {
    return (
      <Box>
        <Text>{label}</Text>
      </Box>
    );
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

  return (
    <Box>
      <Text color={color} dimColor={!color}>
        {char.repeat(Math.max(0, leftWidth))}
      </Text>
      <Text>{labelWithPadding}</Text>
      <Text color={color} dimColor={!color}>
        {char.repeat(Math.max(0, rightWidth))}
      </Text>
    </Box>
  );
}

// Simple line divider
export function Line({ width, color }: { width?: number; color?: string }): React.ReactElement {
  return <Divider width={width} style='line' color={color} />;
}

// Section header with label
export function SectionHeader({
  title,
  width,
}: {
  title: string;
  width?: number;
}): React.ReactElement {
  return <Divider width={width} style='line' label={title} labelAlign='left' />;
}
