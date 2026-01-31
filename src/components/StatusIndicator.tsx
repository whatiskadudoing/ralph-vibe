/**
 * @module components/StatusIndicator
 *
 * Status indicator component with icons using deno-ink.
 */

import React from "react";
import { Box, Text, Spinner } from "@ink/mod.ts";

export type StatusType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

const STATUS_CONFIG: Record<StatusType, { icon: string; color: string }> = {
  success: { icon: "✓", color: "green" },
  completed: { icon: "✓", color: "green" },
  error: { icon: "✗", color: "red" },
  failed: { icon: "✗", color: "red" },
  warning: { icon: "⚠", color: "yellow" },
  info: { icon: "ℹ", color: "blue" },
  pending: { icon: "○", color: "gray" },
  running: { icon: "", color: "cyan" }, // Uses spinner
  skipped: { icon: "⊘", color: "gray" },
};

export interface StatusIndicatorProps {
  /** Status type */
  type: StatusType;
  /** Text to display after the icon */
  text?: string;
  /** Show the icon (default: true) */
  showIcon?: boolean;
}

export function StatusIndicator({
  type,
  text,
  showIcon = true,
}: StatusIndicatorProps): React.ReactElement {
  const config = STATUS_CONFIG[type];

  return (
    <Box>
      {showIcon && type === "running" ? (
        <Spinner type="dots" color={config.color} />
      ) : showIcon ? (
        <Text color={config.color}>{config.icon}</Text>
      ) : null}
      {text && (
        <Text>
          {showIcon ? " " : ""}
          {text}
        </Text>
      )}
    </Box>
  );
}

// Convenience components
export function StatusSuccess({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="success" text={text} />;
}

export function StatusError({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="error" text={text} />;
}

export function StatusWarning({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="warning" text={text} />;
}

export function StatusInfo({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="info" text={text} />;
}

export function StatusPending({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="pending" text={text} />;
}

export function StatusRunning({ text }: { text: string }): React.ReactElement {
  return <StatusIndicator type="running" text={text} />;
}
