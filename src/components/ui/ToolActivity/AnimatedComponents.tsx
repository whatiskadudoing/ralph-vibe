/**
 * @module components/ui/ToolActivity/AnimatedComponents
 *
 * Animated UI components for ToolActivity display.
 * Includes spinners, dots, and live duration counters.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from '../../../../packages/deno-ink/src/mod.ts';
import { colors } from '../theme.ts';
import { DOT_COLORS, SPINNER_FRAMES } from './constants.ts';

// ============================================================================
// Spinner Icon Component
// ============================================================================

export interface SpinnerIconProps {
  color: string;
}

/**
 * Animated spinner icon for running tools
 */
export function SpinnerIcon({ color }: SpinnerIconProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f: number) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{SPINNER_FRAMES[frame]}</Text>;
}

// ============================================================================
// Operation Dots Component
// ============================================================================

export interface OperationDotsProps {
  total: number;
  completed: number;
  hasRunning: boolean;
}

/**
 * Animated operation dots indicator
 * Shows completed operations as green dots, running as blinking orange
 */
export function OperationDots({
  total,
  completed,
  hasRunning,
}: OperationDotsProps): React.ReactElement {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(() => {
      setColorIndex((i: number) => (i + 1) % DOT_COLORS.length);
    }, 300);
    return () => clearInterval(timer);
  }, [hasRunning]);

  // Limit dots to show (max 10, then show +N)
  const maxDots = 10;
  const showDots = Math.min(total, maxDots);
  const extraCount = total - maxDots;

  const dots: React.ReactNode[] = [];

  for (let i = 0; i < showDots; i++) {
    const isCompleted = i < completed;
    const isRunning = i === completed && hasRunning;

    let dotColor = colors.dim;
    if (isCompleted) {
      dotColor = colors.success;
    } else if (isRunning) {
      dotColor = DOT_COLORS[colorIndex] ?? colors.accent;
    }

    dots.push(
      <Text key={i} color={dotColor}>
        {isRunning ? '\u25CF' : isCompleted ? '\u25CF' : '\u25CB'}
      </Text>,
    );

    // Add connector between dots
    if (i < showDots - 1) {
      dots.push(
        <Text key={`c${i}`} color={colors.dim}>{'\u2500'}</Text>,
      );
    }
  }

  return (
    <Box flexDirection='row' gap={0}>
      {dots}
      {extraCount > 0 && <Text color={colors.dim}>+{extraCount}</Text>}
    </Box>
  );
}

// ============================================================================
// Live Duration Component
// ============================================================================

export interface LiveDurationProps {
  startTime: number;
}

/**
 * Live duration counter for running tools
 */
export function LiveDuration({ startTime }: LiveDurationProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <Text color={colors.dim}>{elapsed}s...</Text>;
}
