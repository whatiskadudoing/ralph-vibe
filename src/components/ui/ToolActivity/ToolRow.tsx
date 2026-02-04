/**
 * @module components/ui/ToolActivity/ToolRow
 *
 * Tool row components for displaying individual tool operations.
 * Includes standard rows, nested rows, and task rows with nested operations.
 */

import React from 'react';
import { Box, Text } from '../../../../packages/deno-ink/src/mod.ts';
import { colors } from '../theme.ts';
import type { EnhancedToolCall } from './types.ts';
import {
  COL_TOOL_NAME,
  NESTED_INDENT,
  STATUS_INDICATORS,
  TOOL_ICONS,
  TREE_BRANCH,
  TREE_LAST,
} from './constants.ts';
import { extractDetailSmart, formatDuration, formatToolInput, padEnd, truncate } from './utils.ts';
import { getActivityDescription } from './descriptions.ts';
import { SpinnerIcon } from './AnimatedComponents.tsx';

// ============================================================================
// Standard Tool Row
// ============================================================================

export interface ToolRowProps {
  tool: EnhancedToolCall;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
  /** Use natural language description instead of tool name + detail */
  useNaturalLanguage?: boolean;
}

/**
 * Single tool row with multi-column layout
 */
export function ToolRow({
  tool,
  detailWidth,
  resultWidth: _resultWidth,
  showTiming,
  showResult: _showResult,
  dimRow,
  useNaturalLanguage = false,
}: ToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: '\u25B8',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  // Dim completed tools when there are running tools
  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  const durationStr = formatDuration(tool.startTime, tool.endTime);

  // Use natural language or traditional tool name + detail
  if (useNaturalLanguage) {
    const activityText = getActivityDescription(tool);
    const totalWidth = COL_TOOL_NAME + detailWidth;

    return (
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {/* Icon column */}
        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text></Text>

        {/* Natural language description (takes full width) */}
        <Text color={textColor}>{padEnd(truncate(activityText, totalWidth), totalWidth)}</Text>

        {/* Timing column */}
        {showTiming && (
          <Text color={colors.dim}>
            {padEnd(durationStr, 7)}
          </Text>
        )}

        {/* Status indicator */}
        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>
    );
  }

  // Traditional display: tool name + detail
  const formatted = formatToolInput(tool);
  const hasSecondaryInfo = formatted.secondary !== undefined;

  return (
    <Box flexDirection='column'>
      {/* Primary row */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {/* Icon column */}
        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text></Text>

        {/* Tool name column */}
        <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME)}</Text>

        {/* Detail column (flexible width) */}
        <Text color={detailColor}>
          {padEnd(truncate(formatted.primary, detailWidth), detailWidth)}
        </Text>

        {/* Timing column */}
        {showTiming && (
          <Text color={colors.dim}>
            {padEnd(durationStr, 7)}
          </Text>
        )}

        {/* Status indicator */}
        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Secondary row (if present) - for WebFetch prompt, etc */}
      {hasSecondaryInfo && formatted.secondary && (
        <Box flexDirection='row'>
          <Text color={colors.dim}></Text>
          <Text color={colors.dim}>
            {truncate(formatted.secondary, detailWidth + COL_TOOL_NAME)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Nested Tool Row
// ============================================================================

export interface NestedToolRowProps {
  tool: EnhancedToolCall;
  isLast: boolean;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
}

/**
 * Nested tool row with tree connector
 */
export function NestedToolRow({
  tool,
  isLast,
  detailWidth,
  resultWidth: _resultWidth,
  showTiming,
  showResult: _showResult,
  dimRow,
}: NestedToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: '\u25B8',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  const detail = extractDetailSmart(tool, detailWidth - NESTED_INDENT);
  const durationStr = formatDuration(tool.startTime, tool.endTime);

  const connector = isLast ? TREE_LAST : TREE_BRANCH;

  return (
    <Box flexDirection='row'>
      <Text color={colors.dim}>{connector}</Text>

      {/* Icon */}
      {isRunning
        ? <SpinnerIcon color={iconColor} />
        : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
      <Text></Text>

      {/* Tool name */}
      <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME - 2)}</Text>

      {/* Detail (reduced width for nesting) */}
      <Text color={detailColor}>
        {padEnd(detail, detailWidth - NESTED_INDENT)}
      </Text>

      {/* Timing */}
      {showTiming && <Text color={colors.dim}>{padEnd(durationStr, 7)}</Text>}

      {/* Status */}
      <Text color={statusInfo.color}>{statusInfo.char}</Text>
    </Box>
  );
}

// ============================================================================
// Task Row with Nested Operations
// ============================================================================

export interface TaskRowWithNestedProps {
  tool: EnhancedToolCall;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
  showNested: boolean;
  maxNestedVisible?: number;
}

/**
 * Task tool row with nested operations displayed in tree structure
 */
export function TaskRowWithNested({
  tool,
  detailWidth,
  resultWidth,
  showTiming,
  showResult,
  dimRow,
  showNested,
  maxNestedVisible = 5,
}: TaskRowWithNestedProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: '\u25B8',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  // Extract task description
  const taskDesc = String(tool.input.description ?? tool.input.task ?? '');
  const detail = `"${truncate(taskDesc, detailWidth - 10)}"`;

  const durationStr = formatDuration(tool.startTime, tool.endTime);

  // Determine which nested tools to show
  const nestedTools = tool.nested ?? [];
  const visibleNested = showNested ? nestedTools.slice(-maxNestedVisible) : [];
  const hiddenCount = nestedTools.length - visibleNested.length;

  return (
    <Box flexDirection='column'>
      {/* Main task row */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text></Text>

        <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME)}</Text>
        <Text color={detailColor}>{padEnd(detail, detailWidth)}</Text>

        {showTiming && <Text color={colors.dim}>{padEnd(durationStr, 7)}</Text>}

        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Hidden nested count indicator */}
      {showNested && hiddenCount > 0 && (
        <Box flexDirection='row'>
          <Text color={colors.dim}></Text>
          <Text color={colors.dim}>... {hiddenCount} more operations</Text>
        </Box>
      )}

      {/* Nested tools */}
      {visibleNested.map((nestedTool, index) => (
        <React.Fragment key={nestedTool.id}>
          <NestedToolRow
            tool={nestedTool}
            isLast={index === visibleNested.length - 1}
            detailWidth={detailWidth}
            resultWidth={resultWidth}
            showTiming={showTiming}
            showResult={showResult}
            dimRow={dimRow}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}
