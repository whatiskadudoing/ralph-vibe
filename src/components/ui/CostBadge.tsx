/**
 * @module components/ui/CostBadge
 *
 * Displays API cost information prominently.
 * Shows session total with optional iteration delta.
 *
 * Inspired by:
 * - Aider: "$X.XX message, $Y.YY session" after each response
 * - Cline: Badge in task header showing "$0.0034"
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { type CostBreakdown, formatCost } from '../../services/cost_calculator.ts';

// ============================================================================
// Types
// ============================================================================

export interface CostBadgeProps {
  /** Total session cost in USD */
  sessionCost: number;
  /** Current/last iteration cost in USD (optional) */
  iterationCost?: number;
  /** Show trend indicator when cost is high */
  showTrend?: boolean;
  /** Cost threshold for "high" indicator (default: 0.05) */
  highThreshold?: number;
  /** Compact mode - just the number */
  compact?: boolean;
  /** Show breakdown on hover/expand */
  breakdown?: CostBreakdown;
  /** Whether to show the label */
  showLabel?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Cost badge displaying session and iteration costs.
 *
 * Examples:
 * - Compact: "$0.0234"
 * - Normal: "cost: $0.0234"
 * - With delta: "cost: $0.0234 (+$0.0089)"
 * - High cost: "cost: $0.1234 ↑"
 */
export function CostBadge({
  sessionCost,
  iterationCost,
  showTrend = false,
  highThreshold = 0.05,
  compact = false,
  showLabel = true,
}: CostBadgeProps): React.ReactElement {
  const isHigh = sessionCost > highThreshold;
  const costColor = isHigh ? colors.warning : colors.success;

  // Format the costs
  const sessionStr = formatCost(sessionCost);
  const deltaStr = iterationCost && iterationCost > 0 ? `+${formatCost(iterationCost)}` : null;

  // Trend indicator
  const trendIndicator = showTrend && isHigh ? ' ↑' : '';

  if (compact) {
    return (
      <Box flexDirection='row'>
        <Text color={costColor}>{sessionStr}</Text>
        {deltaStr && <Text color={colors.dim}>({deltaStr})</Text>}
        {trendIndicator && <Text color={colors.warning}>{trendIndicator}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection='row' gap={1}>
      {showLabel && <Text color={colors.dim}>cost:</Text>}
      <Text color={costColor}>{sessionStr}</Text>
      {deltaStr && <Text color={colors.dim}>({deltaStr})</Text>}
      {trendIndicator && <Text color={colors.warning}>{trendIndicator}</Text>}
    </Box>
  );
}

// ============================================================================
// Detailed Cost Display
// ============================================================================

export interface CostDetailsProps {
  /** Full cost breakdown */
  breakdown: CostBreakdown;
  /** Model name for display */
  model?: string;
  /** Cache efficiency percentage */
  cacheEfficiency?: number;
  /** Savings from cache */
  cacheSavings?: number;
}

/**
 * Detailed cost breakdown display.
 * Shows input/output/cache costs separately.
 */
export function CostDetails({
  breakdown,
  model,
  cacheEfficiency,
  cacheSavings,
}: CostDetailsProps): React.ReactElement {
  return (
    <Box flexDirection='column' paddingLeft={2}>
      {model && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>model:</Text>
          <Text color={colors.muted}>{model}</Text>
        </Box>
      )}

      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>input:</Text>
        <Text color={colors.muted}>{formatCost(breakdown.input)}</Text>
      </Box>

      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>output:</Text>
        <Text color={colors.muted}>{formatCost(breakdown.output)}</Text>
      </Box>

      {breakdown.cacheWrite > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>cache write:</Text>
          <Text color={colors.muted}>{formatCost(breakdown.cacheWrite)}</Text>
        </Box>
      )}

      {breakdown.cacheRead > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>cache read:</Text>
          <Text color={colors.muted}>{formatCost(breakdown.cacheRead)}</Text>
        </Box>
      )}

      {cacheEfficiency !== undefined && cacheEfficiency > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>cache hit:</Text>
          <Text color={colors.success}>{cacheEfficiency.toFixed(0)}%</Text>
        </Box>
      )}

      {cacheSavings !== undefined && cacheSavings > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>saved:</Text>
          <Text color={colors.success}>{formatCost(cacheSavings)}</Text>
        </Box>
      )}

      <Box flexDirection='row' gap={1} marginTop={1}>
        <Text color={colors.dim}>total:</Text>
        <Text color={colors.success} bold>{formatCost(breakdown.total)}</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Session Cost Summary
// ============================================================================

export interface SessionCostProps {
  /** Total cost for the session */
  total: number;
  /** Cost for current iteration */
  currentIteration?: number;
  /** Estimated remaining cost (if known) */
  estimatedRemaining?: number;
  /** Cost trend: normal, high, very-high */
  trend?: 'normal' | 'high' | 'very-high';
}

/**
 * Session cost with trend and estimate.
 */
export function SessionCost({
  total,
  currentIteration,
  estimatedRemaining,
  trend = 'normal',
}: SessionCostProps): React.ReactElement {
  const trendColor = trend === 'very-high'
    ? colors.error
    : trend === 'high'
    ? colors.warning
    : colors.success;

  const trendIcon = trend === 'very-high' ? '⚠' : trend === 'high' ? '↑' : '';

  return (
    <Box flexDirection='column'>
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>session:</Text>
        <Text color={trendColor} bold>{formatCost(total)}</Text>
        {trendIcon && <Text color={trendColor}>{trendIcon}</Text>}
      </Box>

      {currentIteration !== undefined && currentIteration > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>iteration:</Text>
          <Text color={colors.muted}>+{formatCost(currentIteration)}</Text>
        </Box>
      )}

      {estimatedRemaining !== undefined && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>est. remaining:</Text>
          <Text color={colors.muted}>~{formatCost(estimatedRemaining)}</Text>
        </Box>
      )}
    </Box>
  );
}
