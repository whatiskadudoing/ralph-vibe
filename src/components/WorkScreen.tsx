/**
 * @module components/WorkScreen
 *
 * Work command screen using shared UI components.
 * Shows live progress during the autonomous build loop.
 * Now with all the stats from the original UI.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, render, useApp, useInput, useFinalOutput, useTerminalSize } from "../../packages/deno-ink/src/mod.ts";
import {
  CommandBox,
  Header,
  UsageBars,
  ToolActivity,
  ProgressLine,
  StatusResult,
  KeyboardHints,
  TokenStats,
  CostBadge,
  ContextIndicator,
  colors,
  type EnhancedToolCall,
} from "./ui/mod.ts";
import { ansi } from "./CommandScreen.tsx";
import type { SubscriptionUsage } from "@/services/usage_service.ts";
import { calculateCostBreakdown, calculateCacheSavings, formatCost, type CostBreakdown } from "../services/cost_calculator.ts";

// ============================================================================
// Types
// ============================================================================

export type { EnhancedToolCall } from "./ui/mod.ts";

export type WorkPhase = "running" | "pause" | "done" | "error";

export interface ModelBreakdown {
  opus?: number;
  sonnet?: number;
  haiku?: number;
}

export interface IterationResult {
  id: number;
  task: string;
  success: boolean;
  validation: "pass" | "fail";
  model: string;
  operations: number;
  durationSec: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  modelBreakdown?: ModelBreakdown;
  usageDelta?: number; // How much 5h usage increased
  costUsd?: number; // Estimated cost for this iteration (deprecated - use cost)
  cost?: CostBreakdown; // Detailed cost breakdown
}

export interface SessionStats {
  totalIterations: number;
  totalOperations: number;
  totalDurationSec: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheTokensSaved: number;
  cacheWriteTokens: number;
  modelBreakdown: ModelBreakdown;
  totalCostUsd: number;
  totalCost: CostBreakdown;
  cacheSavings: number;
}

export interface WorkScreenProps {
  maxIterations: number;
  modelMode: string;
  usage?: SubscriptionUsage;
  vibeMode?: boolean;
  onRunIteration: (
    iteration: number,
    callbacks: {
      onToolUse: (tool: EnhancedToolCall) => void;
      onStatusUpdate: (status: string) => void;
      onTaskUpdate: (task: string) => void;
      onModelBreakdownUpdate: (breakdown: ModelBreakdown) => void;
    }
  ) => Promise<{
    success: boolean;
    task?: string;
    validation?: "pass" | "fail";
    exitSignal?: boolean;
    model: string;
    operations: number;
    durationSec: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    modelBreakdown?: ModelBreakdown;
    error?: string;
  }>;
  onComplete: (completed: boolean, iterations: IterationResult[], stats: SessionStats) => void;
  pauseDuration?: number;
  onRefreshUsage?: () => Promise<SubscriptionUsage | undefined>;
  nextSteps?: string[];
  sessionFile?: string;
}

// ============================================================================
// Helpers
// ============================================================================

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
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function truncateTask(task: string, maxLen: number): string {
  if (task.length <= maxLen) return task;
  return task.slice(0, maxLen - 3) + "...";
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Completed iteration line with full stats */
function IterationLine({ iteration, showCost = true }: { iteration: IterationResult; showCost?: boolean }): React.ReactElement {
  const icon = iteration.success && iteration.validation === "pass" ? "✓" : "✗";
  const iconColor = iteration.success && iteration.validation === "pass" ? colors.success : colors.error;

  // Build stats parts
  const statsParts: React.ReactNode[] = [];

  // Model breakdown or single model
  if (iteration.modelBreakdown && Object.keys(iteration.modelBreakdown).length > 0) {
    const breakdown = iteration.modelBreakdown;
    if (breakdown.opus) {
      statsParts.push(
        <Text key="opus" color={colors.accent}>opus:{breakdown.opus}</Text>
      );
    }
    if (breakdown.sonnet) {
      statsParts.push(
        <Text key="sonnet" color={colors.info}>sonnet:{breakdown.sonnet}</Text>
      );
    }
  } else {
    statsParts.push(
      <Text key="model" color={colors.dim}>{iteration.model}</Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color={colors.dim}>[#{iteration.id}]</Text>
        <Text color={iconColor}>{icon}</Text>
        <Text color={colors.text}>{truncateTask(iteration.task, 40)}</Text>
      </Box>
      <Box flexDirection="row" gap={1} marginLeft={5}>
        {statsParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text color={colors.dim}> </Text>}
            {part}
          </React.Fragment>
        ))}
        <Text color={colors.dim}>·</Text>
        <Text color={colors.dim}>{iteration.operations} ops</Text>
        <Text color={colors.dim}>·</Text>
        <Text color={colors.dim}>{formatDuration(iteration.durationSec)}</Text>
        {iteration.inputTokens !== undefined && iteration.outputTokens !== undefined && (
          <>
            <Text color={colors.dim}>·</Text>
            <Text color={colors.tokenTotal}>{formatTokens(iteration.inputTokens + iteration.outputTokens)}</Text>
            {showCost && iteration.cost && (
              <Text color={colors.dim}> ({formatCost(iteration.cost.total)})</Text>
            )}
            <Text color={colors.dim}> tokens (</Text>
            <Text color={colors.tokenInput}>{formatTokens(iteration.inputTokens)}</Text>
            <Text color={colors.dim}>in/</Text>
            <Text color={colors.tokenOutput}>{formatTokens(iteration.outputTokens)}</Text>
            <Text color={colors.dim}>out)</Text>
          </>
        )}
        {iteration.usageDelta !== undefined && iteration.usageDelta > 0 && (
          <>
            <Text color={colors.dim}>·</Text>
            <Text color={colors.accent}>+{iteration.usageDelta.toFixed(1)}% usage</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

/** Live stats line during iteration - compact format */
function StatsLine({
  model,
  operations,
  startTime,
  modelBreakdown
}: {
  model: string;
  operations: number;
  startTime: number;
  modelBreakdown: ModelBreakdown;
}): React.ReactElement {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const parts: string[] = [];

  // Model
  parts.push(model);

  // Ops
  parts.push(`${operations} ops`);

  // Time
  if (elapsed > 0) {
    parts.push(formatDuration(elapsed));
  }

  // Subagent breakdown
  const hasSubagents = Object.values(modelBreakdown).some(v => v && v > 0);
  if (hasSubagents) {
    const subagentParts: string[] = [];
    if (modelBreakdown.opus && model !== "opus") {
      subagentParts.push(`opus:${modelBreakdown.opus}`);
    }
    if (modelBreakdown.sonnet && model !== "sonnet") {
      subagentParts.push(`sonnet:${modelBreakdown.sonnet}`);
    }
    if (subagentParts.length > 0) {
      parts.push(`subagents: ${subagentParts.join(" ")}`);
    }
  }

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>{parts.join(" · ")}</Text>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function WorkScreen({
  maxIterations,
  modelMode,
  usage: initialUsage,
  vibeMode = false,
  onRunIteration,
  onComplete,
  pauseDuration = 2000,
  onRefreshUsage,
  nextSteps,
  sessionFile,
}: WorkScreenProps): React.ReactElement {
  const { exit } = useApp();
  const setFinalOutput = useFinalOutput();
  const { columns } = useTerminalSize();

  // State
  const [phase, setPhase] = useState<WorkPhase>("running");
  const [currentIteration, setCurrentIteration] = useState(1);
  const [status, setStatus] = useState("Starting...");
  const [currentTask, setCurrentTask] = useState("Selecting next task...");
  const [tools, setTools] = useState<EnhancedToolCall[]>([]);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [iterations, setIterations] = useState<IterationResult[]>([]);
  const [pauseCountdown, setPauseCountdown] = useState(0);
  const [usage, setUsage] = useState<SubscriptionUsage | undefined>(initialUsage);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [allComplete, setAllComplete] = useState(false);
  const [currentModel, setCurrentModel] = useState(modelMode === "adaptive" ? "opus" : modelMode);
  const [liveModelBreakdown, setLiveModelBreakdown] = useState<ModelBreakdown>({});

  // Session stats
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalIterations: 0,
    totalOperations: 0,
    totalDurationSec: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    cacheTokensSaved: 0,
    cacheWriteTokens: 0,
    modelBreakdown: {},
    totalCostUsd: 0,
    totalCost: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, total: 0 },
    cacheSavings: 0,
  });

  // Token tracking for current iteration
  const [iterationTokens, setIterationTokens] = useState({ input: 0, output: 0 });

  // Toggle states for UI panels
  const [showTokens, setShowTokens] = useState(true);
  const [showCost, setShowCost] = useState(true);
  const [showContext, setShowContext] = useState(true);

  // Context window tracking
  const [contextUsed, setContextUsed] = useState(0);
  const [contextMax] = useState(200000); // Default for Opus (200K context window)

  const shouldContinueRef = useRef(true);

  // Track total operations for display (use ref to capture latest in async)
  const [operationCount, setOperationCount] = useState(0);
  const operationCountRef = useRef(0);
  const [showTools, setShowTools] = useState(true);

  // Handle keyboard input for toggles
  useInput((input: string) => {
    if (input === "t" || input === "T") {
      setShowTools((v: boolean) => !v);
    }
    if (input === "k" || input === "K") {
      setShowTokens((v: boolean) => !v);
    }
    if (input === "c" || input === "C") {
      setShowCost((v: boolean) => !v);
    }
    if (input === "x" || input === "X") {
      setShowContext((v: boolean) => !v);
    }
  });

  // Callbacks
  // Handle EnhancedToolCall with status updates
  const handleToolUse = useCallback((tool: EnhancedToolCall) => {
    setTools((prev: EnhancedToolCall[]) => {
      // Check if this is an update to an existing tool (same id)
      const existingIndex = prev.findIndex((t) => t.id === tool.id);

      if (existingIndex >= 0) {
        // Update existing tool with new status/endTime
        const updated = [...prev];
        updated[existingIndex] = {
          ...prev[existingIndex]!,
          status: tool.status,
          endTime: tool.endTime,
          result: tool.result ?? prev[existingIndex]!.result,
        };
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

  const handleTaskUpdate = useCallback((task: string) => {
    setCurrentTask(task);
  }, []);

  const handleModelBreakdownUpdate = useCallback((breakdown: ModelBreakdown) => {
    setLiveModelBreakdown(breakdown);
  }, []);

  const handleQuit = useCallback(() => {
    shouldContinueRef.current = false;
    const completedTasks = iterations
      .filter((i: IterationResult) => i.success)
      .map((i: IterationResult) => i.task);

    setFinalOutput(buildWorkFinalOutput({
      success: iterations.length > 0,
      title: iterations.length > 0 ? `Stopped after ${iterations.length} iterations` : "Cancelled",
      completedTasks: completedTasks.slice(0, 3),
      stats: sessionStats,
    }));

    onComplete(false, iterations, sessionStats);
  }, [iterations, sessionStats, setFinalOutput, onComplete]);

  // Run the build loop
  useEffect(() => {
    let cancelled = false;

    const runLoop = async (): Promise<void> => {
      for (let iter = 1; iter <= maxIterations; iter++) {
        if (cancelled || !shouldContinueRef.current) break;

        // Get usage before iteration for delta calculation
        let usageBefore: number | undefined;
        if (usage) {
          usageBefore = usage.fiveHour.utilization;
        }

        // Reset state for new iteration
        setCurrentIteration(iter);
        setStatus("Starting iteration...");
        setCurrentTask("Selecting next task...");
        setTools([]);
        setOperationCount(0);
        setStartTime(Date.now());
        setPhase("running");
        setLiveModelBreakdown({});

        const result = await onRunIteration(iter, {
          onToolUse: handleToolUse,
          onStatusUpdate: handleStatusUpdate,
          onTaskUpdate: handleTaskUpdate,
          onModelBreakdownUpdate: handleModelBreakdownUpdate,
        });

        if (cancelled || !shouldContinueRef.current) break;

        // Update current model display
        setCurrentModel(result.model);

        // Calculate usage delta
        let usageDelta: number | undefined;
        if (onRefreshUsage) {
          const newUsage = await onRefreshUsage();
          if (newUsage && usageBefore !== undefined) {
            usageDelta = newUsage.fiveHour.utilization - usageBefore;
          }
          if (newUsage) setUsage(newUsage);
        }

        // Track iteration tokens
        const iterInput = result.inputTokens ?? 0;
        const iterOutput = result.outputTokens ?? 0;
        setIterationTokens({ input: iterInput, output: iterOutput });

        // Calculate cost for this iteration
        const iterationCost = result.inputTokens && result.outputTokens
          ? calculateCostBreakdown(
              {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                cacheReadTokens: result.cacheReadTokens,
                cacheWriteTokens: (result as any).cacheWriteTokens,
              },
              result.model
            )
          : undefined;

        const iterResult: IterationResult = {
          id: iter,
          task: result.task ?? "Unknown task",
          success: result.success,
          validation: result.validation ?? "fail",
          model: result.model,
          operations: result.operations,
          durationSec: result.durationSec,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cacheReadTokens: result.cacheReadTokens,
          cacheWriteTokens: (result as any).cacheWriteTokens,
          modelBreakdown: result.modelBreakdown,
          usageDelta,
          cost: iterationCost,
          costUsd: iterationCost?.total,
        };
        setIterations((prev: IterationResult[]) => [...prev, iterResult]);

        // Update session stats
        setSessionStats((prev: SessionStats) => {
          const newStats = {
            ...prev,
            totalIterations: prev.totalIterations + 1,
            totalOperations: prev.totalOperations + result.operations,
            totalDurationSec: prev.totalDurationSec + result.durationSec,
            totalInputTokens: prev.totalInputTokens + (result.inputTokens ?? 0),
            totalOutputTokens: prev.totalOutputTokens + (result.outputTokens ?? 0),
            cacheTokensSaved: prev.cacheTokensSaved + (result.cacheReadTokens ?? 0),
            cacheWriteTokens: prev.cacheWriteTokens + ((result as any).cacheWriteTokens ?? 0),
          };

          // Update context window usage (cumulative tokens represent context usage)
          const newContextUsed = newStats.totalInputTokens + newStats.totalOutputTokens;
          setContextUsed(newContextUsed);

          // Update cost breakdown
          if (iterationCost) {
            newStats.totalCost = {
              input: prev.totalCost.input + iterationCost.input,
              output: prev.totalCost.output + iterationCost.output,
              cacheWrite: prev.totalCost.cacheWrite + iterationCost.cacheWrite,
              cacheRead: prev.totalCost.cacheRead + iterationCost.cacheRead,
              total: prev.totalCost.total + iterationCost.total,
            };
            newStats.totalCostUsd = newStats.totalCost.total;
          }

          // Calculate cache savings
          if (result.inputTokens && result.outputTokens && result.cacheReadTokens) {
            const savings = calculateCacheSavings(
              {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                cacheReadTokens: result.cacheReadTokens,
              },
              result.model
            );
            newStats.cacheSavings = prev.cacheSavings + savings;
          }

          // Update model breakdown for iterations
          const modelKey = result.model as keyof ModelBreakdown;
          if (modelKey === "opus" || modelKey === "sonnet" || modelKey === "haiku") {
            newStats.modelBreakdown = {
              ...prev.modelBreakdown,
              [modelKey]: (prev.modelBreakdown[modelKey] ?? 0) + 1,
            };
          }
          return newStats;
        });

        // Check for failure
        if (!result.success || result.validation === "fail") {
          setErrorMsg(result.error ?? "Iteration failed");
          setPhase("error");

          const finalStats = {
            ...sessionStats,
            totalIterations: sessionStats.totalIterations + 1,
          };

          setFinalOutput(buildWorkFinalOutput({
            success: false,
            title: "Build loop stopped",
            completedTasks: [],
            stats: finalStats,
          }));

          setTimeout(() => {
            onComplete(false, [...iterations, iterResult], finalStats);
            exit();
          }, 2000);
          return;
        }

        // Check for completion
        if (result.exitSignal) {
          setAllComplete(true);
          setPhase("done");

          const completedTasks = [...iterations, iterResult]
            .filter((i: IterationResult) => i.success)
            .map((i: IterationResult) => i.task);

          const finalStats = {
            ...sessionStats,
            totalIterations: sessionStats.totalIterations + 1,
            totalOperations: sessionStats.totalOperations + result.operations,
            totalDurationSec: sessionStats.totalDurationSec + result.durationSec,
            totalInputTokens: sessionStats.totalInputTokens + (result.inputTokens ?? 0),
            totalOutputTokens: sessionStats.totalOutputTokens + (result.outputTokens ?? 0),
          };

          setFinalOutput(buildWorkFinalOutput({
            success: true,
            title: "Build complete!",
            completedTasks: completedTasks.slice(0, 3),
            stats: finalStats,
            nextSteps,
          }));

          setTimeout(() => {
            onComplete(true, [...iterations, iterResult], finalStats);
            exit();
          }, 500);
          return;
        }

        // Pause between iterations
        if (iter < maxIterations && shouldContinueRef.current) {
          setPhase("pause");

          if (onRefreshUsage) {
            const newUsage = await onRefreshUsage();
            if (newUsage) setUsage(newUsage);
          }

          const pauseSecs = Math.ceil(pauseDuration / 1000);
          for (let s = pauseSecs; s > 0; s--) {
            if (cancelled || !shouldContinueRef.current) break;
            setPauseCountdown(s);
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      // Reached max iterations
      if (!cancelled && shouldContinueRef.current) {
        setPhase("done");

        const completedTasks = iterations
          .filter((i: IterationResult) => i.success)
          .map((i: IterationResult) => i.task);

        setFinalOutput(buildWorkFinalOutput({
          success: true,
          title: `Completed ${iterations.length} iterations`,
          completedTasks: completedTasks.slice(0, 3),
          stats: sessionStats,
          nextSteps,
        }));

        setTimeout(() => {
          onComplete(false, iterations, sessionStats);
          exit();
        }, 500);
      }
    };

    runLoop();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only once on mount; iterations/sessionStats are managed inside the loop
  }, [maxIterations, onRunIteration, handleToolUse, handleStatusUpdate, handleTaskUpdate, handleModelBreakdownUpdate, setFinalOutput, onComplete, exit, pauseDuration, onRefreshUsage, nextSteps]);

  const modelDisplay = modelMode === "adaptive" ? "adaptive" : modelMode;
  const hints = [
    { key: "t", label: showTools ? "hide tools" : "show tools" },
    { key: "k", label: showTokens ? "hide tokens" : "show tokens" },
    { key: "c", label: showCost ? "hide cost" : "show cost" },
    { key: "x", label: showContext ? "hide context" : "show context" },
    ...(usage ? [{ key: "u", label: "usage" }] : []),
    { key: "q", label: "quit" },
  ];

  // Get completed tasks for summary
  const completedTasks = iterations
    .filter((i: IterationResult) => i.success)
    .map((i: IterationResult) => i.task);

  return (
    <CommandBox onQuit={handleQuit} animateBorder={phase === "running"}>
      <Header
        name="Ralph Work"
        description={`${modelDisplay} · max ${maxIterations}`}
        vibeMode={vibeMode}
        vibeCurrentStep="work"
        vibeSteps={["work"]}
      />

      {/* Token stats, cost, context, and usage metrics */}
      <Box flexDirection="row" gap={2} marginBottom={1}>
        {showTokens && (sessionStats.totalInputTokens + sessionStats.totalOutputTokens > 0) && (
          <TokenStats
            inputTokens={sessionStats.totalInputTokens}
            outputTokens={sessionStats.totalOutputTokens}
            cacheReadTokens={sessionStats.cacheTokensSaved}
            iterationDelta={iterationTokens.input + iterationTokens.output > 0 ? iterationTokens : undefined}
            compact={true}
          />
        )}
        {showCost && sessionStats.totalCost && sessionStats.totalCost.total > 0 && (
          <CostBadge
            sessionCost={sessionStats.totalCost.total}
            iterationCost={iterations.length > 0 ? iterations[iterations.length - 1]?.cost?.total : undefined}
            compact={false}
          />
        )}
        {showContext && contextUsed > 0 && (
          <ContextIndicator
            used={contextUsed}
            max={contextMax}
            isGrowing={phase === "running"}
          />
        )}
        {usage && <UsageBars usage={usage} />}
      </Box>

      {/* Completed iterations - only show last 5 to prevent DOM growth */}
      {iterations.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {iterations.length > 5 && (
            <Text color={colors.dim}>... {iterations.length - 5} earlier iterations</Text>
          )}
          {iterations.slice(-5).map((iter: IterationResult) => (
            <React.Fragment key={`iter-${iter.id}`}>
              <IterationLine iteration={iter} showCost={showCost} />
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Running phase */}
      {phase === "running" && (
        <Box flexDirection="column">
          {/* Task title - use most of available width */}
          {(() => {
            const maxTaskWidth = Math.max(60, columns - 20);
            const displayTask = currentTask.length > maxTaskWidth
              ? currentTask.slice(0, maxTaskWidth - 3) + "..."
              : currentTask;
            return (
              <Box flexDirection="row" gap={1} marginBottom={1}>
                <Text color={colors.accent}>[#{currentIteration}]</Text>
                <Text bold>{displayTask}</Text>
              </Box>
            );
          })()}

          {/* Stats line: model, ops, time - compact format */}
          <StatsLine
            model={currentModel}
            operations={operationCount}
            startTime={startTime}
            modelBreakdown={liveModelBreakdown}
          />

          {/* Progress status */}
          <Box marginTop={1}>
            <ProgressLine status={status} startTime={startTime} width={columns - 6} />
          </Box>

          {/* Tool activity with left margin for grouping */}
          {showTools && tools.length > 0 && (
            <Box marginTop={2} marginLeft={2}>
              <ToolActivity tools={tools} visible={showTools} showStats={true} showTimeline={false} />
            </Box>
          )}
        </Box>
      )}

      {/* Pause phase */}
      {phase === "pause" && (
        <Box flexDirection="column">
          <Text color={colors.dim}>Next iteration in {pauseCountdown}s...</Text>
          <Box marginTop={1} flexDirection="row" gap={1}>
            <Text color={colors.dim}>
              {iterations.length}/{maxIterations} iterations · {sessionStats.totalOperations} ops
            </Text>
            {sessionStats.totalInputTokens + sessionStats.totalOutputTokens > 0 && (
              <>
                <Text color={colors.dim}>·</Text>
                <Text color={colors.tokenTotal}>
                  {formatTokens(sessionStats.totalInputTokens + sessionStats.totalOutputTokens)}
                </Text>
                <Text color={colors.dim}>tokens</Text>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Done phase - simple status, useFinalOutput handles detailed output */}
      {phase === "done" && (
        <StatusResult
          type="success"
          title={allComplete ? "Build complete!" : `Completed ${iterations.length} iterations`}
        />
      )}

      {/* Error phase */}
      {phase === "error" && (
        <StatusResult
          type="error"
          title="Build loop stopped"
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

function buildWorkFinalOutput(options: {
  success: boolean;
  title: string;
  completedTasks: string[];
  stats: SessionStats;
  nextSteps?: string[];
}): string {
  const lines: string[] = [];

  // Success/failure header
  if (options.success) {
    lines.push(`${ansi.green}${ansi.bold}✓ ${options.title}${ansi.reset}`);
  } else {
    lines.push(`${ansi.red}${ansi.bold}✗ ${options.title}${ansi.reset}`);
  }

  // Stats summary
  const totalTokens = options.stats.totalInputTokens + options.stats.totalOutputTokens;
  const statsStr = [
    formatDuration(options.stats.totalDurationSec),
    `${options.stats.totalIterations} iterations`,
    `${options.stats.totalOperations} ops`,
  ].join(" · ");

  lines.push(`${ansi.dimGray}${statsStr}${ansi.reset}`);

  // Token summary (primary metric for subscription users)
  if (totalTokens > 0) {
    const tokenStr = `${formatTokens(totalTokens)} tokens (${formatTokens(options.stats.totalInputTokens)} in / ${formatTokens(options.stats.totalOutputTokens)} out)`;
    lines.push(`${ansi.cyan}${tokenStr}${ansi.reset}`);
  }

  // Cost summary
  if (options.stats.totalCost && options.stats.totalCost.total > 0) {
    const costStr = options.stats.cacheSavings > 0
      ? `${formatCost(options.stats.totalCost.total)} (saved ${formatCost(options.stats.cacheSavings)} from cache)`
      : formatCost(options.stats.totalCost.total);
    lines.push(`${ansi.green}💰 ${costStr}${ansi.reset}`);
  }

  // Cache savings
  if (options.stats.cacheTokensSaved > 0) {
    lines.push(`${ansi.dimGray}${formatTokens(options.stats.cacheTokensSaved)} tokens saved by cache${ansi.reset}`);
  }

  // Completed tasks
  if (options.completedTasks.length > 0) {
    lines.push("");
    for (const task of options.completedTasks) {
      lines.push(`${ansi.dimGray}→${ansi.reset} ${ansi.green}✓${ansi.reset} ${truncateTask(task, 50)}`);
    }
  }

  // Next steps
  if (options.nextSteps && options.nextSteps.length > 0) {
    lines.push("");
    lines.push(`${ansi.bold}Next:${ansi.reset}`);
    for (const step of options.nextSteps) {
      lines.push(`  ${ansi.orange}${step}${ansi.reset}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

// ============================================================================
// Render Function
// ============================================================================

export interface RenderWorkOptions {
  maxIterations: number;
  modelMode: string;
  usage?: SubscriptionUsage;
  vibeMode?: boolean;
  onRunIteration: WorkScreenProps["onRunIteration"];
  pauseDuration?: number;
  onRefreshUsage?: () => Promise<SubscriptionUsage | undefined>;
  nextSteps?: string[];
  sessionFile?: string;
}

export async function renderWork(
  options: RenderWorkOptions
): Promise<{ completed: boolean; iterations: IterationResult[]; stats: SessionStats }> {
  let result = {
    completed: false,
    iterations: [] as IterationResult[],
    stats: {
      totalIterations: 0,
      totalOperations: 0,
      totalDurationSec: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      cacheTokensSaved: 0,
      cacheWriteTokens: 0,
      modelBreakdown: {},
      totalCostUsd: 0,
      totalCost: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, total: 0 },
      cacheSavings: 0,
    } as SessionStats,
  };

  const { waitUntilExit } = await render(
    <WorkScreen
      maxIterations={options.maxIterations}
      modelMode={options.modelMode}
      usage={options.usage}
      vibeMode={options.vibeMode}
      onRunIteration={options.onRunIteration}
      onComplete={(completed: boolean, iterations: IterationResult[], stats: SessionStats) => {
        result = { completed, iterations, stats };
      }}
      pauseDuration={options.pauseDuration}
      onRefreshUsage={options.onRefreshUsage}
      nextSteps={options.nextSteps}
      sessionFile={options.sessionFile}
    />,
    { fullScreen: true }
  );

  await waitUntilExit();
  return result;
}
