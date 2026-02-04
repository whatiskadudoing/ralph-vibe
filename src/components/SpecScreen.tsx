/**
 * @module components/SpecScreen
 *
 * Spec command screen using shared UI components.
 * Shows the spec interview process with a reactive UI.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  render,
  Text,
  useApp,
  useFinalOutput,
  useInput,
  useTerminalSize,
} from '../../packages/deno-ink/src/mod.ts';
import {
  colors,
  CommandBox,
  type EnhancedToolCall,
  Header,
  KeyboardHints,
  ProgressLine,
  StatusResult,
  TokenStats,
  ToolActivity,
  UsageBars,
} from './ui/mod.ts';
import { ansi } from './CommandScreen.tsx';
import type { SubscriptionUsage } from '@/services/usage_service.ts';
import {
  calculateCacheSavings,
  calculateCostBreakdown,
  type CostBreakdown,
  formatCost,
} from '../services/cost_calculator.ts';
import { formatDuration } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

export type { EnhancedToolCall } from './ui/mod.ts';

export type SpecPhase = 'preparing' | 'interview' | 'done' | 'error';

export interface SpecStats {
  operations: number;
  durationSec: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number;
  cost?: CostBreakdown;
  cacheSavings?: number;
  usageDelta?: number;
}

export interface SpecResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  stats?: SpecStats;
}

export interface SpecScreenProps {
  featureHint?: string;
  vibeMode?: boolean;
  vibeSteps?: string[];
  usage?: SubscriptionUsage;
  model?: string;
  onRun: (callbacks: {
    onToolUse: (tool: EnhancedToolCall) => void;
    onStatusUpdate: (status: string) => void;
    onTokenUpdate?: (inputTokens: number, outputTokens: number) => void;
  }) => Promise<SpecResult>;
  onComplete: (success: boolean, stats?: SpecStats) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wrapper for formatDuration that takes seconds instead of milliseconds.
 */
function formatDurationSec(seconds: number): string {
  return formatDuration(seconds * 1000);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

// ============================================================================
// Main Component
// ============================================================================

function SpecScreen({
  featureHint,
  vibeMode = false,
  vibeSteps = [],
  usage,
  model = 'sonnet',
  onRun,
  onComplete,
}: SpecScreenProps): React.ReactElement {
  const { exit } = useApp();
  const setFinalOutput = useFinalOutput();
  const { columns } = useTerminalSize();

  // State
  const [phase, setPhase] = useState<SpecPhase>('preparing');
  const [status, setStatus] = useState('Preparing spec interview...');
  const [tools, setTools] = useState<EnhancedToolCall[]>([]);
  const [startTime] = useState(() => Date.now());
  const [outputPath, setOutputPath] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [stats, setStats] = useState<SpecStats | undefined>();
  const [elapsedSec, setElapsedSec] = useState(0);

  // Track total operations and tokens (use ref to capture latest value in async closure)
  const [operationCount, setOperationCount] = useState(0);
  const operationCountRef = useRef(0);
  const [tokenCount, setTokenCount] = useState({ input: 0, output: 0 });
  const tokenCountRef = useRef({ input: 0, output: 0 });

  // Toggle states
  const [showTools, setShowTools] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [cost, setCost] = useState<CostBreakdown | null>(null);
  const [cacheSavings, setCacheSavings] = useState<number>(0);
  const [showCost, setShowCost] = useState(true);

  // Update elapsed time every second
  useEffect(() => {
    if (phase !== 'interview') return;
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, startTime]);

  // Handle keyboard input
  useInput((input: string, key: { escape?: boolean }) => {
    if (input === 'q' || input === 'Q' || key.escape) {
      handleQuit();
    }
    if (input === 't' || input === 'T') {
      setShowTools((v: boolean) => !v);
    }
    if (input === 'k' || input === 'K') {
      setShowTokens((v: boolean) => !v);
    }
    if (input === 'c' || input === 'C') {
      setShowCost((v: boolean) => !v);
    }
  });

  // Token update callback
  const handleTokenUpdate = useCallback((inputTokens: number, outputTokens: number) => {
    tokenCountRef.current = { input: inputTokens, output: outputTokens };
    setTokenCount({ input: inputTokens, output: outputTokens });

    // Calculate cost when tokens are updated
    if (inputTokens > 0 || outputTokens > 0) {
      const costBreakdown = calculateCostBreakdown({
        inputTokens,
        outputTokens,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }, model);
      setCost(costBreakdown);

      const savings = calculateCacheSavings({
        inputTokens,
        outputTokens,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }, model);
      setCacheSavings(savings);
    }
  }, [model]);

  // Handle EnhancedToolCall with status updates
  const handleToolUse = useCallback((tool: EnhancedToolCall) => {
    setTools((prev: EnhancedToolCall[]) => {
      // Check if this is an update to an existing tool (same id)
      const existingIndex = prev.findIndex((t) => t.id === tool.id);

      if (existingIndex >= 0) {
        // Update existing tool with new status/endTime
        const updated = [...prev];
        const existing = prev[existingIndex];
        if (existing) {
          updated[existingIndex] = {
            ...existing,
            status: tool.status,
            endTime: tool.endTime,
            result: tool.result ?? existing.result,
            tokenUsage: tool.tokenUsage ?? existing.tokenUsage,
            costUsd: tool.costUsd ?? existing.costUsd,
            model: tool.model ?? existing.model,
          };
        }
        return updated;
      }

      // New tool - increment counter and add to list
      operationCountRef.current++;
      setOperationCount(operationCountRef.current);
      return [...prev.slice(-5), tool];
    });
  }, []);

  // Callbacks
  const handleStatusUpdate = useCallback((newStatus: string) => {
    setStatus(newStatus);
  }, []);

  const handleQuit = useCallback(() => {
    setFinalOutput(buildSpecFinalOutput({
      success: false,
      title: 'Interview cancelled',
    }));
    onComplete(false);
    exit();
  }, [setFinalOutput, onComplete, exit]);

  // Run the spec interview
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Start interview phase
      setPhase('interview');
      setStatus('Starting spec interview...');

      const result = await onRun({
        onToolUse: handleToolUse,
        onStatusUpdate: handleStatusUpdate,
        onTokenUpdate: handleTokenUpdate,
      });

      if (cancelled) return;

      // Calculate stats from result or from our tracking (use refs for latest values)
      const inputToks = tokenCountRef.current.input || 0;
      const outputToks = tokenCountRef.current.output || 0;

      // Calculate final cost
      let finalCost: CostBreakdown | undefined;
      let finalCacheSavings: number | undefined;
      if (inputToks > 0 || outputToks > 0) {
        finalCost = calculateCostBreakdown({
          inputTokens: inputToks,
          outputTokens: outputToks,
          cacheReadTokens: result.stats?.cacheReadTokens ?? 0,
          cacheWriteTokens: result.stats?.cacheWriteTokens ?? 0,
        }, model);
        finalCacheSavings = calculateCacheSavings({
          inputTokens: inputToks,
          outputTokens: outputToks,
          cacheReadTokens: result.stats?.cacheReadTokens ?? 0,
          cacheWriteTokens: result.stats?.cacheWriteTokens ?? 0,
        }, model);
      }

      // Calculate final stats
      const finalStats: SpecStats = result.stats ?? {
        operations: operationCountRef.current,
        durationSec: Math.floor((Date.now() - startTime) / 1000),
        inputTokens: inputToks || undefined,
        outputTokens: outputToks || undefined,
        cost: finalCost,
        cacheSavings: finalCacheSavings,
      };
      setStats(finalStats);

      if (result.success) {
        setOutputPath(result.outputPath);
        setPhase('done');

        setFinalOutput(buildSpecFinalOutput({
          success: true,
          title: 'Spec created',
          outputPath: result.outputPath,
          stats: finalStats,
          nextCommand: vibeMode ? undefined : 'ralph plan',
        }));

        setTimeout(() => {
          onComplete(true, finalStats);
          exit();
        }, 500);
      } else {
        setErrorMsg(result.error ?? 'Interview failed');
        setPhase('error');

        setFinalOutput(buildSpecFinalOutput({
          success: false,
          title: 'Interview failed',
          error: result.error,
          stats: finalStats,
        }));

        setTimeout(() => {
          onComplete(false, finalStats);
          exit();
        }, 2000);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build keyboard hints
  const hints = [
    { key: 't', label: showTools ? 'hide tools' : 'show tools' },
    { key: 'k', label: showTokens ? 'hide tokens' : 'show tokens' },
    { key: 'c', label: showCost ? 'hide cost' : 'show cost' },
    ...(usage ? [{ key: 'u', label: 'usage' }] : []),
    { key: 'q', label: 'quit' },
  ];

  return (
    <CommandBox onQuit={handleQuit} animateBorder={phase === 'interview'}>
      <Header
        name='Ralph Spec'
        description='Add new feature specifications'
        vibeMode={vibeMode}
        vibeCurrentStep={vibeMode ? 'spec' : undefined}
        vibeSteps={vibeSteps}
      />

      {/* Usage metrics */}
      {usage && (
        <Box marginBottom={1}>
          <UsageBars usage={usage} />
        </Box>
      )}

      {/* Feature hint if provided */}
      {featureHint && phase !== 'done' && (
        <Box marginBottom={1} flexDirection='column'>
          <Box flexDirection='row' gap={1}>
            <Text color={colors.accent}>Feature:</Text>
            <Text color={colors.text}>{featureHint}</Text>
          </Box>
        </Box>
      )}

      {/* Preparing phase */}
      {phase === 'preparing' && (
        <Box flexDirection='column'>
          <ProgressLine status={status} startTime={startTime} width={columns - 6} />
        </Box>
      )}

      {/* Interview phase */}
      {phase === 'interview' && (
        <Box flexDirection='column'>
          {/* Token stats row */}
          {showTokens && (tokenCount.input + tokenCount.output > 0) && (
            <Box marginBottom={1}>
              <TokenStats
                inputTokens={tokenCount.input}
                outputTokens={tokenCount.output}
                compact={true}
              />
            </Box>
          )}

          <ProgressLine status={status} startTime={startTime} width={columns - 6} />

          {/* Tool activity */}
          {showTools && tools.length > 0 && (
            <Box marginTop={1}>
              <ToolActivity
                tools={tools}
                visible={showTools}
                showStats={false}
                showTimeline={false}
                showTokens={true}
                showTokenDetails={false}
                showCacheDots={false}
                showModels={false}
              />
            </Box>
          )}

          {/* Stats line - clean, single line format */}
          <Box marginTop={1} flexDirection='row' gap={1}>
            <Text color={colors.accent}>{operationCount}</Text>
            <Text color={colors.dim}>operations</Text>
            <Text color={colors.dim}>·</Text>
            <Text color={colors.muted}>{formatDurationSec(elapsedSec)}</Text>
            {tokenCount.input + tokenCount.output > 0 && (
              <>
                <Text color={colors.dim}>·</Text>
                <Text color={colors.tokenTotal}>
                  {formatTokens(tokenCount.input + tokenCount.output)}
                </Text>
                <Text color={colors.dim}>tokens (</Text>
                <Text color={colors.tokenInput}>{formatTokens(tokenCount.input)}</Text>
                <Text color={colors.dim}>in /</Text>
                <Text color={colors.tokenOutput}>{formatTokens(tokenCount.output)}</Text>
                <Text color={colors.dim}>out)</Text>
                {showCost && cost && (
                  <>
                    <Text color={colors.dim}>·</Text>
                    <Text color={colors.accent}>{formatCost(cost.total)}</Text>
                    {cacheSavings > 0 && (
                      <>
                        <Text color={colors.dim}>(saved</Text>
                        <Text color='green'>{formatCost(cacheSavings)}</Text>
                        <Text color={colors.dim}>)</Text>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </Box>

          {/* Interview steps description */}
          <Box marginTop={1} flexDirection='column'>
            <Text color={colors.dim}>Steps:</Text>
            <Box marginLeft={2} flexDirection='column'>
              <Text color={colors.dim}>1. Read existing specs for context</Text>
              <Text color={colors.dim}>2. Interview about the feature</Text>
              <Text color={colors.dim}>3. Write spec to specs/ directory</Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Done phase */}
      {phase === 'done' && (
        <Box flexDirection='column'>
          <StatusResult
            type='success'
            title='Spec created!'
            files={outputPath ? [outputPath] : undefined}
          />

          {/* Stats summary - clean single-line format */}
          {stats && (
            <Box marginTop={1} flexDirection='row' gap={1}>
              <Text color={colors.dim}>{stats.operations} operations</Text>
              <Text color={colors.dim}>·</Text>
              <Text color={colors.dim}>{formatDurationSec(stats.durationSec)}</Text>
              {stats.inputTokens !== undefined && stats.outputTokens !== undefined && (
                <>
                  <Text color={colors.dim}>·</Text>
                  <Text color={colors.tokenTotal}>
                    {formatTokens(stats.inputTokens + stats.outputTokens)}
                  </Text>
                  <Text color={colors.dim}>tokens (</Text>
                  <Text color={colors.tokenInput}>{formatTokens(stats.inputTokens)}</Text>
                  <Text color={colors.dim}>in /</Text>
                  <Text color={colors.tokenOutput}>{formatTokens(stats.outputTokens)}</Text>
                  <Text color={colors.dim}>out)</Text>
                  {showCost && stats.cost && (
                    <>
                      <Text color={colors.dim}>·</Text>
                      <Text color={colors.accent}>{formatCost(stats.cost.total)}</Text>
                      {stats.cacheSavings !== undefined && stats.cacheSavings > 0 && (
                        <>
                          <Text color={colors.dim}>(saved</Text>
                          <Text color='green'>{formatCost(stats.cacheSavings)}</Text>
                          <Text color={colors.dim}>)</Text>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          )}
          {stats?.usageDelta !== undefined && stats.usageDelta > 0 && (
            <Box marginTop={1} flexDirection='row' gap={1}>
              <Text color={colors.dim}>Subscription:</Text>
              <Text color={colors.accent}>+{stats.usageDelta.toFixed(1)}%</Text>
              <Text color={colors.dim}>usage</Text>
            </Box>
          )}

          {/* Next steps */}
          {!vibeMode && (
            <Box marginTop={1} flexDirection='column'>
              <Text bold>Next steps:</Text>
              <Box marginLeft={2} flexDirection='column'>
                <Box flexDirection='row' gap={1}>
                  <Text color={colors.accent}>▸</Text>
                  <Text>Review the spec in {outputPath ? `${outputPath}` : 'specs/'}</Text>
                </Box>
                <Box flexDirection='row' gap={1}>
                  <Text color={colors.accent}>▸</Text>
                  <Text>
                    Run <Text color={colors.accent}>ralph plan</Text> to update implementation plan
                  </Text>
                </Box>
                <Box flexDirection='row' gap={1}>
                  <Text color={colors.accent}>▸</Text>
                  <Text>
                    Run <Text color={colors.accent}>ralph work</Text> to start building
                  </Text>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Error phase */}
      {phase === 'error' && (
        <StatusResult
          type='error'
          title='Interview failed'
          detail={errorMsg}
        />
      )}

      <Box marginTop={1}>
        <KeyboardHints hints={hints} />
      </Box>
    </CommandBox>
  );
}

// ============================================================================
// Final Output Builder
// ============================================================================

function buildSpecFinalOutput(options: {
  success: boolean;
  title: string;
  outputPath?: string;
  stats?: SpecStats;
  nextCommand?: string;
  error?: string;
}): string {
  const lines: string[] = [];

  // Success/failure header
  if (options.success) {
    lines.push(`${ansi.green}${ansi.bold}✓ ${options.title}${ansi.reset}`);
  } else {
    lines.push(`${ansi.red}${ansi.bold}✗ ${options.title}${ansi.reset}`);
  }

  // Stats - more detailed (matching PlanScreen format)
  if (options.stats) {
    const { operations, durationSec, inputTokens, outputTokens, cost, cacheSavings, usageDelta } =
      options.stats;

    // Line 1: Operations and duration
    const statsParts = [
      `${operations} operations`,
      formatDurationSec(durationSec),
    ].join(' · ');
    lines.push(`${ansi.dimGray}${statsParts}${ansi.reset}`);

    // Line 2: Tokens (primary metric for subscription users)
    if (inputTokens !== undefined && outputTokens !== undefined) {
      const totalTokens = inputTokens + outputTokens;
      lines.push(
        `${ansi.cyan}${formatTokens(totalTokens)}${ansi.reset} ${ansi.dimGray}tokens (${
          formatTokens(inputTokens)
        } in / ${formatTokens(outputTokens)} out)${ansi.reset}`,
      );
    }

    // Line 3: Cost information
    if (cost) {
      let costLine = `${ansi.dimGray}Cost:${ansi.reset} ${ansi.orange}${
        formatCost(cost.total)
      }${ansi.reset}`;
      if (cacheSavings !== undefined && cacheSavings > 0) {
        costLine += ` ${ansi.green}(saved ${formatCost(cacheSavings)})${ansi.reset}`;
      }
      lines.push(costLine);
    }

    // Usage delta
    if (usageDelta !== undefined && usageDelta > 0) {
      lines.push(
        `${ansi.dimGray}Subscription: ${ansi.amber}+${usageDelta.toFixed(1)}%${ansi.reset}`,
      );
    }
  }

  // Output file
  if (options.outputPath) {
    lines.push('');
    lines.push(`${ansi.dimGray}→${ansi.reset} ${ansi.orange}${options.outputPath}${ansi.reset}`);
  }

  // Error message
  if (options.error) {
    lines.push('');
    lines.push(`${ansi.dimGray}${options.error}${ansi.reset}`);
  }

  // Next command
  if (options.nextCommand) {
    lines.push('');
    lines.push(`${ansi.bold}Next:${ansi.reset} ${ansi.orange}${options.nextCommand}${ansi.reset}`);
  }

  lines.push('');
  return lines.join('\n');
}

// ============================================================================
// Render Function
// ============================================================================

export interface RenderSpecOptions {
  featureHint?: string;
  vibeMode?: boolean;
  vibeSteps?: string[];
  usage?: SubscriptionUsage;
  model?: string;
  onRun: SpecScreenProps['onRun'];
}

export async function renderSpec(
  options: RenderSpecOptions,
): Promise<{ success: boolean; stats?: SpecStats }> {
  let result = { success: false, stats: undefined as SpecStats | undefined };

  const { waitUntilExit } = await render(
    <SpecScreen
      featureHint={options.featureHint}
      vibeMode={options.vibeMode}
      vibeSteps={options.vibeSteps}
      usage={options.usage}
      model={options.model}
      onRun={options.onRun}
      onComplete={(s: boolean, stats?: SpecStats) => {
        result = { success: s, stats };
      }}
    />,
  );

  await waitUntilExit();
  return result;
}
