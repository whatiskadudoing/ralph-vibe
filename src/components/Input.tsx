/**
 * @module components/Input
 *
 * Input and form display components using deno-ink.
 * Note: For actual interactive input, use deno-ink's TextInput/SelectInput.
 * These are display components for showing input states.
 */

import React, { type ReactNode } from "react";
import { Box, Text } from "@ink/mod.ts";

// Input field display (shows current value state)
export interface InputFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is focused */
  focused?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  hint?: string;
  /** Field type (for display icon) */
  type?: "text" | "password" | "email" | "url";
}

export function InputField({
  label,
  value,
  placeholder,
  focused = false,
  disabled = false,
  error,
  hint,
  type = "text",
}: InputFieldProps): React.ReactElement {
  const displayValue = type === "password" && value ? "•".repeat(value.length) : value;
  const borderColor = error ? "red" : focused ? "cyan" : disabled ? "gray" : undefined;

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor={disabled}>{label}</Text>
        {error && <Text color="red"> *</Text>}
      </Box>
      <Box
        borderStyle="round"
        borderColor={borderColor}
        paddingX={1}
      >
        <Text dimColor={!value && !disabled} color={disabled ? "gray" : undefined}>
          {displayValue || placeholder || " "}
        </Text>
        {focused && <Text color="cyan">│</Text>}
      </Box>
      {error && <Text color="red">{error}</Text>}
      {hint && !error && <Text dimColor>{hint}</Text>}
    </Box>
  );
}

// Checkbox display
export interface CheckboxProps {
  /** Checkbox label */
  label: string;
  /** Whether checked */
  checked?: boolean;
  /** Whether focused */
  focused?: boolean;
  /** Whether disabled */
  disabled?: boolean;
}

export function Checkbox({
  label,
  checked = false,
  focused = false,
  disabled = false,
}: CheckboxProps): React.ReactElement {
  const box = checked ? "[✓]" : "[ ]";
  const color = disabled ? "gray" : focused ? "cyan" : undefined;

  return (
    <Box>
      <Text color={color}>{box}</Text>
      <Text> </Text>
      <Text dimColor={disabled}>{label}</Text>
    </Box>
  );
}

// Radio button display
export interface RadioProps {
  /** Radio label */
  label: string;
  /** Whether selected */
  selected?: boolean;
  /** Whether focused */
  focused?: boolean;
  /** Whether disabled */
  disabled?: boolean;
}

export function Radio({
  label,
  selected = false,
  focused = false,
  disabled = false,
}: RadioProps): React.ReactElement {
  const circle = selected ? "(●)" : "( )";
  const color = disabled ? "gray" : focused ? "cyan" : undefined;

  return (
    <Box>
      <Text color={color}>{circle}</Text>
      <Text> </Text>
      <Text dimColor={disabled}>{label}</Text>
    </Box>
  );
}

// Radio group display
export interface RadioGroupProps {
  /** Group label */
  label?: string;
  /** Options */
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  /** Selected value */
  value?: string;
  /** Focused index */
  focusedIndex?: number;
}

export function RadioGroup({
  label,
  options,
  value,
  focusedIndex,
}: RadioGroupProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {label && <Text bold>{label}</Text>}
      {options.map((option, index) => (
        <React.Fragment key={option.value}>
          <Radio
            label={option.label}
            selected={option.value === value}
            focused={index === focusedIndex}
            disabled={option.disabled}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// Select/dropdown display
export interface SelectDisplayProps {
  /** Select label */
  label: string;
  /** Current value display text */
  value?: string;
  /** Placeholder */
  placeholder?: string;
  /** Whether focused/open */
  focused?: boolean;
  /** Options (shown when focused) */
  options?: Array<{ label: string; value: string }>;
  /** Selected option index */
  selectedIndex?: number;
}

export function SelectDisplay({
  label,
  value,
  placeholder,
  focused = false,
  options,
  selectedIndex,
}: SelectDisplayProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>{label}</Text>
      <Box
        borderStyle="round"
        borderColor={focused ? "cyan" : undefined}
        paddingX={1}
      >
        <Text dimColor={!value}>{value || placeholder || "Select..."}</Text>
        <Text> </Text>
        <Text>{focused ? "▲" : "▼"}</Text>
      </Box>
      {focused && options && (
        <Box
          borderStyle="single"
          flexDirection="column"
          paddingX={1}
        >
          {options.map((option, index) => (
            <Box key={option.value}>
              <Text color={index === selectedIndex ? "cyan" : undefined}>
                {index === selectedIndex ? "› " : "  "}
                {option.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// Form group (container for form fields)
export interface FormGroupProps {
  /** Group title */
  title?: string;
  /** Children (form fields) */
  children: ReactNode;
  /** Spacing between fields */
  gap?: number;
}

export function FormGroup({
  title,
  children,
  gap = 1,
}: FormGroupProps): React.ReactElement {
  return (
    <Box flexDirection="column" gap={gap}>
      {title && (
        <Text bold>{title}</Text>
      )}
      {children}
    </Box>
  );
}

// Form actions (buttons row)
export interface FormActionsProps {
  /** Primary action label */
  primaryLabel?: string;
  /** Secondary action label */
  secondaryLabel?: string;
  /** Primary focused */
  primaryFocused?: boolean;
}

export function FormActions({
  primaryLabel = "Submit",
  secondaryLabel = "Cancel",
  primaryFocused = true,
}: FormActionsProps): React.ReactElement {
  return (
    <Box gap={2} marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={primaryFocused ? "cyan" : undefined}
        paddingX={2}
      >
        <Text bold={primaryFocused}>{primaryLabel}</Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor={!primaryFocused ? "cyan" : undefined}
        paddingX={2}
      >
        <Text dimColor={primaryFocused}>{secondaryLabel}</Text>
      </Box>
    </Box>
  );
}

// Prompt display (question with input area)
export interface PromptProps {
  /** Question text */
  question: string;
  /** Current input */
  input?: string;
  /** Prompt prefix */
  prefix?: string;
}

export function Prompt({
  question,
  input = "",
  prefix = "› ",
}: PromptProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>{question}</Text>
      <Box>
        <Text color="cyan">{prefix}</Text>
        <Text>{input}</Text>
        <Text color="cyan">│</Text>
      </Box>
    </Box>
  );
}

// Confirmation prompt
export interface ConfirmProps {
  /** Question text */
  question: string;
  /** Whether focused on Yes */
  yesSelected?: boolean;
}

export function Confirm({
  question,
  yesSelected = true,
}: ConfirmProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>{question}</Text>
      <Box gap={2}>
        <Text color={yesSelected ? "green" : undefined} bold={yesSelected}>
          {yesSelected ? "› " : "  "}Yes
        </Text>
        <Text color={!yesSelected ? "red" : undefined} bold={!yesSelected}>
          {!yesSelected ? "› " : "  "}No
        </Text>
      </Box>
    </Box>
  );
}
