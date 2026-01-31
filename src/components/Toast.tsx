/**
 * @module components/Toast
 *
 * Toast and notification components for ephemeral messages.
 * Inspired by modern UI patterns and terminal notification systems.
 */

import React, { type ReactNode } from "react";
import { Box, Text } from "@ink/mod.ts";

// ============================================================================
// TOAST - Ephemeral notification message
// ============================================================================

export type ToastType = "info" | "success" | "warning" | "error" | "loading";

export interface ToastProps {
  /** Toast type determines icon and color */
  type?: ToastType;
  /** Message content */
  message: string;
  /** Custom icon (overrides type icon) */
  icon?: string;
  /** Custom color (overrides type color) */
  color?: string;
  /** Show border */
  bordered?: boolean;
  /** Compact mode (no padding) */
  compact?: boolean;
  /** Position hint for rendering */
  position?: "top" | "bottom";
}

const TOAST_STYLES: Record<ToastType, { icon: string; color: string }> = {
  info: { icon: "ℹ", color: "blue" },
  success: { icon: "✓", color: "green" },
  warning: { icon: "⚠", color: "yellow" },
  error: { icon: "✗", color: "red" },
  loading: { icon: "◐", color: "cyan" },
};

export function Toast({
  type = "info",
  message,
  icon,
  color,
  bordered = true,
  compact = false,
}: ToastProps): React.ReactElement {
  const style = TOAST_STYLES[type];
  const displayIcon = icon ?? style.icon;
  const displayColor = color ?? style.color;

  if (compact) {
    return (
      <Box>
        <Text color={displayColor}>{displayIcon}</Text>
        <Text> {message}</Text>
      </Box>
    );
  }

  if (bordered) {
    return (
      <Box
        borderStyle="round"
        borderColor={displayColor}
        paddingX={2}
        paddingY={0}
      >
        <Text color={displayColor}>{displayIcon}</Text>
        <Text> {message}</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text color={displayColor}>{displayIcon}</Text>
      <Text> {message}</Text>
    </Box>
  );
}

// ============================================================================
// TOAST CONTAINER - Stack multiple toasts
// ============================================================================

export interface ToastItem {
  id: string | number;
  type?: ToastType;
  message: string;
  icon?: string;
}

export interface ToastContainerProps {
  /** Array of toast items */
  toasts: ToastItem[];
  /** Position */
  position?: "top" | "bottom";
  /** Max visible toasts */
  maxVisible?: number;
  /** Gap between toasts */
  gap?: number;
}

export function ToastContainer({
  toasts,
  position = "bottom",
  maxVisible = 5,
  gap = 0,
}: ToastContainerProps): React.ReactElement {
  const visibleToasts = toasts.slice(0, maxVisible);
  const hiddenCount = toasts.length - maxVisible;

  return (
    <Box
      flexDirection={position === "top" ? "column" : "column-reverse"}
      gap={gap}
    >
      {visibleToasts.map((toast) => (
        <React.Fragment key={toast.id}>
          <Toast
            type={toast.type}
            message={toast.message}
            icon={toast.icon}
          />
        </React.Fragment>
      ))}
      {hiddenCount > 0 && (
        <Text dimColor>  +{hiddenCount} more...</Text>
      )}
    </Box>
  );
}

// ============================================================================
// NOTIFICATION - Richer notification with title and actions
// ============================================================================

export interface NotificationProps {
  /** Notification type */
  type?: ToastType;
  /** Title */
  title: string;
  /** Message body */
  message?: string;
  /** Custom icon */
  icon?: string;
  /** Actions (e.g., "View", "Dismiss") */
  actions?: string[];
  /** Selected action index */
  selectedAction?: number;
  /** Timestamp or relative time */
  time?: string;
  /** Width */
  width?: number;
}

export function Notification({
  type = "info",
  title,
  message,
  icon,
  actions,
  selectedAction = 0,
  time,
  width,
}: NotificationProps): React.ReactElement {
  const style = TOAST_STYLES[type];
  const displayIcon = icon ?? style.icon;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={style.color}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={style.color}>{displayIcon}</Text>
          <Text bold> {title}</Text>
        </Box>
        {time && <Text dimColor>{time}</Text>}
      </Box>

      {/* Body */}
      {message && (
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <Box marginTop={1} gap={2}>
          {actions.map((action, index) => (
            <Text
              key={index}
              color={index === selectedAction ? style.color : undefined}
              bold={index === selectedAction}
              underline={index === selectedAction}
            >
              {action}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// INLINE NOTIFICATION - Single-line notification
// ============================================================================

export interface InlineNotificationProps {
  /** Type */
  type?: ToastType;
  /** Message */
  message: string;
  /** Show icon */
  showIcon?: boolean;
  /** Dismissible (show X) */
  dismissible?: boolean;
}

export function InlineNotification({
  type = "info",
  message,
  showIcon = true,
  dismissible = false,
}: InlineNotificationProps): React.ReactElement {
  const style = TOAST_STYLES[type];

  return (
    <Box>
      {showIcon && <Text color={style.color}>{style.icon} </Text>}
      <Text>{message}</Text>
      {dismissible && <Text dimColor> [×]</Text>}
    </Box>
  );
}

// ============================================================================
// BANNER NOTIFICATION - Full-width notification
// ============================================================================

export interface BannerNotificationProps {
  /** Type */
  type?: ToastType;
  /** Message */
  message: string;
  /** Icon */
  icon?: string;
  /** Action text */
  action?: string;
  /** Width (default: full) */
  width?: number;
}

export function BannerNotification({
  type = "info",
  message,
  icon,
  action,
  width,
}: BannerNotificationProps): React.ReactElement {
  const style = TOAST_STYLES[type];
  const displayIcon = icon ?? style.icon;

  return (
    <Box
      borderStyle="single"
      borderColor={style.color}
      borderLeft={false}
      borderRight={false}
      paddingX={2}
      paddingY={0}
      width={width}
      justifyContent="space-between"
    >
      <Box>
        <Text color={style.color}>{displayIcon}</Text>
        <Text> {message}</Text>
      </Box>
      {action && (
        <Text color={style.color} underline>
          {action}
        </Text>
      )}
    </Box>
  );
}

// ============================================================================
// SNACKBAR - Bottom notification with action
// ============================================================================

export interface SnackbarProps {
  /** Message */
  message: string;
  /** Action label */
  action?: string;
  /** Action color */
  actionColor?: string;
  /** Duration hint (for display) */
  duration?: string;
}

export function Snackbar({
  message,
  action,
  actionColor = "cyan",
  duration,
}: SnackbarProps): React.ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={2}
      paddingY={0}
      justifyContent="space-between"
      gap={4}
    >
      <Text>{message}</Text>
      <Box gap={2}>
        {duration && <Text dimColor>{duration}</Text>}
        {action && (
          <Text color={actionColor} bold>
            {action}
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// PROGRESS TOAST - Toast with progress indicator
// ============================================================================

export interface ProgressToastProps {
  /** Title */
  title: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  status?: string;
  /** Progress bar width */
  barWidth?: number;
  /** Color */
  color?: string;
}

export function ProgressToast({
  title,
  progress,
  status,
  barWidth = 20,
  color = "cyan",
}: ProgressToastProps): React.ReactElement {
  const filledWidth = Math.round((progress / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between">
        <Text bold>{title}</Text>
        <Text color={color}>{progress}%</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={color}>{"█".repeat(filledWidth)}</Text>
        <Text dimColor>{"░".repeat(emptyWidth)}</Text>
      </Box>
      {status && (
        <Box marginTop={1}>
          <Text dimColor>{status}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// ACTIVITY LOG - Stream of activity notifications
// ============================================================================

export interface ActivityItem {
  id: string | number;
  icon?: string;
  message: string;
  time?: string;
  color?: string;
}

export interface ActivityLogProps {
  /** Activity items */
  items: ActivityItem[];
  /** Max visible items */
  maxVisible?: number;
  /** Show timestamps */
  showTime?: boolean;
  /** Title */
  title?: string;
}

export function ActivityLog({
  items,
  maxVisible = 10,
  showTime = true,
  title,
}: ActivityLogProps): React.ReactElement {
  const visibleItems = items.slice(-maxVisible);

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold dimColor>{title}</Text>
        </Box>
      )}
      {visibleItems.map((item) => (
        <Box key={item.id}>
          {showTime && item.time && (
            <Text dimColor>{item.time} </Text>
          )}
          {item.icon && <Text color={item.color}>{item.icon} </Text>}
          <Text color={item.color}>{item.message}</Text>
        </Box>
      ))}
    </Box>
  );
}
