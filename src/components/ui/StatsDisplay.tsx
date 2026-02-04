/**
 * @module components/ui/StatsDisplay
 *
 * Unified stats display component for consistent presentation
 * of metrics across all commands.
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { formatTokens } from './TokenStats.tsx';
import { formatDuration } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

export interface StatsDisplayProps {
  /** Duration in seconds */
  durationSec?: number;
  /** Number of operations */
  operations?: number;
  /** Input tokens */
  inputTokens?: number;
  /** Output tokens */
  outputTokens?: number;
  /** Cache tokens read (saved) */
  cacheReadTokens?: number;
  /** Model used */
  model?: string;
  /** Number of iterations */
  iterations?: number;
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Show icons */
  showIcons?: boolean;
  /** Compact mode (shorter labels) */
  compact?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wrapper for formatDuration that takes seconds instead of milliseconds.
 * Re-exports for backward compatibility.
 */
export function formatDurationSec(seconds: number): string {
  return formatDuration(seconds * 1000);
}

/**
 * Formats a model name for display.
 */
export function formatModelName(model: string): string {
  const normalized = model.toLowerCase();
  if (normalized.includes('opus')) return 'Opus';
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  return model;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Single stat item with icon and value.
 */
function StatItem({
  icon,
  label,
  value,
  valueColor,
  showIcon = true,
  compact = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  valueColor?: string;
  showIcon?: boolean;
  compact?: boolean;
}): React.ReactElement {
  return (
    <Box flexDirection='row' gap={1}>
      {showIcon && <Text color={colors.dim}>{icon}</Text>}
      <Text color={valueColor ?? colors.text} bold>{value}</Text>
      {!compact && <Text color={colors.dim}>{label}</Text>}
    </Box>
  );
}

/**
 * Unified stats display.
 * Shows duration, operations, tokens, and model consistently.
 */
export function StatsDisplay({
  durationSec,
  operations,
  inputTokens,
  outputTokens,
  cacheReadTokens,
  model,
  iterations,
  direction = 'row',
  showIcons = true,
  compact = false,
}: StatsDisplayProps): React.ReactElement {
  const totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0);
  const items: React.ReactNode[] = [];

  // Duration
  if (durationSec !== undefined) {
    items.push(
      <Box key='duration'>
        <StatItem
          icon='⏱'
          label='total time'
          value={formatDurationSec(durationSec)}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Iterations
  if (iterations !== undefined) {
    items.push(
      <Box key='iterations'>
        <StatItem
          icon='🔄'
          label='iterations'
          value={iterations}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Operations
  if (operations !== undefined) {
    items.push(
      <Box key='operations'>
        <StatItem
          icon='⚡'
          label='ops'
          value={operations}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Tokens
  if (totalTokens > 0) {
    items.push(
      <Box key='tokens'>
        <StatItem
          icon='📊'
          label={compact ? 'tok' : 'tokens'}
          value={formatTokens(totalTokens)}
          valueColor={colors.tokenTotal}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Token breakdown (if not compact)
  if (!compact && inputTokens !== undefined && outputTokens !== undefined && totalTokens > 0) {
    items.push(
      <Box key='breakdown' flexDirection='row' gap={1}>
        <Text color={colors.dim}>(</Text>
        <Text color={colors.tokenInput}>{formatTokens(inputTokens)}</Text>
        <Text color={colors.dim}>in /</Text>
        <Text color={colors.tokenOutput}>{formatTokens(outputTokens)}</Text>
        <Text color={colors.dim}>out)</Text>
      </Box>,
    );
  }

  // Cache tokens
  if (cacheReadTokens !== undefined && cacheReadTokens > 0) {
    items.push(
      <Box key='cache'>
        <StatItem
          icon='💾'
          label='cached'
          value={formatTokens(cacheReadTokens)}
          valueColor={colors.tokenCache}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Model
  if (model) {
    items.push(
      <Box key='model'>
        <StatItem
          icon='🤖'
          label=''
          value={formatModelName(model)}
          valueColor={colors.accent}
          showIcon={showIcons}
          compact={compact}
        />
      </Box>,
    );
  }

  // Render based on direction
  if (direction === 'column') {
    return (
      <Box flexDirection='column'>
        {items}
      </Box>
    );
  }

  // Row layout with separators
  return (
    <Box flexDirection='row' gap={1}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text color={colors.dim}>·</Text>}
          {item}
        </React.Fragment>
      ))}
    </Box>
  );
}

/**
 * Inline stats for use in iteration lines.
 */
export function InlineStats({
  durationSec,
  operations,
  inputTokens,
  outputTokens,
  model,
}: {
  durationSec?: number;
  operations?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}): React.ReactElement {
  const parts: React.ReactNode[] = [];

  if (model) {
    parts.push(
      <Text key='model' color={colors.dim}>{formatModelName(model)}</Text>,
    );
  }

  if (operations !== undefined) {
    parts.push(
      <Text key='ops' color={colors.dim}>{operations} ops</Text>,
    );
  }

  if (durationSec !== undefined) {
    parts.push(
      <Text key='duration' color={colors.dim}>{formatDuration(durationSec)}</Text>,
    );
  }

  const totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0);
  if (totalTokens > 0) {
    parts.push(
      <Text key='tokens' color={colors.tokenTotal}>{formatTokens(totalTokens)} tokens</Text>,
    );
  }

  return (
    <Box flexDirection='row' gap={1}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text color={colors.dim}>·</Text>}
          {part}
        </React.Fragment>
      ))}
    </Box>
  );
}

/**
 * Session summary stats for completion screens.
 */
export function SessionSummaryStats({
  durationSec,
  iterations,
  operations,
  inputTokens,
  outputTokens,
  cacheTokensSaved,
  modelBreakdown,
}: {
  durationSec: number;
  iterations: number;
  operations: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokensSaved: number;
  modelBreakdown?: { opus?: number; sonnet?: number; haiku?: number };
}): React.ReactElement {
  const totalTokens = inputTokens + outputTokens;
  const avgTokensPerIteration = iterations > 0 ? Math.round(totalTokens / iterations) : 0;

  return (
    <Box flexDirection='column'>
      <Text bold>Session Stats</Text>
      <Box marginTop={1} flexDirection='column'>
        {/* Time */}
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>⏱</Text>
          <Text bold>{formatDurationSec(durationSec)}</Text>
          <Text color={colors.dim}>total time</Text>
        </Box>

        {/* Iterations */}
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>🔄</Text>
          <Text bold>{iterations}</Text>
          <Text color={colors.dim}>iterations</Text>
        </Box>

        {/* Operations */}
        <Box flexDirection='row' gap={1}>
          <Text color={colors.dim}>⚡</Text>
          <Text bold>{operations}</Text>
          <Text color={colors.dim}>operations</Text>
        </Box>

        {/* Tokens - primary metric */}
        {totalTokens > 0 && (
          <>
            <Box flexDirection='row' gap={1}>
              <Text color={colors.dim}>📊</Text>
              <Text bold color={colors.tokenTotal}>{formatTokens(totalTokens)}</Text>
              <Text color={colors.dim}>tokens consumed</Text>
            </Box>
            <Box flexDirection='row' gap={1} marginLeft={3}>
              <Text color={colors.tokenInput}>{formatTokens(inputTokens)}</Text>
              <Text color={colors.dim}>in /</Text>
              <Text color={colors.tokenOutput}>{formatTokens(outputTokens)}</Text>
              <Text color={colors.dim}>out</Text>
            </Box>
          </>
        )}

        {/* Cache savings */}
        {cacheTokensSaved > 0 && (
          <Box flexDirection='row' gap={1}>
            <Text color={colors.dim}>💾</Text>
            <Text bold color={colors.tokenCache}>{formatTokens(cacheTokensSaved)}</Text>
            <Text color={colors.dim}>tokens saved by cache</Text>
          </Box>
        )}

        {/* Average per iteration */}
        {avgTokensPerIteration > 0 && (
          <Box flexDirection='row' gap={1}>
            <Text color={colors.dim}>📈</Text>
            <Text>{formatTokens(avgTokensPerIteration)}</Text>
            <Text color={colors.dim}>avg tokens/iteration</Text>
          </Box>
        )}
      </Box>

      {/* Model breakdown */}
      {modelBreakdown && (modelBreakdown.opus || modelBreakdown.sonnet) && (
        <Box flexDirection='column' marginTop={1}>
          <Text bold>Models Used</Text>
          <Box marginTop={1} flexDirection='column'>
            {modelBreakdown.opus && modelBreakdown.opus > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.accent}>●</Text>
                <Text color={colors.accent}>Opus</Text>
                <Text color={colors.dim}>×</Text>
                <Text>{modelBreakdown.opus}</Text>
                <Text color={colors.dim}>iterations</Text>
              </Box>
            )}
            {modelBreakdown.sonnet && modelBreakdown.sonnet > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.info}>●</Text>
                <Text color={colors.info}>Sonnet</Text>
                <Text color={colors.dim}>×</Text>
                <Text>{modelBreakdown.sonnet}</Text>
                <Text color={colors.dim}>iterations</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
