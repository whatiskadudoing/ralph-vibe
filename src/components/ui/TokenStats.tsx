/**
 * @module components/ui/TokenStats
 *
 * Token consumption display for subscription users.
 * Shows input/output/total tokens prominently instead of cost.
 *
 * For subscription users, tokens matter more than cost because:
 * - They pay a fixed subscription fee
 * - Token consumption affects context window limits
 * - Understanding token usage helps optimize prompts
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

// ============================================================================
// Types
// ============================================================================

export interface TokenStatsProps {
  /** Input tokens (sent to Claude) */
  inputTokens: number;
  /** Output tokens (received from Claude) */
  outputTokens: number;
  /** Cached tokens read (saved from prompt cache) */
  cacheReadTokens?: number;
  /** Cached tokens written (added to prompt cache) */
  cacheWriteTokens?: number;
  /** Show delta from previous iteration */
  iterationDelta?: {
    input: number;
    output: number;
  };
  /** Compact display mode */
  compact?: boolean;
  /** Show cache stats */
  showCache?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats token count with K/M suffix.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 10_000) return `${(tokens / 1_000).toFixed(0)}K`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

/**
 * Formats tokens with breakdown for detailed display.
 */
export function formatTokenBreakdown(input: number, output: number): string {
  return `${formatTokens(input)} in / ${formatTokens(output)} out`;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Compact token display badge.
 * Shows total tokens with optional breakdown on hover/expand.
 */
export function TokenBadge({
  inputTokens,
  outputTokens,
  iterationDelta,
}: {
  inputTokens: number;
  outputTokens: number;
  iterationDelta?: { input: number; output: number };
}): React.ReactElement {
  const total = inputTokens + outputTokens;
  const totalStr = formatTokens(total);

  // Show delta if available
  const deltaTotal = iterationDelta ? iterationDelta.input + iterationDelta.output : 0;
  const deltaStr = deltaTotal > 0 ? `+${formatTokens(deltaTotal)}` : null;

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={colors.dim}>tokens:</Text>
      <Text color={colors.tokenTotal} bold>{totalStr}</Text>
      {deltaStr && <Text color={colors.tokenOutput}>{deltaStr}</Text>}
    </Box>
  );
}

/**
 * Detailed token breakdown display.
 * Shows input/output separately with cache stats.
 */
export function TokenBreakdown({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens: _cacheWriteTokens,
}: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): React.ReactElement {
  return (
    <Box flexDirection='column'>
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>↑</Text>
        <Text color={colors.tokenInput}>{formatTokens(inputTokens)}</Text>
        <Text color={colors.dim}>in</Text>
        <Text color={colors.dim}>·</Text>
        <Text color={colors.dim}>↓</Text>
        <Text color={colors.tokenOutput}>{formatTokens(outputTokens)}</Text>
        <Text color={colors.dim}>out</Text>
      </Box>
      {(cacheReadTokens !== undefined && cacheReadTokens > 0) && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>💾</Text>
          <Text color={colors.tokenCache}>{formatTokens(cacheReadTokens)}</Text>
          <Text color={colors.dim}>cached (saved)</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Main TokenStats component.
 * Flexible display of token consumption.
 */
export function TokenStats({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens: _cacheWriteTokens,
  iterationDelta,
  compact = false,
  showCache = true,
}: TokenStatsProps): React.ReactElement {
  const total = inputTokens + outputTokens;

  // Compact mode - single line
  if (compact) {
    return (
      <TokenBadge
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        iterationDelta={iterationDelta}
      />
    );
  }

  // Full mode - detailed breakdown
  return (
    <Box flexDirection='column'>
      {/* Total tokens prominently */}
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>📊</Text>
        <Text color={colors.tokenTotal} bold>{formatTokens(total)}</Text>
        <Text color={colors.dim}>tokens</Text>
        {iterationDelta && (
          <Text color={colors.tokenOutput}>
            (+{formatTokens(iterationDelta.input + iterationDelta.output)})
          </Text>
        )}
      </Box>

      {/* Input/output breakdown */}
      <Box flexDirection='row' gap={1} marginLeft={3}>
        <Text color={colors.tokenInput}>{formatTokens(inputTokens)}</Text>
        <Text color={colors.dim}>in</Text>
        <Text color={colors.dim}>·</Text>
        <Text color={colors.tokenOutput}>{formatTokens(outputTokens)}</Text>
        <Text color={colors.dim}>out</Text>
      </Box>

      {/* Cache stats if available and enabled */}
      {showCache && cacheReadTokens !== undefined && cacheReadTokens > 0 && (
        <Box flexDirection='row' gap={1} marginLeft={3}>
          <Text color={colors.tokenCache}>{formatTokens(cacheReadTokens)}</Text>
          <Text color={colors.dim}>cached</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Session Token Summary
// ============================================================================

export interface SessionTokenSummaryProps {
  /** Total input tokens for session */
  totalInputTokens: number;
  /** Total output tokens for session */
  totalOutputTokens: number;
  /** Total cache tokens saved */
  cacheTokensSaved: number;
  /** Number of iterations */
  iterations?: number;
}

/**
 * Token summary for completed sessions.
 * Shows total consumption with efficiency metrics.
 */
export function SessionTokenSummary({
  totalInputTokens,
  totalOutputTokens,
  cacheTokensSaved,
  iterations,
}: SessionTokenSummaryProps): React.ReactElement {
  const total = totalInputTokens + totalOutputTokens;
  const avgPerIteration = iterations && iterations > 0 ? Math.round(total / iterations) : 0;

  return (
    <Box flexDirection='column'>
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>📊</Text>
        <Text bold>{formatTokens(total)}</Text>
        <Text color={colors.dim}>tokens consumed</Text>
      </Box>
      <Box flexDirection='row' gap={1} marginLeft={3}>
        <Text color={colors.tokenInput}>{formatTokens(totalInputTokens)}</Text>
        <Text color={colors.dim}>in</Text>
        <Text color={colors.dim}>·</Text>
        <Text color={colors.tokenOutput}>{formatTokens(totalOutputTokens)}</Text>
        <Text color={colors.dim}>out</Text>
      </Box>
      {cacheTokensSaved > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>💾</Text>
          <Text color={colors.tokenCache} bold>{formatTokens(cacheTokensSaved)}</Text>
          <Text color={colors.dim}>tokens saved by cache</Text>
        </Box>
      )}
      {avgPerIteration > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>📈</Text>
          <Text>{formatTokens(avgPerIteration)}</Text>
          <Text color={colors.dim}>avg per iteration</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Inline Token Display
// ============================================================================

/**
 * Inline token count for use in stats lines.
 * Example: "45K tokens (12K in / 33K out)"
 */
export function InlineTokens({
  inputTokens,
  outputTokens,
  showBreakdown = true,
}: {
  inputTokens: number;
  outputTokens: number;
  showBreakdown?: boolean;
}): React.ReactElement {
  const total = inputTokens + outputTokens;

  if (!showBreakdown) {
    return <Text color={colors.tokenTotal}>{formatTokens(total)} tokens</Text>;
  }

  return (
    <Box flexDirection='row' gap={0}>
      <Text color={colors.tokenTotal}>{formatTokens(total)}</Text>
      <Text color={colors.dim}>tokens (</Text>
      <Text color={colors.tokenInput}>{formatTokens(inputTokens)}</Text>
      <Text color={colors.dim}>in /</Text>
      <Text color={colors.tokenOutput}>{formatTokens(outputTokens)}</Text>
      <Text color={colors.dim}>out)</Text>
    </Box>
  );
}
