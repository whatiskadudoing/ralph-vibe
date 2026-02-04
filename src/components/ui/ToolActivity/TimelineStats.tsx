/**
 * @module components/ui/ToolActivity/TimelineStats
 *
 * Timeline visualization and stats summary components.
 */

import React from 'react';
import { Box, Text } from '../../../../packages/deno-ink/src/mod.ts';
import { colors } from '../theme.ts';
import type { EnhancedToolCall, ToolStats } from './types.ts';
import { formatDurationMs, truncate } from './utils.ts';

// ============================================================================
// Timeline Component
// ============================================================================

export interface TimelineProps {
  tools: EnhancedToolCall[];
  width: number;
}

/**
 * Visual timeline showing operation progress as dots
 */
export function Timeline({ tools, width }: TimelineProps): React.ReactElement {
  // Limit number of dots based on width
  const maxDots = Math.min(tools.length, Math.floor((width - 10) / 3));
  const visibleTools = tools.slice(-maxDots);

  return (
    <Box flexDirection='column'>
      <Box flexDirection='row'>
        <Text color={colors.dim}>Tools</Text>

        {/* Connection line and dots */}
        {visibleTools.map((tool, index) => {
          const statusColor = tool.status === 'error'
            ? colors.error
            : tool.status === 'running'
            ? colors.accent
            : tool.status === 'success'
            ? colors.success
            : colors.dim;

          const dotChar = '\u25CF'; // "●"
          const lineChar = index < visibleTools.length - 1 ? '\u2500\u2500' : ''; // "──"

          return (
            <React.Fragment key={tool.id}>
              <Text color={statusColor}>{dotChar}</Text>
              {lineChar && <Text color={colors.dim}>{lineChar}</Text>}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Tool names below (abbreviated) */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {visibleTools.map((tool, index) => {
          const abbrev = tool.name.slice(0, 4);
          const spacing = index < visibleTools.length - 1 ? '  ' : '';

          return (
            <React.Fragment key={tool.id}>
              <Text color={colors.dim}>{abbrev}</Text>
              {spacing && <Text>{spacing}</Text>}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}

// ============================================================================
// Stats Summary Component
// ============================================================================

export interface StatsSummaryProps {
  stats: ToolStats;
  width: number;
}

/**
 * Stats summary row showing operation counts
 */
export function StatsSummary({ stats, width }: StatsSummaryProps): React.ReactElement {
  // Build type counts string
  const typeCounts = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ');

  const durationStr = stats.totalDuration > 0 ? formatDurationMs(stats.totalDuration) : '';

  const summaryParts: string[] = [];
  summaryParts.push(`${stats.total} operations`);
  if (durationStr) {
    summaryParts.push(durationStr);
  }

  const summary = summaryParts.join(' \u00B7 '); // " · "
  const fullLine = typeCounts ? `${summary} \u00B7 ${typeCounts}` : summary;

  const maxWidth = width - 4; // Account for borders

  return (
    <Box flexDirection='row'>
      <Text color={colors.dim}></Text>
      <Text color={colors.muted}>{truncate(fullLine, maxWidth)}</Text>
    </Box>
  );
}
