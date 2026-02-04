/**
 * @module components/ui/GradientText
 *
 * Animated gradient text component.
 */

import React, { useEffect, useState } from 'react';
import { Text } from '../../../packages/deno-ink/src/mod.ts';
import { gradientColors } from './theme.ts';

export interface GradientTextProps {
  children: string;
  colors?: string[];
  speed?: number; // ms per frame
  bold?: boolean;
}

// Interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${
    b.toString(16).padStart(2, '0')
  }`;
}

// Get color at position in gradient
function getGradientColor(position: number, colorList: string[], offset: number): string {
  const adjustedPos = (position + offset) % 1;
  const segmentCount = colorList.length - 1;
  const segment = Math.floor(adjustedPos * segmentCount);
  const segmentFactor = (adjustedPos * segmentCount) % 1;

  const c1 = colorList[segment] ?? colorList[0] ?? '#FFFFFF';
  const c2 = colorList[segment + 1] ?? colorList[0] ?? '#FFFFFF';

  return interpolateColor(c1, c2, segmentFactor);
}

export function GradientText({
  children,
  colors: colorList = gradientColors,
  speed = 100,
  bold = false,
}: GradientTextProps): React.ReactElement {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setOffset((o: number) => (o + 0.05) % 1);
    }, speed);
    return () => clearInterval(timer);
  }, [speed]);

  const chars = children.split('');

  return (
    <Text bold={bold}>
      {chars.map((char, i) => {
        const position = chars.length > 1 ? i / (chars.length - 1) : 0;
        const color = getGradientColor(position, colorList, offset);
        return (
          <Text key={i} color={color}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

// Preset gradient styles
export const fireGradient = [
  '#FF0000',
  '#FF4500',
  '#FF8C00',
  '#FFD700',
  '#FF8C00',
  '#FF4500',
  '#FF0000',
];
export const oceanGradient = ['#0077BE', '#00A9CE', '#00CED1', '#00A9CE', '#0077BE'];
export const sunsetGradient = ['#FF6B6B', '#FF8E53', '#FFC857', '#FF8E53', '#FF6B6B'];
export const neonGradient = ['#FF00FF', '#00FFFF', '#FF00FF'];
