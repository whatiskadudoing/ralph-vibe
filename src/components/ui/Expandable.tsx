/**
 * @module components/ui/Expandable
 *
 * Expandable section component with keyboard shortcut support.
 * Collapsed by default per user preference.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "../../../packages/deno-ink/src/mod.ts";
import { colors } from "./theme.ts";

export interface ExpandableProps {
  /**
   * Title displayed on the collapsed/expanded header
   */
  title: string;
  /**
   * Single character keyboard shortcut to toggle (e.g., 'u' for usage)
   */
  shortcut?: string;
  /**
   * Whether the section starts expanded. Default: false (collapsed)
   */
  defaultExpanded?: boolean;
  /**
   * Content to show when expanded
   */
  children: React.ReactNode;
  /**
   * Callback when expanded state changes
   */
  onToggle?: (expanded: boolean) => void;
}

/**
 * Expandable section component.
 *
 * @example
 * ```tsx
 * <Expandable title="Subscription Usage" shortcut="u">
 *   <UsageBars fiveHour={72} sevenDay={23} />
 * </Expandable>
 * ```
 */
export function Expandable({
  title,
  shortcut,
  defaultExpanded = false,
  children,
  onToggle,
}: ExpandableProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    setExpanded((prev: boolean) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  useInput((input) => {
    if (shortcut && input.toLowerCase() === shortcut.toLowerCase()) {
      toggle();
    }
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color={expanded ? colors.accent : colors.dim}>
          {expanded ? "▼" : "▶"}
        </Text>
        <Text color={expanded ? colors.text : colors.muted}>{title}</Text>
        {shortcut && (
          <Text color={colors.dim}>
            [{shortcut}]
          </Text>
        )}
      </Box>
      {expanded && (
        <Box marginLeft={2} marginTop={0}>
          {children}
        </Box>
      )}
    </Box>
  );
}
