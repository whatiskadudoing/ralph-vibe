/**
 * @module components/Badge
 *
 * Badge/tag component using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";

export interface BadgeProps {
  /** Badge text */
  text: string;
  /** Text color */
  color?: string;
  /** Icon to display before text */
  icon?: string;
}

export function Badge({ text, color, icon }: BadgeProps): React.ReactElement {
  return (
    <Box>
      {icon && <Text color={color}>{icon} </Text>}
      <Text color={color}>{text}</Text>
    </Box>
  );
}

// Model badge with predefined colors
const MODEL_COLORS: Record<string, string> = {
  opus: "#FF9500", // amber/orange
  sonnet: "cyan",
  haiku: "gray",
};

export function ModelBadge({
  model,
}: {
  model: "opus" | "sonnet" | "haiku" | string;
}): React.ReactElement {
  const color = MODEL_COLORS[model] ?? "white";
  return <Badge text={model} color={color} icon="●" />;
}

// Status badge
export function StatusBadge({
  status,
  color,
}: {
  status: string;
  color?: string;
}): React.ReactElement {
  return <Badge text={status.toUpperCase()} color={color} />;
}

// Label badge (bracketed)
export function LabelBadge({
  label,
  color,
}: {
  label: string;
  color?: string;
}): React.ReactElement {
  return (
    <Box>
      <Text dimColor>[</Text>
      <Text color={color}>{label}</Text>
      <Text dimColor>]</Text>
    </Box>
  );
}
