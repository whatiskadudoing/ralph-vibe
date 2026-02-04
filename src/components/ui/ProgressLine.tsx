/**
 * @module components/ui/ProgressLine
 *
 * Progress indicator with spinner, elapsed time, and status text.
 * Clean single-line display with truncation for long messages.
 */

import React, { useEffect, useState } from 'react';
import { Box, Spinner, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

export interface ProgressLineProps {
  /** Status message to display */
  status: string;
  /** Start time for elapsed counter (Date.now()) */
  startTime?: number;
  /** Show spinner (default: true) */
  showSpinner?: boolean;
  /** Available width for the status text */
  width?: number;
  /** Maximum number of lines to display (default: 1) */
  maxLines?: number;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m${secs}s`;
}

/**
 * Truncate text to fit within a given width, adding ellipsis if needed.
 */
function truncateText(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 3) + '...';
}

export function ProgressLine({
  status,
  startTime,
  showSpinner = true,
  width = 150,
  maxLines: _maxLines = 1,
}: ProgressLineProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    // Initial update
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const elapsedText = elapsed > 0 ? `[${formatElapsed(elapsed)}] ` : '';
  const prefix = (showSpinner ? 2 : 0) + elapsedText.length;

  return (
    <Box flexDirection='row' gap={1}>
      {showSpinner && <Spinner type='dots' />}
      {elapsedText && <Text color={colors.dim}>{elapsedText}</Text>}
      {/* Text with wrap - will flow to multiple lines */}
      <Box width={width - prefix - 2}>
        <Text wrap='wrap'>{status}</Text>
      </Box>
    </Box>
  );
}
