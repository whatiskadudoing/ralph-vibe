/**
 * @module components/ui/KeyboardHints
 *
 * Reusable keyboard hints component with boxed keys.
 */

import React from "react";
import { Box, Text } from "../../../packages/deno-ink/src/mod.ts";
import { colors } from "./theme.ts";

export interface KeyboardHint {
  key: string;
  label: string;
}

export interface KeyboardHintsProps {
  hints: KeyboardHint[];
  separator?: string;
}

export function KeyboardHints({ hints, separator = "  " }: KeyboardHintsProps): React.ReactElement {
  return (
    <Box flexDirection="row">
      {hints.map((hint, i) => (
        <Text key={hint.key}>
          {i > 0 ? separator : ""}
          <Text color={colors.dim}>{"["}</Text>
          <Text color={colors.accent} bold>{hint.key}</Text>
          <Text color={colors.dim}>{"]"}</Text>
          {" "}
          <Text color={colors.muted}>{hint.label}</Text>
        </Text>
      ))}
    </Box>
  );
}

// Common hint presets
export const navigationHints: KeyboardHint[] = [
  { key: "↑↓", label: "navigate" },
  { key: "space", label: "toggle" },
  { key: "enter", label: "confirm" },
];

export const selectionHints: KeyboardHint[] = [
  { key: "a", label: "select all" },
  { key: "n", label: "select none" },
];

export const exitHints: KeyboardHint[] = [
  { key: "esc", label: "cancel" },
  { key: "ctrl+c", label: "exit" },
];
