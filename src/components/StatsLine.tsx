/**
 * @module components/StatsLine
 *
 * Horizontal stats display component using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";

export interface StatItem {
  /** Label text (e.g., "model", "ops") */
  label?: string;
  /** Icon to display (e.g., "⏱", "🔄") */
  icon?: string;
  /** Value to display */
  value: string | number;
  /** Color for the value */
  color?: string;
}

export interface StatsLineProps {
  /** Stats items to display */
  items: StatItem[];
  /** Separator between items (default: " · ") */
  separator?: string;
  /** Compact mode - hides labels, shows only icons/values */
  compact?: boolean;
}

export function StatsLine({
  items,
  separator = " · ",
  compact = false,
}: StatsLineProps): React.ReactElement {
  return (
    <Box>
      {items.map((item, index) => (
        <Box key={index}>
          {index > 0 && <Text dimColor>{separator}</Text>}
          {item.icon && <Text>{item.icon} </Text>}
          {item.label && !compact && <Text dimColor>{item.label}: </Text>}
          <Text color={item.color}>{String(item.value)}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Single stat component
export function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}): React.ReactElement {
  return (
    <Box>
      <Text dimColor>{label}: </Text>
      <Text color={color}>{String(value)}</Text>
    </Box>
  );
}

// Icon stat component
export function IconStat({
  icon,
  value,
  color,
}: {
  icon: string;
  value: string | number;
  color?: string;
}): React.ReactElement {
  return (
    <Box>
      <Text>{icon} </Text>
      <Text color={color}>{String(value)}</Text>
    </Box>
  );
}
