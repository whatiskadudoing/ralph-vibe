/**
 * @module utils/final-output
 *
 * Utilities for building final terminal output with ANSI colors.
 * This output persists after Ink unmounts, providing a clean summary.
 */

import { palette } from '../ui/palette.ts';

// ============================================================================
// ANSI Color Codes
// ============================================================================

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;

function hexToAnsi256(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r === g && g === b) {
    if (r < 8) return '16';
    if (r > 248) return '231';
    return String(Math.round(((r - 8) / 247) * 24) + 232);
  }

  const ansi = 16 +
    36 * Math.round((r / 255) * 5) +
    6 * Math.round((g / 255) * 5) +
    Math.round((b / 255) * 5);

  return String(ansi);
}

function color(hex: string, text: string): string {
  const code = `${ESC}38;5;${hexToAnsi256(hex)}m`;
  return `${code}${text}${RESET}`;
}

// Themed color functions based on palette
export const ansi = {
  reset: RESET,
  bold: BOLD,
  dim: DIM,

  // Semantic colors
  success: (text: string) => color(palette.success, text),
  error: (text: string) => color(palette.error, text),
  warning: (text: string) => color(palette.warning, text),
  info: (text: string) => color(palette.info, text),

  // Brand colors
  accent: (text: string) => color(palette.accent.orange, text),
  orange: (text: string) => color(palette.accent.orange, text),
  yellow: (text: string) => color(palette.accent.yellow, text),
  green: (text: string) => color(palette.accent.green, text),
  purple: (text: string) => color(palette.accent.purple, text),

  // Grays
  gray: (text: string) => color(palette.gray.base, text),
  dimGray: (text: string) => color(palette.gray.dark, text),
  muted: (text: string) => color(palette.gray.base, text),

  // Token colors (using info/success/purple)
  tokenTotal: (text: string) => color(palette.accent.yellow, text),
  tokenInput: (text: string) => color('#60A5FA', text),
  tokenOutput: (text: string) => color('#34D399', text),
  tokenCache: (text: string) => color(palette.accent.purple, text),
};

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
  /** Cache tokens saved (cache reads) */
  cacheTokensSaved?: number;
  /** Cache write tokens */
  cacheWriteTokens?: number;
  /** Total cost in USD (legacy, use totalCostUsd instead) */
  costUsd?: number;
  /** Total cost in USD from API */
  totalCostUsd?: number;
  /** Cost breakdown from API */
  totalCost?: {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
    total: number;
  };
  /** Cache savings in USD */
  cacheSavings?: number;
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

export interface FinalOutputOptions {
  /** Title for the summary */
  title?: string;
  /** Success state (shows green checkmark if true, red X if false) */
  success?: boolean;
  /** Session statistics */
  stats?: SessionStats;
  /** Model usage breakdown */
  modelBreakdown?: ModelBreakdown;
  /** Output files generated */
  outputs?: string[];
  /** Next steps for the user */
  nextSteps?: string[] | null;
  /** Session file path */
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 10_000) return `${(tokens / 1_000).toFixed(0)}K`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
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

function calculateCacheEfficiency(
  cacheTokensSaved: number,
  inputTokens: number,
): number {
  const totalInput = inputTokens + cacheTokensSaved;
  if (totalInput === 0) return 0;
  return (cacheTokensSaved / totalInput) * 100;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Builds a final output string for terminal display after Ink unmounts.
 * Includes stats, outputs, next steps, and completion messages.
 */
export function buildFinalOutput(options: FinalOutputOptions): string {
  const lines: string[] = [];
  const {
    title,
    success = true,
    stats,
    modelBreakdown,
    outputs,
    nextSteps,
    sessionFile,
    showCompletionMessage = true,
  } = options;

  // Completion message header
  if (showCompletionMessage) {
    const message = getRandomCompletionMessage();
    const icon = success ? '✓' : '✗';
    const colorFn = success ? ansi.success : ansi.error;
    lines.push(colorFn(`${BOLD}${icon} ${message}${RESET}`));
    if (title) {
      lines.push(ansi.dimGray(title));
    }
    lines.push('');
  } else if (title) {
    const icon = success ? '✓' : '✗';
    const colorFn = success ? ansi.success : ansi.error;
    lines.push(colorFn(`${BOLD}${icon} ${title}${RESET}`));
    lines.push('');
  }

  // Session Stats
  if (stats) {
    const totalTokens = (stats.inputTokens ?? 0) + (stats.outputTokens ?? 0);
    const hasStats = (stats.durationSec !== undefined && stats.durationSec > 0) ||
      (stats.iterations !== undefined && stats.iterations > 0) ||
      (stats.operations !== undefined && stats.operations > 0) ||
      totalTokens > 0;

    if (hasStats) {
      lines.push(`${BOLD}Session Summary${RESET}`);

      // Duration, iterations, operations on one line
      const quickStats: string[] = [];
      if (stats.durationSec !== undefined && stats.durationSec > 0) {
        quickStats.push(ansi.dimGray(`⏱  ${formatDuration(stats.durationSec)}`));
      }
      if (stats.iterations !== undefined && stats.iterations > 0) {
        quickStats.push(ansi.dimGray(`${stats.iterations} iterations`));
      }
      if (stats.operations !== undefined && stats.operations > 0) {
        quickStats.push(ansi.dimGray(`${stats.operations} operations`));
      }
      if (quickStats.length > 0) {
        lines.push(`  ${quickStats.join(ansi.dimGray(' · '))}`);
      }

      lines.push('');

      // Token consumption breakdown
      if (totalTokens > 0) {
        lines.push(`  ${BOLD}Tokens${RESET}`);

        // Input tokens
        lines.push(
          `    ${ansi.tokenInput('↓')} ${ansi.tokenInput(formatTokens(stats.inputTokens ?? 0).padStart(8))} ${
            ansi.dimGray('input tokens')
          }`,
        );

        // Output tokens
        lines.push(
          `    ${ansi.tokenOutput('↑')} ${ansi.tokenOutput(formatTokens(stats.outputTokens ?? 0).padStart(8))} ${
            ansi.dimGray('output tokens')
          }`,
        );

        // Cache read tokens (saved)
        if (stats.cacheTokensSaved !== undefined && stats.cacheTokensSaved > 0) {
          lines.push(
            `    ${ansi.tokenCache('●')} ${ansi.tokenCache(formatTokens(stats.cacheTokensSaved).padStart(8))} ${
              ansi.dimGray('cache read (saved)')
            }`,
          );
        }

        // Cache write tokens
        if (stats.cacheWriteTokens !== undefined && stats.cacheWriteTokens > 0) {
          lines.push(
            `    ${ansi.dimGray('○')} ${ansi.dimGray(formatTokens(stats.cacheWriteTokens).padStart(8))} ${
              ansi.dimGray('cache write')
            }`,
          );
        }

        // Total line
        const grandTotal = totalTokens + (stats.cacheTokensSaved ?? 0);
        lines.push(
          `    ${ansi.dimGray('─'.repeat(20))}`,
        );
        lines.push(
          `    ${ansi.tokenTotal('Σ')} ${ansi.tokenTotal(`${BOLD}${formatTokens(grandTotal)}${RESET}`.padStart(8))} ${
            ansi.dimGray('total processed')
          }`,
        );

        lines.push('');
      }

      // Cache efficiency (prominent display)
      if (stats.cacheTokensSaved !== undefined && stats.cacheTokensSaved > 0 && stats.inputTokens !== undefined && stats.inputTokens > 0) {
        const efficiency = calculateCacheEfficiency(
          stats.cacheTokensSaved,
          stats.inputTokens,
        );
        lines.push(
          `  ${BOLD}Cache Efficiency${RESET} ${
            ansi.tokenCache(`${BOLD}${efficiency.toFixed(1)}%${RESET}`)
          } ${ansi.dimGray(`(${formatTokens(stats.cacheTokensSaved)} tokens saved)`)}`,
        );
        lines.push('');
      }

      // Cost breakdown (prefer API cost over estimated)
      const actualCost = stats.totalCostUsd ?? stats.totalCost?.total ?? stats.costUsd;
      if (actualCost !== undefined && actualCost > 0) {
        lines.push(`  ${BOLD}Cost${RESET}`);

        // Show detailed breakdown if available
        if (stats.totalCost) {
          if (stats.totalCost.input > 0) {
            lines.push(
              `    ${ansi.dimGray('•')} ${formatCost(stats.totalCost.input).padStart(10)} ${
                ansi.dimGray('input tokens')
              }`,
            );
          }
          if (stats.totalCost.output > 0) {
            lines.push(
              `    ${ansi.dimGray('•')} ${formatCost(stats.totalCost.output).padStart(10)} ${
                ansi.dimGray('output tokens')
              }`,
            );
          }
          if (stats.totalCost.cacheWrite > 0) {
            lines.push(
              `    ${ansi.dimGray('•')} ${formatCost(stats.totalCost.cacheWrite).padStart(10)} ${
                ansi.dimGray('cache write')
              }`,
            );
          }
          if (stats.totalCost.cacheRead > 0) {
            lines.push(
              `    ${ansi.dimGray('•')} ${formatCost(stats.totalCost.cacheRead).padStart(10)} ${
                ansi.dimGray('cache read')
              }`,
            );
          }
          lines.push(
            `    ${ansi.dimGray('─'.repeat(20))}`,
          );
          lines.push(
            `    ${ansi.green('💰')} ${ansi.accent(`${BOLD}${formatCost(stats.totalCost.total)}${RESET}`.padStart(10))} ${
              ansi.dimGray('total cost')
            }`,
          );

          // Cache savings
          if (stats.cacheSavings !== undefined && stats.cacheSavings > 0) {
            lines.push(
              `         ${ansi.tokenCache(`-${formatCost(stats.cacheSavings)}`)} ${
                ansi.dimGray('saved by cache')
              }`,
            );
          }
        } else {
          // Simple cost display
          lines.push(
            `    ${ansi.green('💰')} ${ansi.accent(`${BOLD}${formatCost(actualCost)}${RESET}`)} ${
              ansi.dimGray('total cost')
            }`,
          );
        }

        lines.push('');
      }

      // Usage delta
      if (stats.usage5hDelta !== undefined && stats.usage5hDelta > 0) {
        lines.push(
          `  ${BOLD}API Usage${RESET}`,
        );
        lines.push(
          `    ${ansi.accent(`+${stats.usage5hDelta.toFixed(1)}%`)} ${ansi.dimGray('5-hour window')}`,
        );
        if (stats.usage7dDelta !== undefined && stats.usage7dDelta > 0) {
          lines.push(
            `    ${ansi.muted(`+${stats.usage7dDelta.toFixed(1)}%`)} ${ansi.dimGray('7-day window')}`,
          );
        }
        lines.push('');
      }
    }
  }

  // Model breakdown
  if (modelBreakdown) {
    const hasModels = Object.values(modelBreakdown).some((v) => v && v > 0);
    const multipleModels = Object.values(modelBreakdown).filter((v) => v && v > 0).length > 1;

    if (hasModels && multipleModels) {
      lines.push(`${BOLD}Models Used${RESET}`);

      if (modelBreakdown.opus && modelBreakdown.opus > 0) {
        lines.push(
          `  ${ansi.accent('●')} ${ansi.accent('Opus')} ${
            ansi.dimGray('×')
          } ${modelBreakdown.opus} ${ansi.dimGray('iterations')}`,
        );
      }
      if (modelBreakdown.sonnet && modelBreakdown.sonnet > 0) {
        lines.push(
          `  ${ansi.info('●')} ${ansi.info('Sonnet')} ${
            ansi.dimGray('×')
          } ${modelBreakdown.sonnet} ${ansi.dimGray('iterations')}`,
        );
      }
      if (modelBreakdown.haiku && modelBreakdown.haiku > 0) {
        lines.push(
          `  ${ansi.muted('●')} ${ansi.muted('Haiku')} ${
            ansi.dimGray('×')
          } ${modelBreakdown.haiku} ${ansi.dimGray('iterations')}`,
        );
      }

      lines.push('');
    }
  }

  // Output files
  if (outputs && outputs.length > 0) {
    lines.push(`${BOLD}Outputs${RESET} ${ansi.dimGray(`(${outputs.length} files)`)}`);
    for (const file of outputs.slice(0, 10)) {
      lines.push(`  ${ansi.success('→')} ${ansi.dimGray(truncate(file, 60))}`);
    }
    if (outputs.length > 10) {
      lines.push(ansi.dimGray(`     ...and ${outputs.length - 10} more`));
    }
    lines.push('');
  }

  // Next steps
  if (nextSteps && nextSteps.length > 0) {
    lines.push(`${BOLD}Next Steps${RESET}`);
    for (const step of nextSteps) {
      lines.push(`  ${ansi.accent('▸')} ${step}`);
    }
    lines.push('');
  }

  // Session file
  if (sessionFile) {
    lines.push(ansi.dimGray(`Session saved: ${sessionFile}`));
    lines.push('');
  }

  return lines.join('\n');
}
