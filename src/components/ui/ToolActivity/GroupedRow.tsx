/**
 * @module components/ui/ToolActivity/GroupedRow
 *
 * Grouped operations row component for displaying batched tool operations.
 */

import React from 'react';
import { Box, Text } from '../../../../packages/deno-ink/src/mod.ts';
import { colors } from '../theme.ts';
import type { ToolGroup } from './types.ts';
import { COL_TOOL_NAME, STATUS_INDICATORS, TOOL_ICONS } from './constants.ts';
import { extractDetail, formatDurationMs, padEnd, truncate } from './utils.ts';
import { SpinnerIcon } from './AnimatedComponents.tsx';

// ============================================================================
// Grouped Row Component
// ============================================================================

export interface GroupedRowProps {
  group: ToolGroup;
  detailWidth: number;
  showTiming: boolean;
  dimRow: boolean;
}

/**
 * Grouped operations row showing count and file list
 */
export function GroupedRow({
  group,
  detailWidth,
  showTiming,
  dimRow,
}: GroupedRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[group.name] ?? {
    icon: '\u25B8',
    color: colors.dim,
  };

  const isRunning = group.hasRunning;
  const statusInfo = group.hasError
    ? STATUS_INDICATORS.error
    : group.hasRunning
    ? STATUS_INDICATORS.running
    : STATUS_INDICATORS.success;

  const textColor = dimRow && !isRunning ? colors.dim : colors.muted;

  // Build file/pattern list
  const items: string[] = [];
  for (const tool of group.tools) {
    const detail = extractDetail(tool);
    if (detail && !items.includes(detail)) {
      items.push(detail);
    }
  }

  // Format display with count
  const countStr = `(${group.tools.length})`;
  const nameWithCount = `${group.name} ${countStr}`;

  // Build items preview
  const maxItemsToShow = 2;
  const shownItems = items.slice(0, maxItemsToShow);
  const moreCount = items.length - maxItemsToShow;
  let itemsStr = shownItems.join(', ');
  if (moreCount > 0) {
    itemsStr += `, +${moreCount} more`;
  }

  const durationStr = formatDurationMs(group.totalDuration);

  return (
    <Box flexDirection='column'>
      {/* Group header */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text></Text>

        <Text color={textColor} bold={isRunning}>
          {padEnd(nameWithCount, COL_TOOL_NAME + 4)}
        </Text>

        {showTiming && <Text color={colors.dim}>{padEnd(durationStr, 7)}</Text>}

        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Items list */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>
        <Text color={colors.dim}>
          {truncate(itemsStr, detailWidth + COL_TOOL_NAME)}
        </Text>
      </Box>
    </Box>
  );
}
