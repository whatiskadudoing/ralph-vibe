/**
 * @module components/Timer
 *
 * Timer and countdown display components using deno-ink.
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "@ink/mod.ts";

export interface TimerProps {
  /** Duration in seconds (for countdown) */
  duration?: number;
  /** Start time (for elapsed time) */
  startTime?: number;
  /** Format: "hh:mm:ss" | "mm:ss" | "human" */
  format?: "hh:mm:ss" | "mm:ss" | "human";
  /** Color when time is running */
  color?: string;
  /** Color when time is low (countdown) */
  warningColor?: string;
  /** Warning threshold in seconds */
  warningThreshold?: number;
  /** Show icon */
  showIcon?: boolean;
  /** Prefix label */
  label?: string;
  /** On complete callback */
  onComplete?: () => void;
}

function formatTime(seconds: number, format: "hh:mm:ss" | "mm:ss" | "human"): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (format === "human") {
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  if (format === "hh:mm:ss") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // mm:ss
  const totalMinutes = h * 60 + m;
  return `${String(totalMinutes).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Countdown timer
export function Countdown({
  duration,
  format = "mm:ss",
  color = "cyan",
  warningColor = "red",
  warningThreshold = 10,
  showIcon = true,
  label,
  onComplete,
}: TimerProps): React.ReactElement {
  const [remaining, setRemaining] = useState(duration ?? 0);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((r: number) => Math.max(0, r - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  const isWarning = remaining <= warningThreshold;
  const displayColor = isWarning ? warningColor : color;

  return (
    <Box>
      {showIcon && <Text>⏱ </Text>}
      {label && <Text dimColor>{label}: </Text>}
      <Text color={displayColor} bold>
        {formatTime(remaining, format)}
      </Text>
    </Box>
  );
}

// Elapsed time (stopwatch)
export function Elapsed({
  startTime,
  format = "mm:ss",
  color = "cyan",
  showIcon = true,
  label,
}: TimerProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startTime ?? Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <Box>
      {showIcon && <Text>⏱ </Text>}
      {label && <Text dimColor>{label}: </Text>}
      <Text color={color}>{formatTime(elapsed, format)}</Text>
    </Box>
  );
}

// Static duration display (no animation)
export function Duration({
  seconds,
  format = "human",
  color,
  showIcon = false,
  label,
}: {
  seconds: number;
  format?: "hh:mm:ss" | "mm:ss" | "human";
  color?: string;
  showIcon?: boolean;
  label?: string;
}): React.ReactElement {
  return (
    <Box>
      {showIcon && <Text>⏱ </Text>}
      {label && <Text dimColor>{label}: </Text>}
      <Text color={color}>{formatTime(seconds, format)}</Text>
    </Box>
  );
}

// Time range display
export function TimeRange({
  start,
  end,
  separator = " → ",
}: {
  start: string;
  end: string;
  separator?: string;
}): React.ReactElement {
  return (
    <Box>
      <Text dimColor>{start}</Text>
      <Text>{separator}</Text>
      <Text>{end}</Text>
    </Box>
  );
}

// Relative time display
export function RelativeTime({
  timestamp,
  prefix = "",
}: {
  timestamp: number;
  prefix?: string;
}): React.ReactElement {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  let text: string;
  if (diff < 60) {
    text = "just now";
  } else if (diff < 3600) {
    const m = Math.floor(diff / 60);
    text = `${m}m ago`;
  } else if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    text = `${h}h ago`;
  } else {
    const d = Math.floor(diff / 86400);
    text = `${d}d ago`;
  }

  return (
    <Box>
      {prefix && <Text>{prefix} </Text>}
      <Text dimColor>{text}</Text>
    </Box>
  );
}

// ETA display
export function ETA({
  percent,
  elapsedSeconds,
}: {
  percent: number;
  elapsedSeconds: number;
}): React.ReactElement {
  if (percent <= 0) {
    return <Text dimColor>calculating...</Text>;
  }

  const totalEstimate = (elapsedSeconds / percent) * 100;
  const remaining = Math.max(0, totalEstimate - elapsedSeconds);

  return (
    <Box>
      <Text dimColor>ETA: </Text>
      <Text>{formatTime(Math.round(remaining), "human")}</Text>
    </Box>
  );
}
