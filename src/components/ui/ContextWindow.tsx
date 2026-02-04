/**
 * @module components/ui/ContextWindow
 *
 * Context window usage visualization.
 * Shows how much of the context window is being used.
 *
 * Claude model context windows:
 * - Claude Opus 4: 200K tokens
 * - Claude Sonnet 4: 200K tokens
 * - Claude Haiku 3.5: 200K tokens
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { formatTokens } from './TokenStats.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Context window sizes by model */
export const CONTEXT_WINDOWS: Record<string, number> = {
  'opus': 200_000,
  'sonnet': 200_000,
  'haiku': 200_000,
  'claude-opus-4': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-3-5-haiku': 200_000,
  // Default fallback
  'default': 200_000,
};

/**
 * Gets the context window size for a model.
 */
const DEFAULT_CONTEXT_WINDOW = 200_000;

export function getContextWindowSize(model: string): number {
  const normalizedModel = model.toLowerCase();

  // Check for exact match
  const exactMatch = CONTEXT_WINDOWS[normalizedModel];
  if (exactMatch) {
    return exactMatch;
  }

  // Check for partial match
  if (normalizedModel.includes('opus')) return CONTEXT_WINDOWS['opus'] ?? DEFAULT_CONTEXT_WINDOW;
  if (normalizedModel.includes('sonnet')) {
    return CONTEXT_WINDOWS['sonnet'] ?? DEFAULT_CONTEXT_WINDOW;
  }
  if (normalizedModel.includes('haiku')) return CONTEXT_WINDOWS['haiku'] ?? DEFAULT_CONTEXT_WINDOW;

  return DEFAULT_CONTEXT_WINDOW;
}

// ============================================================================
// Types
// ============================================================================

export interface ContextWindowProps {
  /** Tokens used (input + output for current context) */
  tokensUsed: number;
  /** Model name (to determine context window size) */
  model?: string;
  /** Override max tokens (if not using model lookup) */
  maxTokens?: number;
  /** Warning threshold percentage (default: 0.5) */
  warningThreshold?: number;
  /** Danger threshold percentage (default: 0.8) */
  dangerThreshold?: number;
  /** Compact display */
  compact?: boolean;
  /** Bar width in characters */
  barWidth?: number;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Context window usage bar.
 * Color-coded based on usage percentage.
 */
export function ContextWindow({
  tokensUsed,
  model = 'opus',
  maxTokens,
  warningThreshold = 0.5,
  dangerThreshold = 0.8,
  compact = false,
  barWidth = 20,
}: ContextWindowProps): React.ReactElement {
  const max = maxTokens ?? getContextWindowSize(model);
  const percentage = max > 0 ? tokensUsed / max : 0;
  const percentDisplay = Math.round(percentage * 100);

  // Determine color based on thresholds
  let barColor = colors.contextOk;
  if (percentage >= dangerThreshold) {
    barColor = colors.contextDanger;
  } else if (percentage >= warningThreshold) {
    barColor = colors.contextWarn;
  }

  // Build progress bar
  const filledWidth = Math.min(Math.round(percentage * barWidth), barWidth);
  const emptyWidth = barWidth - filledWidth;
  const filledBar = '█'.repeat(filledWidth);
  const emptyBar = '░'.repeat(emptyWidth);

  // Compact mode - single line
  if (compact) {
    return (
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>ctx:</Text>
        <Text color={barColor}>{filledBar}</Text>
        <Text color={colors.dim}>{emptyBar}</Text>
        <Text color={barColor}>{percentDisplay}%</Text>
      </Box>
    );
  }

  // Full mode - with label and tokens
  return (
    <Box flexDirection='column'>
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}>Context:</Text>
        <Text color={barColor}>{formatTokens(tokensUsed)}</Text>
        <Text color={colors.dim}>/</Text>
        <Text color={colors.dim}>{formatTokens(max)}</Text>
        <Text color={barColor}>({percentDisplay}%)</Text>
      </Box>
      <Box flexDirection='row'>
        <Text color={barColor}>{filledBar}</Text>
        <Text color={colors.dim}>{emptyBar}</Text>
      </Box>
      {percentage >= dangerThreshold && (
        <Text color={colors.contextDanger}>
          ⚠ Context window nearly full
        </Text>
      )}
    </Box>
  );
}

/**
 * Inline context indicator.
 * Shows a small percentage badge.
 */
export function ContextBadge({
  tokensUsed,
  model = 'opus',
  maxTokens,
  warningThreshold = 0.5,
  dangerThreshold = 0.8,
}: {
  tokensUsed: number;
  model?: string;
  maxTokens?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
}): React.ReactElement {
  const max = maxTokens ?? getContextWindowSize(model);
  const percentage = max > 0 ? tokensUsed / max : 0;
  const percentDisplay = Math.round(percentage * 100);

  let color = colors.contextOk;
  if (percentage >= dangerThreshold) {
    color = colors.contextDanger;
  } else if (percentage >= warningThreshold) {
    color = colors.contextWarn;
  }

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={colors.dim}>ctx:</Text>
      <Text color={color}>{percentDisplay}%</Text>
    </Box>
  );
}

/**
 * Context window status indicator.
 * Shows a visual indicator with optional warning.
 */
export function ContextStatus({
  tokensUsed,
  model = 'opus',
  maxTokens,
  showWarning = true,
}: {
  tokensUsed: number;
  model?: string;
  maxTokens?: number;
  showWarning?: boolean;
}): React.ReactElement | null {
  const max = maxTokens ?? getContextWindowSize(model);
  const percentage = max > 0 ? tokensUsed / max : 0;

  // Only show if approaching limits
  if (percentage < 0.5) {
    return null;
  }

  const percentDisplay = Math.round(percentage * 100);
  const isDanger = percentage >= 0.8;
  const color = isDanger ? colors.contextDanger : colors.contextWarn;
  const icon = isDanger ? '⚠' : '◐';

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={color}>{icon}</Text>
      <Text color={color}>
        Context {percentDisplay}% used
      </Text>
      {showWarning && isDanger && <Text color={colors.dim}>- consider starting fresh</Text>}
    </Box>
  );
}
