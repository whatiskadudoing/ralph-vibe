/**
 * @module components/ProgressBar
 *
 * Progress bar component using deno-ink.
 */

import React from "react";
import { Box, Text } from "@ink/mod.ts";

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  percent: number;
  /** Width of the progress bar in characters (default: 40) */
  width?: number;
  /** Character for filled portion (default: "█") */
  filled?: string;
  /** Character for empty portion (default: "░") */
  empty?: string;
  /** Color for filled portion */
  color?: string;
  /** Color for empty portion */
  emptyColor?: string;
  /** Show percentage label (default: true) */
  showPercent?: boolean;
  /** Custom label to show after the bar */
  label?: string;
  /** Auto-color based on thresholds */
  thresholds?: {
    warning?: number;
    danger?: number;
  };
}

export function ProgressBar({
  percent,
  width = 40,
  filled = "█",
  empty = "░",
  color,
  emptyColor,
  showPercent = true,
  label,
  thresholds,
}: ProgressBarProps): React.ReactElement {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * width);
  const emptyWidth = width - filledWidth;

  // Determine color based on thresholds
  let barColor = color;
  if (thresholds && !color) {
    if (thresholds.danger && clampedPercent >= thresholds.danger) {
      barColor = "red";
    } else if (thresholds.warning && clampedPercent >= thresholds.warning) {
      barColor = "yellow";
    } else {
      barColor = "green";
    }
  }

  const filledBar = filled.repeat(filledWidth);
  const emptyBar = empty.repeat(emptyWidth);

  return (
    <Box>
      <Text color={barColor}>{filledBar}</Text>
      <Text color={emptyColor} dimColor={!emptyColor}>{emptyBar}</Text>
      {showPercent && !label && <Text dimColor> {Math.round(clampedPercent)}%</Text>}
      {label && <Text dimColor> {label}</Text>}
    </Box>
  );
}
