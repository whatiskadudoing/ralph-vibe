/**
 * @module components/ui/CommandBox
 *
 * Main container component with animated gradient border.
 * Use this as the wrapper for all command screens.
 */

import React, { useEffect, useState } from 'react';
import { Box, useApp, useInput } from '../../../packages/deno-ink/src/mod.ts';
import { colors, gradientColors } from './theme.ts';
import { useTerminalSize } from '../../../packages/deno-ink/src/mod.ts';

export interface CommandBoxProps {
  children?: React.ReactNode;
  /** Animate the border through gradient colors */
  animateBorder?: boolean;
  /** Static border color (when not animating) */
  borderColor?: string;
  /** Called when user presses q or escape */
  onQuit?: () => void;
}

export function CommandBox({
  children,
  animateBorder = true,
  borderColor: staticBorderColor,
  onQuit,
}: CommandBoxProps): React.ReactElement {
  const { exit } = useApp();
  const { columns } = useTerminalSize();
  const [borderColorIndex, setBorderColorIndex] = useState(0);

  // Animate border color (slower interval to reduce CPU usage)
  useEffect(() => {
    if (!animateBorder) return;
    const timer = setInterval(() => {
      setBorderColorIndex((i: number) => (i + 1) % gradientColors.length);
    }, 300);
    return () => clearInterval(timer);
  }, [animateBorder]);

  // Handle quit
  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      onQuit?.();
      exit();
    }
  });

  const boxWidth = columns - 4;
  const borderColor = animateBorder
    ? (gradientColors[borderColorIndex] ?? colors.brand)
    : (staticBorderColor ?? colors.brand);

  return (
    <Box
      flexDirection='column'
      borderStyle='round'
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
      width={boxWidth}
    >
      {children}
    </Box>
  );
}
