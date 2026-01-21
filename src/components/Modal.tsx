/**
 * @module components/Modal
 *
 * Modal and Dialog components for overlay interactions.
 * Inspired by Charm.sh's dialog patterns and Gemini CLI.
 */

import { Box, Text } from "@ink/mod.ts";
import type { ReactNode } from "react";

// ============================================================================
// MODAL - Overlay container with backdrop
// ============================================================================

export interface ModalProps {
  /** Whether the modal is visible */
  visible?: boolean;
  /** Modal title */
  title?: string;
  /** Title icon */
  titleIcon?: string;
  /** Modal content */
  children: ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Border style */
  borderStyle?: "single" | "round" | "double" | "bold";
  /** Border color */
  borderColor?: string;
  /** Title color */
  titleColor?: string;
  /** Width */
  width?: number;
  /** Padding */
  padding?: number;
  /** Center the modal */
  centered?: boolean;
}

export function Modal({
  visible = true,
  title,
  titleIcon,
  children,
  footer,
  borderStyle = "round",
  borderColor = "cyan",
  titleColor,
  width = 50,
  padding = 1,
  centered = true,
}: ModalProps): React.ReactElement | null {
  if (!visible) return null;

  const content = (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={borderColor}
      width={width}
      padding={padding}
    >
      {title && (
        <Box marginBottom={1}>
          {titleIcon && <Text color={titleColor ?? borderColor}>{titleIcon} </Text>}
          <Text bold color={titleColor ?? borderColor}>{title}</Text>
        </Box>
      )}
      <Box flexDirection="column">
        {children}
      </Box>
      {footer && (
        <Box marginTop={1} justifyContent="flex-end">
          {footer}
        </Box>
      )}
    </Box>
  );

  if (centered) {
    return (
      <Box justifyContent="center" alignItems="center">
        {content}
      </Box>
    );
  }

  return content;
}

// ============================================================================
// DIALOG - Preset modal for common interactions
// ============================================================================

export interface DialogProps {
  /** Dialog type */
  type?: "info" | "success" | "warning" | "error" | "confirm";
  /** Dialog title */
  title: string;
  /** Message content */
  message: string | ReactNode;
  /** Primary action label */
  primaryLabel?: string;
  /** Secondary action label */
  secondaryLabel?: string;
  /** Whether primary is focused */
  primaryFocused?: boolean;
  /** Width */
  width?: number;
}

const DIALOG_STYLES = {
  info: { icon: "ℹ", color: "blue" },
  success: { icon: "✓", color: "green" },
  warning: { icon: "⚠", color: "yellow" },
  error: { icon: "✗", color: "red" },
  confirm: { icon: "?", color: "cyan" },
};

export function Dialog({
  type = "info",
  title,
  message,
  primaryLabel = "OK",
  secondaryLabel,
  primaryFocused = true,
  width = 50,
}: DialogProps): React.ReactElement {
  const style = DIALOG_STYLES[type];

  return (
    <Modal
      title={title}
      titleIcon={style.icon}
      borderColor={style.color}
      titleColor={style.color}
      width={width}
      footer={
        <Box gap={2}>
          <Box
            borderStyle="round"
            borderColor={primaryFocused ? style.color : "gray"}
            paddingX={2}
          >
            <Text bold={primaryFocused} color={primaryFocused ? style.color : undefined}>
              {primaryLabel}
            </Text>
          </Box>
          {secondaryLabel && (
            <Box
              borderStyle="round"
              borderColor={!primaryFocused ? style.color : "gray"}
              paddingX={2}
            >
              <Text bold={!primaryFocused} color={!primaryFocused ? style.color : undefined}>
                {secondaryLabel}
              </Text>
            </Box>
          )}
        </Box>
      }
    >
      {typeof message === "string" ? <Text>{message}</Text> : message}
    </Modal>
  );
}

// ============================================================================
// CONFIRM DIALOG - Yes/No confirmation
// ============================================================================

export interface ConfirmDialogProps {
  /** Question to confirm */
  question: string;
  /** Description/details */
  description?: string;
  /** Yes label */
  yesLabel?: string;
  /** No label */
  noLabel?: string;
  /** Whether Yes is focused */
  yesFocused?: boolean;
  /** Danger mode (destructive action) */
  danger?: boolean;
  /** Width */
  width?: number;
}

export function ConfirmDialog({
  question,
  description,
  yesLabel = "Yes",
  noLabel = "No",
  yesFocused = true,
  danger = false,
  width = 50,
}: ConfirmDialogProps): React.ReactElement {
  const color = danger ? "red" : "cyan";

  return (
    <Modal
      title={question}
      titleIcon="?"
      borderColor={color}
      titleColor={color}
      width={width}
      footer={
        <Box gap={2}>
          <Box
            borderStyle="round"
            borderColor={yesFocused ? (danger ? "red" : "green") : "gray"}
            paddingX={2}
          >
            <Text bold={yesFocused} color={yesFocused ? (danger ? "red" : "green") : undefined}>
              {yesLabel}
            </Text>
          </Box>
          <Box
            borderStyle="round"
            borderColor={!yesFocused ? "gray" : "gray"}
            paddingX={2}
          >
            <Text bold={!yesFocused} dimColor={yesFocused}>
              {noLabel}
            </Text>
          </Box>
        </Box>
      }
    >
      {description && <Text dimColor>{description}</Text>}
    </Modal>
  );
}

// ============================================================================
// ALERT DIALOG - Simple message with single action
// ============================================================================

export interface AlertDialogProps {
  /** Alert type */
  type?: "info" | "success" | "warning" | "error";
  /** Title */
  title: string;
  /** Message */
  message: string;
  /** Button label */
  buttonLabel?: string;
  /** Width */
  width?: number;
}

export function AlertDialog({
  type = "info",
  title,
  message,
  buttonLabel = "OK",
  width = 50,
}: AlertDialogProps): React.ReactElement {
  return (
    <Dialog
      type={type}
      title={title}
      message={message}
      primaryLabel={buttonLabel}
      width={width}
    />
  );
}

// ============================================================================
// INPUT DIALOG - Dialog with text input
// ============================================================================

export interface InputDialogProps {
  /** Title */
  title: string;
  /** Input label */
  label?: string;
  /** Current value */
  value?: string;
  /** Placeholder */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Submit label */
  submitLabel?: string;
  /** Cancel label */
  cancelLabel?: string;
  /** Submit focused */
  submitFocused?: boolean;
  /** Width */
  width?: number;
}

export function InputDialog({
  title,
  label,
  value = "",
  placeholder,
  error,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  submitFocused = false,
  width = 50,
}: InputDialogProps): React.ReactElement {
  const borderColor = error ? "red" : "cyan";

  return (
    <Modal
      title={title}
      borderColor={borderColor}
      width={width}
      footer={
        <Box gap={2}>
          <Box
            borderStyle="round"
            borderColor={submitFocused ? "green" : "gray"}
            paddingX={2}
          >
            <Text bold={submitFocused} color={submitFocused ? "green" : undefined}>
              {submitLabel}
            </Text>
          </Box>
          <Box
            borderStyle="round"
            borderColor={!submitFocused ? "gray" : "gray"}
            paddingX={2}
          >
            <Text dimColor={submitFocused}>{cancelLabel}</Text>
          </Box>
        </Box>
      }
    >
      <Box flexDirection="column" gap={1}>
        {label && <Text>{label}</Text>}
        <Box
          borderStyle="round"
          borderColor={!submitFocused ? "cyan" : "gray"}
          paddingX={1}
        >
          <Text dimColor={!value}>{value || placeholder || " "}</Text>
          {!submitFocused && <Text color="cyan">│</Text>}
        </Box>
        {error && <Text color="red">{error}</Text>}
      </Box>
    </Modal>
  );
}

// ============================================================================
// ACTION SHEET - List of actions to choose from
// ============================================================================

export interface ActionSheetAction {
  label: string;
  icon?: string;
  color?: string;
  danger?: boolean;
}

export interface ActionSheetProps {
  /** Title */
  title?: string;
  /** Actions */
  actions: ActionSheetAction[];
  /** Selected index */
  selectedIndex?: number;
  /** Cancel label */
  cancelLabel?: string;
  /** Width */
  width?: number;
}

export function ActionSheet({
  title,
  actions,
  selectedIndex = 0,
  cancelLabel = "Cancel",
  width = 40,
}: ActionSheetProps): React.ReactElement {
  return (
    <Modal
      title={title}
      borderStyle="round"
      borderColor="gray"
      width={width}
    >
      <Box flexDirection="column">
        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          const color = action.danger ? "red" : action.color;

          return (
            <Box key={index} paddingX={1}>
              <Text color={isSelected ? (color ?? "cyan") : undefined} bold={isSelected}>
                {isSelected ? "› " : "  "}
                {action.icon && `${action.icon} `}
                {action.label}
              </Text>
            </Box>
          );
        })}
        <Box marginTop={1} borderStyle="single" borderColor="gray" borderLeft={false} borderRight={false} borderBottom={false} />
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>
            {selectedIndex === actions.length ? "› " : "  "}
            {cancelLabel}
          </Text>
        </Box>
      </Box>
    </Modal>
  );
}

// ============================================================================
// POPOVER - Small floating content
// ============================================================================

export interface PopoverProps {
  /** Popover content */
  children: ReactNode;
  /** Border color */
  borderColor?: string;
  /** Padding */
  padding?: number;
  /** Arrow position */
  arrow?: "top" | "bottom" | "left" | "right" | "none";
}

export function Popover({
  children,
  borderColor = "gray",
  padding = 1,
  arrow = "none",
}: PopoverProps): React.ReactElement {
  const arrowChar = {
    top: "▲",
    bottom: "▼",
    left: "◀",
    right: "▶",
    none: "",
  }[arrow];

  return (
    <Box flexDirection="column" alignItems="center">
      {arrow === "top" && <Text color={borderColor}>{arrowChar}</Text>}
      <Box flexDirection="row" alignItems="center">
        {arrow === "left" && <Text color={borderColor}>{arrowChar}</Text>}
        <Box
          borderStyle="round"
          borderColor={borderColor}
          padding={padding}
        >
          {children}
        </Box>
        {arrow === "right" && <Text color={borderColor}>{arrowChar}</Text>}
      </Box>
      {arrow === "bottom" && <Text color={borderColor}>{arrowChar}</Text>}
    </Box>
  );
}

// ============================================================================
// TOOLTIP - Simple text tooltip
// ============================================================================

export interface TooltipProps {
  /** Tooltip text */
  text: string;
  /** Arrow position */
  arrow?: "top" | "bottom" | "left" | "right";
  /** Color */
  color?: string;
}

export function Tooltip({
  text,
  arrow = "top",
  color = "gray",
}: TooltipProps): React.ReactElement {
  return (
    <Popover borderColor={color} arrow={arrow} padding={0}>
      <Text dimColor> {text} </Text>
    </Popover>
  );
}
