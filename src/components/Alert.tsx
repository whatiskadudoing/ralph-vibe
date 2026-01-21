/**
 * @module components/Alert
 *
 * Alert/Banner components for important messages using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";
import type { ReactNode } from "react";

export type AlertType = "info" | "success" | "warning" | "error" | "tip";

const ALERT_CONFIG: Record<AlertType, { icon: string; color: string; bg?: string }> = {
  info: { icon: "ℹ", color: "blue" },
  success: { icon: "✓", color: "green" },
  warning: { icon: "⚠", color: "yellow" },
  error: { icon: "✗", color: "red" },
  tip: { icon: "💡", color: "cyan" },
};

export interface AlertProps {
  /** Alert type */
  type: AlertType;
  /** Alert title */
  title?: string;
  /** Alert message */
  message?: string;
  /** Custom icon override */
  icon?: string;
  /** Children content */
  children?: ReactNode;
}

export function Alert({
  type,
  title,
  message,
  icon,
  children,
}: AlertProps): React.ReactElement {
  const config = ALERT_CONFIG[type];
  const displayIcon = icon ?? config.icon;

  return (
    <Box
      borderStyle="round"
      borderColor={config.color}
      paddingX={2}
      paddingY={1}
      flexDirection="column"
    >
      <Box>
        <Text color={config.color}>{displayIcon}</Text>
        <Text> </Text>
        {title ? (
          <Text bold color={config.color}>{title}</Text>
        ) : (
          <Text bold color={config.color}>{type.toUpperCase()}</Text>
        )}
      </Box>
      {message && (
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
      )}
      {children && <Box marginTop={1}>{children}</Box>}
    </Box>
  );
}

// Convenience components
export function InfoAlert({ title, message, children }: Omit<AlertProps, "type">): React.ReactElement {
  return <Alert type="info" title={title} message={message}>{children}</Alert>;
}

export function SuccessAlert({ title, message, children }: Omit<AlertProps, "type">): React.ReactElement {
  return <Alert type="success" title={title} message={message}>{children}</Alert>;
}

export function WarningAlert({ title, message, children }: Omit<AlertProps, "type">): React.ReactElement {
  return <Alert type="warning" title={title} message={message}>{children}</Alert>;
}

export function ErrorAlert({ title, message, children }: Omit<AlertProps, "type">): React.ReactElement {
  return <Alert type="error" title={title} message={message}>{children}</Alert>;
}

export function TipAlert({ title, message, children }: Omit<AlertProps, "type">): React.ReactElement {
  return <Alert type="tip" title={title} message={message}>{children}</Alert>;
}

// Inline banner (no border, just colored bar)
export interface BannerProps {
  type: AlertType;
  children: ReactNode;
}

export function Banner({ type, children }: BannerProps): React.ReactElement {
  const config = ALERT_CONFIG[type];
  return (
    <Box>
      <Text color={config.color}>{config.icon}</Text>
      <Text> </Text>
      {children}
    </Box>
  );
}
