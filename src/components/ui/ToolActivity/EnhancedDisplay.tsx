/**
 * @module components/ui/ToolActivity/EnhancedDisplay
 *
 * Enhanced tool display components with tree connectors and input previews.
 */

import React from 'react';
import { Box, Text } from '../../../../packages/deno-ink/src/mod.ts';
import { colors } from '../theme.ts';
import type { EnhancedToolCall } from './types.ts';
import { STATUS_INDICATORS, TREE_BRANCH, TREE_LAST } from './constants.ts';
import {
  formatDuration,
  getInputPreview,
  getModelBadge,
  getModelBadgeColor,
  getToolColor,
  getToolIcon,
} from './utils.ts';
import { LiveDuration, SpinnerIcon } from './AnimatedComponents.tsx';

// ============================================================================
// Enhanced Tool Row
// ============================================================================

export interface EnhancedToolRowProps {
  tool: EnhancedToolCall;
  isLast: boolean;
  showInputPreview?: boolean;
  showSubagents?: boolean;
  maxWidth?: number;
}

/**
 * Enhanced tool row with tree connector, icon, input preview, and badges
 */
export function EnhancedToolRow({
  tool,
  isLast,
  showInputPreview = true,
  showSubagents = true,
  maxWidth = 80,
}: EnhancedToolRowProps): React.ReactElement {
  const connector = isLast ? TREE_LAST : TREE_BRANCH;
  const icon = getToolIcon(tool.name);
  const iconColor = getToolColor(tool.name);
  const statusInfo = STATUS_INDICATORS[tool.status];
  const isRunning = tool.status === 'running';

  // Build the display text
  const parts: React.ReactNode[] = [];

  // Icon
  parts.push(
    <Text key='icon' color={iconColor}>
      {icon}
    </Text>,
  );

  // Tool name or input preview
  if (showInputPreview) {
    const preview = getInputPreview(tool, maxWidth - 20);
    parts.push(
      <Text key='preview' color={colors.text}>
        {' '}
        {tool.name} {preview}
      </Text>,
    );
  } else {
    parts.push(
      <Text key='name' color={colors.text}>
        {' '}
        {tool.name}
      </Text>,
    );
  }

  // Subagent model badge for Task
  if (showSubagents && tool.name === 'Task' && tool.subagentModel) {
    const badge = getModelBadge(tool.subagentModel);
    const badgeColor = getModelBadgeColor(tool.subagentModel);
    parts.push(
      <Text key='badge' color={badgeColor}>
        {' '}
        {badge}
      </Text>,
    );
  }

  // Spacer before status
  parts.push(
    <Text key='spacer' color={colors.dim}>
      {' '}
    </Text>,
  );

  // Status indicator or spinner
  if (isRunning) {
    parts.push(
      <Box key='status'>
        <SpinnerIcon color={statusInfo.color} />
      </Box>,
    );
  } else {
    parts.push(
      <Text key='status' color={statusInfo.color}>
        {statusInfo.char}
      </Text>,
    );
  }

  // Duration
  if (tool.startTime) {
    if (isRunning && !tool.endTime) {
      parts.push(<Text key='duration-space'></Text>);
      parts.push(
        <Box key='duration'>
          <LiveDuration startTime={tool.startTime} />
        </Box>,
      );
    } else {
      const duration = formatDuration(tool.startTime, tool.endTime);
      parts.push(
        <Text key='duration' color={colors.dim}>
          {' '}
          {duration}
        </Text>,
      );
    }
  }

  return (
    <Box flexDirection='row'>
      <Text color={colors.dim}>{connector}</Text>
      {parts}
    </Box>
  );
}

// ============================================================================
// Enhanced Tool Activity
// ============================================================================

export interface EnhancedToolActivityProps {
  tools: EnhancedToolCall[];
  maxVisible?: number;
  showTimeline?: boolean;
  showSubagents?: boolean;
  showInputPreview?: boolean;
  maxWidth?: number;
}

/**
 * Enhanced tool activity display with tree connectors and input previews
 */
export function EnhancedToolActivity({
  tools,
  maxVisible = 5,
  showTimeline: _showTimeline = true,
  showSubagents = true,
  showInputPreview = true,
  maxWidth = 80,
}: EnhancedToolActivityProps): React.ReactElement {
  const visibleTools = tools.slice(-maxVisible);
  const hiddenCount = tools.length - visibleTools.length;

  return (
    <Box flexDirection='column'>
      {hiddenCount > 0 && (
        <Box flexDirection='row'>
          <Text color={colors.dim}>... {hiddenCount} more tools above</Text>
        </Box>
      )}

      {visibleTools.map((tool, index) => (
        <React.Fragment key={tool.id}>
          <EnhancedToolRow
            tool={tool}
            isLast={index === visibleTools.length - 1}
            showInputPreview={showInputPreview}
            showSubagents={showSubagents}
            maxWidth={maxWidth}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}
