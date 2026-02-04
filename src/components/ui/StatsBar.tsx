/**
 * @module components/ui/StatsBar
 *
 * Unified token/cost/usage display component for all commands.
 * Provides a consistent stats bar across the CLI with support for:
 * - Token display with input/output breakdown
 * - Cost calculation and display
 * - Cache efficiency metrics
 * - Subscription usage bars
 * - Delta tracking for iterations
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { formatTokens } from './TokenStats.tsx';
import { type CostBreakdown, formatCost } from '@/services/cost_calculator.ts';
import { UsageBars } from './UsageBars.tsx';
import type { SubscriptionUsage } from '@/services/usage_service.ts';

// ============================================================================
// Types
// ============================================================================

export interface TokenBreakdownData {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface StatsDelta {
  tokens?: number;
  cost?: number;
}

export interface StatsBarProps {
  /** Token breakdown */
  tokens: TokenBreakdownData;

  /** Cost breakdown (optional, for API users) */
  cost?: CostBreakdown;

  /** Cache efficiency percentage (0-100) */
  cacheEfficiency?: number;

  /** Subscription usage (optional, for subscription users) */
  usage?: SubscriptionUsage;

  /** Whether to show cost (default true) */
  showCost?: boolean;

  /** Compact mode for smaller displays */
  compact?: boolean;

  /** Delta from previous iteration */
  delta?: StatsDelta;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets the color for a cost amount.
 * Green < $1, Yellow < $5, Red >= $5
 */
function getCostColor(amount: number): string {
  if (amount < 1) return colors.success;
  if (amount < 5) return colors.warning;
  return colors.error;
}

/**
 * Formats a delta value with + prefix.
 */
function formatDelta(value: number, formatter: (n: number) => string): string {
  if (value === 0) return '';
  return `+${formatter(value)}`;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Compact single-line stats display.
 */
function CompactStats({
  tokens,
  cost,
  cacheEfficiency,
  delta,
  showCost = true,
}: {
  tokens: TokenBreakdownData;
  cost?: CostBreakdown;
  cacheEfficiency?: number;
  delta?: StatsDelta;
  showCost?: boolean;
}): React.ReactElement {
  const totalTokens = tokens.input + tokens.output;

  return (
    <Box flexDirection='row' gap={2}>
      {/* Tokens */}
      <Box flexDirection='row' gap={0}>
        <Text color={colors.dim}>Tokens:</Text>
        <Text color={colors.tokenTotal} bold>
          {formatTokens(totalTokens)}
        </Text>
        {delta?.tokens !== undefined && delta.tokens > 0 && (
          <Text color={colors.tokenOutput}>{formatDelta(delta.tokens, formatTokens)}</Text>
        )}
      </Box>

      {/* Cost */}
      {showCost && cost && (
        <Box flexDirection='row' gap={0}>
          <Text color={colors.dim}>Cost:</Text>
          <Text color={getCostColor(cost.total)} bold>
            {formatCost(cost.total)}
          </Text>
          {delta?.cost !== undefined && delta.cost > 0 && (
            <Text color={getCostColor(delta.cost)}>{formatDelta(delta.cost, formatCost)}</Text>
          )}
        </Box>
      )}

      {/* Cache efficiency */}
      {cacheEfficiency !== undefined && cacheEfficiency > 0 && (
        <Box flexDirection='row' gap={0}>
          <Text color={colors.dim}>Cache:</Text>
          <Text color={colors.success} bold>
            {Math.round(cacheEfficiency)}%
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Full stats display with breakdown.
 */
function FullStats({
  tokens,
  cost,
  cacheEfficiency,
  delta,
  showCost = true,
}: {
  tokens: TokenBreakdownData;
  cost?: CostBreakdown;
  cacheEfficiency?: number;
  delta?: StatsDelta;
  showCost?: boolean;
}): React.ReactElement {
  const totalTokens = tokens.input + tokens.output;

  return (
    <Box flexDirection='row' gap={3}>
      {/* Token breakdown */}
      <Box flexDirection='row' gap={0}>
        <Text color={colors.dim}>Tokens:</Text>
        <Text color={colors.tokenTotal} bold>
          {formatTokens(totalTokens)}
        </Text>
        <Text color={colors.dim}>(</Text>
        <Text color={colors.dim}>↑</Text>
        <Text color={colors.tokenInput}>{formatTokens(tokens.input)}</Text>
        <Text color={colors.dim}></Text>
        <Text color={colors.dim}>↓</Text>
        <Text color={colors.tokenOutput}>{formatTokens(tokens.output)}</Text>
        <Text color={colors.dim}>)</Text>
        {delta?.tokens !== undefined && delta.tokens > 0 && (
          <Text color={colors.tokenOutput}>{formatDelta(delta.tokens, formatTokens)}</Text>
        )}
      </Box>

      {/* Cost */}
      {showCost && cost && (
        <Box flexDirection='row' gap={0}>
          <Text color={colors.dim}>Cost:</Text>
          <Text color={getCostColor(cost.total)} bold>
            {formatCost(cost.total)}
          </Text>
          {delta?.cost !== undefined && delta.cost > 0 && (
            <Text color={getCostColor(delta.cost)}>{formatDelta(delta.cost, formatCost)}</Text>
          )}
        </Box>
      )}

      {/* Cache efficiency */}
      {cacheEfficiency !== undefined && cacheEfficiency > 0 && (
        <Box flexDirection='row' gap={0}>
          <Text color={colors.dim}>Cache:</Text>
          <Text color={colors.success} bold>
            {Math.round(cacheEfficiency)}%
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Unified stats bar component.
 * Displays tokens, cost, cache efficiency, and optionally usage bars.
 */
export function StatsBar({
  tokens,
  cost,
  cacheEfficiency,
  usage,
  showCost = true,
  compact = false,
  delta,
}: StatsBarProps): React.ReactElement {
  return (
    <Box flexDirection='column'>
      {/* Stats line */}
      {compact
        ? (
          <CompactStats
            tokens={tokens}
            cost={cost}
            cacheEfficiency={cacheEfficiency}
            delta={delta}
            showCost={showCost}
          />
        )
        : (
          <FullStats
            tokens={tokens}
            cost={cost}
            cacheEfficiency={cacheEfficiency}
            delta={delta}
            showCost={showCost}
          />
        )}

      {/* Usage bars (if provided) */}
      {usage && (
        <Box marginTop={1}>
          <UsageBars usage={usage} defaultVisible={false} />
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Quick stats bar for token-only display (subscription users).
 */
export function TokenStatsBar({
  tokens,
  cacheEfficiency,
  usage,
  compact = false,
  delta,
}: {
  tokens: TokenBreakdownData;
  cacheEfficiency?: number;
  usage?: SubscriptionUsage;
  compact?: boolean;
  delta?: { tokens?: number };
}): React.ReactElement {
  return (
    <StatsBar
      tokens={tokens}
      cacheEfficiency={cacheEfficiency}
      usage={usage}
      showCost={false}
      compact={compact}
      delta={delta}
    />
  );
}

/**
 * Quick stats bar for API users (with cost).
 */
export function CostStatsBar({
  tokens,
  cost,
  cacheEfficiency,
  compact = false,
  delta,
}: {
  tokens: TokenBreakdownData;
  cost: CostBreakdown;
  cacheEfficiency?: number;
  compact?: boolean;
  delta?: StatsDelta;
}): React.ReactElement {
  return (
    <StatsBar
      tokens={tokens}
      cost={cost}
      cacheEfficiency={cacheEfficiency}
      showCost={true}
      compact={compact}
      delta={delta}
    />
  );
}
