/**
 * @module components/ui/ContextBar
 *
 * Displays context window usage with a visual progress bar.
 * Color-coded to warn when approaching limits.
 *
 * Inspired by:
 * - Cline: Progress bar (14x7px) with hover details, warning when >60%
 * - Continue: Small rectangular bar with color coding (red when pruning)
 * - Claude Code: Status line JSON with context_window.used_percentage
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

// ============================================================================
// Types
// ============================================================================

export interface ContextBarProps {
  /** Tokens currently used */
  used: number;
  /** Maximum context window size */
  max: number;
  /** Tokens in cache (optional, shown separately) */
  cacheTokens?: number;
  /** Threshold for warning color (default: 0.6 = 60%) */
  warningThreshold?: number;
  /** Threshold for danger color (default: 0.85 = 85%) */
  dangerThreshold?: number;
  /** Width of the progress bar in characters (default: 15) */
  barWidth?: number;
  /** Show percentage number */
  showPercentage?: boolean;
  /** Show token counts */
  showCounts?: boolean;
  /** Compact mode - just the bar */
  compact?: boolean;
  /** Label text (default: "ctx") */
  label?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats token count for display.
 * e.g., 1500 -> "1.5K", 150000 -> "150K", 1500000 -> "1.5M"
 */
function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 10_000) {
    return `${Math.round(count / 1_000)}K`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return String(count);
}

// ============================================================================
// Component
// ============================================================================

/**
 * Context window usage bar.
 *
 * Examples:
 * - Normal: "ctx: ████████░░░░░░░ 52K/200K"
 * - Warning: "ctx: ████████████░░░ 120K/200K (60%)"
 * - Danger: "ctx: ██████████████░ 170K/200K ⚠"
 */
export function ContextBar({
  used,
  max,
  cacheTokens,
  warningThreshold = 0.6,
  dangerThreshold = 0.85,
  barWidth = 15,
  showPercentage = true,
  showCounts = true,
  compact = false,
  label = 'ctx',
}: ContextBarProps): React.ReactElement {
  // Calculate percentage
  const percentage = max > 0 ? used / max : 0;
  const isWarning = percentage >= warningThreshold;
  const isDanger = percentage >= dangerThreshold;

  // Determine bar color
  const barColor = isDanger ? colors.error : isWarning ? colors.warning : colors.success;

  // Build the progress bar
  const filledCount = Math.min(Math.round(percentage * barWidth), barWidth);
  const emptyCount = barWidth - filledCount;
  const filledChar = '█';
  const emptyChar = '░';
  const bar = filledChar.repeat(filledCount) + emptyChar.repeat(emptyCount);

  // Warning indicator
  const warningIndicator = isDanger ? ' ⚠' : '';

  if (compact) {
    return (
      <Box flexDirection='row'>
        <Text color={barColor}>{bar}</Text>
        {warningIndicator && <Text color={colors.error}>{warningIndicator}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={colors.dim}>{label}:</Text>
      <Text color={barColor}>{bar}</Text>

      {showCounts && (
        <Text color={colors.dim}>
          {formatTokens(used)}/{formatTokens(max)}
        </Text>
      )}

      {showPercentage && isWarning && (
        <Text color={barColor}>
          ({Math.round(percentage * 100)}%)
        </Text>
      )}

      {cacheTokens !== undefined && cacheTokens > 0 && (
        <Text color={colors.info}>
          +{formatTokens(cacheTokens)} cache
        </Text>
      )}

      {warningIndicator && <Text color={colors.error}>{warningIndicator}</Text>}
    </Box>
  );
}

// ============================================================================
// Detailed Context Display
// ============================================================================

export interface ContextDetailsProps {
  /** Tokens currently used */
  used: number;
  /** Maximum context window size */
  max: number;
  /** Input tokens in current message */
  inputTokens?: number;
  /** Output tokens in current message */
  outputTokens?: number;
  /** Cache read tokens */
  cacheReadTokens?: number;
  /** Cache write tokens */
  cacheWriteTokens?: number;
}

/**
 * Detailed context window breakdown.
 */
export function ContextDetails({
  used,
  max,
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens,
}: ContextDetailsProps): React.ReactElement {
  const remaining = max - used;
  const percentage = max > 0 ? (used / max) * 100 : 0;

  return (
    <Box flexDirection='column' paddingLeft={2}>
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>used:</Text>
        <Text color={colors.muted}>{formatTokens(used)}</Text>
        <Text color={colors.dim}>({percentage.toFixed(1)}%)</Text>
      </Box>

      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>remaining:</Text>
        <Text color={remaining < 20000 ? colors.warning : colors.success}>
          {formatTokens(remaining)}
        </Text>
      </Box>

      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>max:</Text>
        <Text color={colors.muted}>{formatTokens(max)}</Text>
      </Box>

      {inputTokens !== undefined && (
        <Box flexDirection='row' gap={1} marginTop={1}>
          <Text color={colors.dim}>input:</Text>
          <Text color={colors.muted}>{formatTokens(inputTokens)}</Text>
        </Box>
      )}

      {outputTokens !== undefined && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>output:</Text>
          <Text color={colors.muted}>{formatTokens(outputTokens)}</Text>
        </Box>
      )}

      {cacheReadTokens !== undefined && cacheReadTokens > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>cache read:</Text>
          <Text color={colors.success}>{formatTokens(cacheReadTokens)}</Text>
        </Box>
      )}

      {cacheWriteTokens !== undefined && cacheWriteTokens > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>cache write:</Text>
          <Text color={colors.info}>{formatTokens(cacheWriteTokens)}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Mini Context Indicator
// ============================================================================

export interface ContextIndicatorProps {
  /** Tokens currently used */
  used: number;
  /** Maximum context window size */
  max: number;
  /** Whether context is actively growing */
  isGrowing?: boolean;
}

/**
 * Minimal context indicator for headers.
 * Just shows percentage with color coding.
 */
export function ContextIndicator({
  used,
  max,
  isGrowing,
}: ContextIndicatorProps): React.ReactElement {
  const percentage = max > 0 ? (used / max) * 100 : 0;

  const indicatorColor = percentage >= 85
    ? colors.error
    : percentage >= 60
    ? colors.warning
    : colors.success;

  const growthIndicator = isGrowing ? '↑' : '';

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={colors.dim}>ctx:</Text>
      <Text color={indicatorColor}>
        {Math.round(percentage)}%{growthIndicator}
      </Text>
    </Box>
  );
}
