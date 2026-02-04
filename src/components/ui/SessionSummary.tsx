/**
 * @module components/ui/SessionSummary
 *
 * Session summary component for end-of-command summaries.
 * Shows stats, outputs, next steps, and fun completion messages.
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { formatTokens } from './TokenStats.tsx';
import { formatDuration } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

export interface SessionStats {
  /** Total number of iterations */
  iterations?: number;
  /** Total operations performed */
  operations?: number;
  /** Total duration in seconds */
  durationSec?: number;
  /** Total input tokens */
  inputTokens?: number;
  /** Total output tokens */
  outputTokens?: number;
  /** Cache tokens saved */
  cacheTokensSaved?: number;
  /** Total cost in USD */
  costUsd?: number;
  /** 5-hour usage delta */
  usage5hDelta?: number;
  /** 7-day usage delta */
  usage7dDelta?: number;
}

export interface ModelBreakdown {
  opus?: number;
  sonnet?: number;
  haiku?: number;
}

export interface SessionSummaryProps {
  /** Summary title */
  title?: string;
  /** Session statistics */
  stats?: SessionStats;
  /** Model usage breakdown (if multiple models used) */
  modelBreakdown?: ModelBreakdown;
  /** Output files generated */
  outputs?: string[];
  /** Next steps for the user (null/empty to hide) */
  nextSteps?: string[] | null;
  /** Session file path if saved */
  sessionFile?: string;
  /** Show random completion message */
  showCompletionMessage?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const COMPLETION_MESSAGES = [
  'Time for that coffee!',
  'Go touch some grass!',
  'Ship it!',
  'Another one bites the dust!',
  "That's a wrap!",
  'Nailed it!',
];

function getRandomCompletionMessage(): string {
  const idx = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
  return COMPLETION_MESSAGES[idx] ?? COMPLETION_MESSAGES[0] ?? 'Nailed it!';
}

/**
 * Wrapper for formatDuration that takes seconds instead of milliseconds.
 */
function formatDurationSec(seconds: number): string {
  return formatDuration(seconds * 1000);
}

function formatCost(dollars: number): string {
  if (dollars === 0) return '$0.00';
  if (dollars < 0.01) {
    const cents = dollars * 100;
    return `${cents.toFixed(1)}¢`;
  }
  if (dollars < 1) {
    return `$${dollars.toFixed(4)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

function calculateCacheEfficiency(cacheTokensSaved: number, inputTokens: number): number {
  const totalInput = inputTokens + cacheTokensSaved;
  if (totalInput === 0) return 0;
  return (cacheTokensSaved / totalInput) * 100;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// ============================================================================
// Component
// ============================================================================

export function SessionSummary({
  title,
  stats,
  modelBreakdown,
  outputs,
  nextSteps,
  sessionFile,
  showCompletionMessage = true,
}: SessionSummaryProps): React.ReactElement {
  const totalTokens = (stats?.inputTokens ?? 0) + (stats?.outputTokens ?? 0);
  const hasModelBreakdown = modelBreakdown && Object.values(modelBreakdown).some((v) => v && v > 0);
  const hasMultipleModels = hasModelBreakdown &&
    Object.values(modelBreakdown).filter((v) => v && v > 0).length > 1;

  return (
    <Box flexDirection='column'>
      {/* Completion message header */}
      {showCompletionMessage && (
        <Box flexDirection='column' marginBottom={1}>
          <Box flexDirection='row' gap={1} justifyContent='center'>
            <Text color={colors.success}>✓</Text>
            <Text bold color={colors.success}>{getRandomCompletionMessage()}</Text>
          </Box>
          {title && (
            <Box justifyContent='center'>
              <Text color={colors.dim}>{title}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Divider */}
      <Box marginY={1}>
        <Text color={colors.dim}>{'─'.repeat(50)}</Text>
      </Box>

      {/* Session Stats */}
      {stats && (
        <Box flexDirection='column' marginBottom={1}>
          <Text bold>Session Stats</Text>
          <Box marginTop={1} flexDirection='column'>
            {/* Duration */}
            {stats.durationSec !== undefined && stats.durationSec > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.dim}>⏱</Text>
                <Text bold>{formatDurationSec(stats.durationSec)}</Text>
                <Text color={colors.dim}>total time</Text>
              </Box>
            )}

            {/* Iterations */}
            {stats.iterations !== undefined && stats.iterations > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.dim}>🔄</Text>
                <Text bold>{stats.iterations}</Text>
                <Text color={colors.dim}>iterations</Text>
              </Box>
            )}

            {/* Operations */}
            {stats.operations !== undefined && stats.operations > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.dim}>⚡</Text>
                <Text bold>{stats.operations}</Text>
                <Text color={colors.dim}>operations</Text>
              </Box>
            )}

            {/* Token consumption */}
            {totalTokens > 0 && (
              <>
                <Box flexDirection='row' gap={1}>
                  <Text color={colors.dim}>📊</Text>
                  <Text bold color={colors.tokenTotal}>{formatTokens(totalTokens)}</Text>
                  <Text color={colors.dim}>tokens consumed</Text>
                </Box>
                <Box flexDirection='row' gap={1} marginLeft={3}>
                  <Text color={colors.tokenInput}>{formatTokens(stats.inputTokens ?? 0)}</Text>
                  <Text color={colors.dim}>in /</Text>
                  <Text color={colors.tokenOutput}>{formatTokens(stats.outputTokens ?? 0)}</Text>
                  <Text color={colors.dim}>out</Text>
                </Box>
              </>
            )}

            {/* Cache efficiency */}
            {stats.cacheTokensSaved !== undefined && stats.cacheTokensSaved > 0 && (
              <>
                <Box flexDirection='row' gap={1}>
                  <Text color={colors.dim}>💾</Text>
                  <Text bold color={colors.tokenCache}>{formatTokens(stats.cacheTokensSaved)}</Text>
                  <Text color={colors.dim}>tokens saved by cache</Text>
                </Box>
                {stats.inputTokens !== undefined && stats.inputTokens > 0 && (
                  <Box flexDirection='row' gap={1} marginLeft={3}>
                    <Text color={colors.tokenCache}>
                      {calculateCacheEfficiency(stats.cacheTokensSaved, stats.inputTokens).toFixed(
                        1,
                      )}%
                    </Text>
                    <Text color={colors.dim}>cache efficiency</Text>
                  </Box>
                )}
              </>
            )}

            {/* Cost breakdown */}
            {stats.costUsd !== undefined && stats.costUsd > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.dim}>💰</Text>
                <Text bold color={colors.accent}>{formatCost(stats.costUsd)}</Text>
                <Text color={colors.dim}>estimated cost</Text>
              </Box>
            )}

            {/* Usage delta */}
            {(stats.usage5hDelta !== undefined && stats.usage5hDelta > 0) && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.dim}>📈</Text>
                <Text color={colors.accent}>+{stats.usage5hDelta.toFixed(1)}%</Text>
                <Text color={colors.dim}>5h usage</Text>
              </Box>
            )}
            {(stats.usage7dDelta !== undefined && stats.usage7dDelta > 0) && (
              <Box flexDirection='row' gap={1} marginLeft={3}>
                <Text color={colors.muted}>+{stats.usage7dDelta.toFixed(1)}%</Text>
                <Text color={colors.dim}>7d usage</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Model breakdown */}
      {hasMultipleModels && modelBreakdown && (
        <Box flexDirection='column' marginBottom={1}>
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
            {modelBreakdown.haiku && modelBreakdown.haiku > 0 && (
              <Box flexDirection='row' gap={1}>
                <Text color={colors.muted}>●</Text>
                <Text color={colors.muted}>Haiku</Text>
                <Text color={colors.dim}>×</Text>
                <Text>{modelBreakdown.haiku}</Text>
                <Text color={colors.dim}>iterations</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Output files */}
      {outputs && outputs.length > 0 && (
        <Box flexDirection='column' marginBottom={1}>
          <Box flexDirection='row' gap={1}>
            <Text bold>Outputs</Text>
            <Text color={colors.dim}>({outputs.length} files)</Text>
          </Box>
          <Box marginTop={1} flexDirection='column'>
            {outputs.slice(0, 10).map((file, i) => (
              <Box key={i} flexDirection='row' gap={1}>
                <Text color={colors.success}>→</Text>
                <Text color={colors.dim}>{truncate(file, 60)}</Text>
              </Box>
            ))}
            {outputs.length > 10 && (
              <Text color={colors.dim}>...and {outputs.length - 10} more</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Next steps */}
      {nextSteps && nextSteps.length > 0 && (
        <Box flexDirection='column' marginBottom={1}>
          <Text bold>Next Steps</Text>
          <Box marginTop={1} flexDirection='column'>
            {nextSteps.map((step, i) => (
              <Box key={i} flexDirection='row' gap={1}>
                <Text color={colors.accent}>▸</Text>
                <Text>{step}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Session file */}
      {sessionFile && (
        <Box marginTop={1}>
          <Text color={colors.dim}>Session saved: {sessionFile}</Text>
        </Box>
      )}
    </Box>
  );
}
