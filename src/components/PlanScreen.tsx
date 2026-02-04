/**
 * @module components/PlanScreen
 *
 * Plan command screen using shared UI components.
 * Now with full stats display matching the original UI.
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
  ContextIndicator,
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

export type PlanPhase = 'planning' | 'done' | 'error';

export interface PlanStats {
  operations: number;
  durationSec: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number;
  cost?: CostBreakdown;
  cacheSavings?: number;
}

export interface PlanScreenProps {
  onRun: (callbacks: {
    onToolUse: (tool: EnhancedToolCall) => void;
    onStatusUpdate: (status: string) => void;
    onTokenUpdate?: (inputTokens: number, outputTokens: number) => void;
  }) => Promise<{
    success: boolean;
    outputPath?: string;
    error?: string;
    stats?: PlanStats;
  }>;
  model: string;
  usage?: SubscriptionUsage;
  vibeMode?: boolean;
  onComplete: (success: boolean, stats?: PlanStats) => void;
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

function PlanScreen({
  onRun,
  model,
  usage,
  vibeMode = false,
  onComplete,
}: PlanScreenProps): React.ReactElement {
  const { exit } = useApp();
  const setFinalOutput = useFinalOutput();
  const { columns } = useTerminalSize();

  // State
  const [phase, setPhase] = useState<PlanPhase>('planning');
  const [status, setStatus] = useState('Starting gap analysis...');
  const [tools, setTools] = useState<EnhancedToolCall[]>([]);
  const [startTime] = useState(() => Date.now());
  const [_outputPath, setOutputPath] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [_stats, setStats] = useState<PlanStats | undefined>();
  const [showTools, setShowTools] = useState(true);

  // Track total operations and tokens (use ref to capture latest value in async closure)
  const [operationCount, setOperationCount] = useState(0);
  const operationCountRef = useRef(0);
  const [tokenCount, setTokenCount] = useState({ input: 0, output: 0 });
  const tokenCountRef = useRef({ input: 0, output: 0 });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showTokens, setShowTokens] = useState(true);
  const [cost, setCost] = useState<CostBreakdown | null>(null);
  const [cacheSavings, setCacheSavings] = useState<number>(0);
  const [showCost, setShowCost] = useState(true);
  const [showContext, setShowContext] = useState(true);

  // Context window tracking
  const [contextMax] = useState(200000); // Default for Opus (200K context window)

  // Update elapsed time every second
  useEffect(() => {
    if (phase !== 'planning') return;
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, startTime]);

  // Handle keyboard input for toggles
  useInput((input: string) => {
    if (input === 't' || input === 'T') {
      setShowTools((v: boolean) => !v);
    }
    if (input === 'k' || input === 'K') {
      setShowTokens((v: boolean) => !v);
    }
    if (input === 'c' || input === 'C') {
      setShowCost((v: boolean) => !v);
    }
    if (input === 'x' || input === 'X') {
      setShowContext((v: boolean) => !v);
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

  // Callbacks
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

  const handleStatusUpdate = useCallback((newStatus: string) => {
    setStatus(newStatus);
  }, []);

  const handleQuit = useCallback(() => {
    setFinalOutput(buildPlanFinalOutput({
      success: false,
      title: 'Cancelled',
    }));
  }, [setFinalOutput]);

  // Run planning
  useEffect(() => {
    let cancelled = false;

    (async () => {
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

      const finalStats: PlanStats = result.stats ?? {
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

        setFinalOutput(buildPlanFinalOutput({
          success: true,
          title: 'Plan generated',
          outputPath: result.outputPath,
          stats: finalStats,
          nextCommand: vibeMode ? undefined : 'ralph work',
        }));

        setTimeout(() => {
          onComplete(true, finalStats);
          exit();
        }, 500);
      } else {
        setErrorMsg(result.error ?? 'Planning failed');
        setPhase('error');

        setFinalOutput(buildPlanFinalOutput({
          success: false,
          title: 'Planning failed',
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
    { key: 'x', label: showContext ? 'hide context' : 'show context' },
    ...(usage ? [{ key: 'u', label: 'usage' }] : []),
    { key: 'q', label: 'quit' },
  ];

  return (
    <CommandBox onQuit={handleQuit} animateBorder={phase === 'planning'}>
      <Header
        name='Ralph Plan'
        description={model}
        vibeMode={vibeMode}
        vibeCurrentStep='plan'
        vibeSteps={['plan', 'work']}
      />

      {/* Token stats, context, and usage metrics */}
      <Box flexDirection='row' gap={2} marginBottom={1}>
        {showTokens && (tokenCount.input + tokenCount.output > 0) && (
          <TokenStats
            inputTokens={tokenCount.input}
            outputTokens={tokenCount.output}
            compact={true}
          />
        )}
        {showContext && (tokenCount.input + tokenCount.output > 0) && (
          <ContextIndicator
            used={tokenCount.input + tokenCount.output}
            max={contextMax}
            isGrowing={phase === 'planning'}
          />
        )}
        {usage && <UsageBars usage={usage} />}
      </Box>

      {phase === 'planning' && (
        <Box flexDirection='column'>
          <ProgressLine status={status} startTime={startTime} width={columns - 6} />

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
        </Box>
      )}

      {/* Done phase - simple status, useFinalOutput handles detailed stats */}
      {phase === 'done' && (
        <StatusResult
          type='success'
          title='Plan generated'
        />
      )}

      {phase === 'error' && (
        <StatusResult
          type='error'
          title='Planning failed'
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

function buildPlanFinalOutput(options: {
  success: boolean;
  title: string;
  outputPath?: string;
  stats?: PlanStats;
  nextCommand?: string;
}): string {
  const lines: string[] = [];

  // Success/failure header
  if (options.success) {
    lines.push(`${ansi.green}${ansi.bold}✓ ${options.title}${ansi.reset}`);
  } else {
    lines.push(`${ansi.red}${ansi.bold}✗ ${options.title}${ansi.reset}`);
  }

  // Stats - more detailed
  if (options.stats) {
    const { operations, durationSec, inputTokens, outputTokens, cost, cacheSavings } =
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
  }

  // Output file
  if (options.outputPath) {
    lines.push('');
    lines.push(`${ansi.dimGray}→${ansi.reset} ${ansi.orange}${options.outputPath}${ansi.reset}`);
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

export interface RenderPlanOptions {
  onRun: PlanScreenProps['onRun'];
  model: string;
  usage?: SubscriptionUsage;
  vibeMode?: boolean;
}

export async function renderPlan(
  options: RenderPlanOptions,
): Promise<{ success: boolean; stats?: PlanStats }> {
  let result = { success: false, stats: undefined as PlanStats | undefined };

  const { waitUntilExit } = await render(
    <PlanScreen
      onRun={options.onRun}
      model={options.model}
      usage={options.usage}
      vibeMode={options.vibeMode}
      onComplete={(s: boolean, stats?: PlanStats) => {
        result = { success: s, stats };
      }}
    />,
    { fullScreen: true },
  );

  await waitUntilExit();
  return result;
}
