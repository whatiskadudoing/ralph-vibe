/**
 * @module cli/work
 *
 * The `ralph work` command.
 * Runs the autonomous build loop - Claude implements tasks one at a time.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, error, muted } from '@/ui/colors.ts';
import { CROSS, INFO } from '@/ui/symbols.ts';
import { isRalphProject, readConfig } from '@/services/project_service.ts';
import { DEFAULT_WORK, type RalphConfig, RECOMMENDED_MAX_ITERATIONS } from '@/core/config.ts';
import {
  type BaseSessionContext,
  type ClaudeStreamEvent,
  haveSpecsChanged,
  initializeBaseSession,
  isClaudeInstalled,
  parseAssistantMessage,
  runClaude,
} from '@/services/claude_service.ts';
import { assessComplexity } from '@/core/complexity.ts';
import { exists, readTextFile } from '@/services/file_service.ts';
import { resolvePaths } from '@/services/path_resolver.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  continueVibeSlcLoop,
  enableVibeMode,
  getVibeLoopState,
  initializeVibeLoop,
  isVibeMode,
  showAllSlcsComplete,
  showMaxSlcReached,
  showVibeActivated,
} from './vibe.ts';
import { renderWork } from '@/components/WorkScreen.tsx';
import {
  createSession,
  formatSessionSummary,
  getStats,
  recordIteration as recordSessionIteration,
  saveSession,
  type SessionState,
} from '@/services/session_tracker.ts';
// MetricsState type is used for function parameter types
import {
  createMetricsState,
  formatAggregatedMetrics,
  getAggregatedMetrics,
  recordIteration as recordMetricsIteration,
} from '@/services/metrics_collector.ts';
import type { MetricsState } from '@/services/metrics_collector.ts';
import {
  createMetricsUpdate,
  createReporter,
  formatDuration,
  reportMetrics,
  reportStatus,
  type StatusReporter,
} from '@/services/status_reporter.ts';
import { calculateCacheEfficiency } from '@/services/cost_calculator.ts';
import {
  getNextTaskFromPhases,
  hasExitSignal,
  type NextTask,
  parsePlanPhases,
  parseRalphStatus,
} from './work_parser.ts';

// ============================================================================
// Types
// ============================================================================

type ModelMode = 'opus' | 'sonnet' | 'adaptive';
type Model = 'opus' | 'sonnet';

interface WorkOptions {
  readonly maxIterations?: number;
  readonly dryRun?: boolean;
  readonly vibe?: boolean;
  readonly adaptive?: boolean;
  readonly model?: Model;
}

interface WorkSessionContext {
  sessionState: SessionState;
  metricsState: MetricsState;
  baseSession: BaseSessionContext | null;
  statusReporter: StatusReporter;
  baseModel: Model;
}

interface ToolUseCallback {
  (event: {
    id: string;
    name: string;
    status: 'running' | 'success' | 'error';
    startTime?: number;
    endTime?: number;
    input: Record<string, unknown>;
    subagentModel?: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      cacheEfficiency: number;
    };
    costUsd?: number;
    model?: string;
  }): void;
}

interface IterationCallbacks {
  onToolUse: ToolUseCallback;
  onStatusUpdate: (status: string) => void;
  onTaskUpdate: (task: string) => void;
}

// ============================================================================
// Prompt and Plan Reading
// ============================================================================

/**
 * Reads the build prompt from the project's configured build prompt file.
 */
async function readBuildPrompt(): Promise<string | null> {
  const paths = await resolvePaths();
  const result = await readTextFile(paths.buildPrompt);
  return result.ok ? result.value : null;
}

/**
 * Gets the next unchecked task from the implementation plan file.
 */
async function getNextTaskFromPlan(): Promise<NextTask | null> {
  const paths = await resolvePaths();
  const result = await readTextFile(paths.plan);
  if (!result.ok) return null;

  const phases = parsePlanPhases(result.value);
  return getNextTaskFromPhases(phases);
}

// ============================================================================
// Vibe Mode Handling
// ============================================================================

/**
 * Initializes vibe mode if requested or continuing from previous cycle.
 */
function initializeVibeModeIfNeeded(
  options: WorkOptions,
  maxSlcIterations: number,
): void {
  const vibeLoopState = getVibeLoopState();

  if (vibeLoopState) {
    enableVibeMode();
    return;
  }

  if (options.vibe) {
    enableVibeMode();
    const vibeEnv = initializeVibeLoop(maxSlcIterations);
    for (const [key, value] of Object.entries(vibeEnv)) {
      Deno.env.set(key, value);
    }
    showVibeActivated([
      'Run autonomous build loop',
      'If more SLCs remain -> research -> plan -> work (repeat)',
    ]);
  }
}

// ============================================================================
// Prerequisite Checks
// ============================================================================

/**
 * Displays a warning if the iteration limit is unusually high.
 */
function warnIfHighIterationLimit(maxIterations: number): void {
  if (maxIterations > 50) {
    console.log();
    console.log(
      amber(
        `  ${INFO} High iteration limit (${maxIterations}). Consider using ${RECOMMENDED_MAX_ITERATIONS} for safety.`,
      ),
    );
    console.log(muted('     High limits can lead to runaway loops on impossible tasks.'));
  }
}

/**
 * Checks all prerequisites for the work command.
 * Returns true if all checks pass, exits the process otherwise.
 */
async function checkPrerequisites(): Promise<boolean> {
  if (!(await isRalphProject())) {
    console.log(error(`${CROSS} Not a Ralph project.`));
    console.log(muted('  Run `ralph init` first to initialize.'));
    Deno.exit(1);
  }

  if (!(await isClaudeInstalled())) {
    console.log(error(`${CROSS} Claude CLI not found.`));
    console.log(muted('  Install from: https://docs.anthropic.com/claude-code'));
    Deno.exit(1);
  }

  const paths = await resolvePaths();
  if (!(await exists(paths.plan))) {
    console.log(error(`${CROSS} No implementation plan found.`));
    console.log(muted('  Run `ralph plan` first to generate a plan.'));
    Deno.exit(1);
  }

  return true;
}

// ============================================================================
// Dry Run Mode
// ============================================================================

/**
 * Handles dry run mode - displays configuration without executing.
 */
async function handleDryRun(
  options: WorkOptions,
  maxIterations: number,
): Promise<void> {
  const configResult = await readConfig();
  const modelMode = determineModelMode(options, configResult.ok ? configResult.value : null);

  const nextTask = await getNextTaskFromPlan();
  const usage = await getSubscriptionUsage();
  const paths = await resolvePaths();

  console.log();
  console.log(`  Dry Run Mode`);
  console.log();
  console.log(`  Model:        ${modelMode}`);
  console.log(`  Max iters:    ${maxIterations}`);
  console.log(`  Next task:    ${nextTask?.task ?? '(none)'}`);
  console.log(`  Plan:         ${paths.plan}`);

  if (usage.ok) {
    const fiveHourUtil = Math.round(usage.value.fiveHour.utilization);
    const sevenDayUtil = Math.round(usage.value.sevenDay.utilization);
    console.log(`  Usage:        5h: ${fiveHourUtil}% | 7d: ${sevenDayUtil}%`);
  }

  console.log();
  console.log(`  Run without --dry-run to start the build loop.`);
  console.log();
}

// ============================================================================
// Model Selection
// ============================================================================

/**
 * Determines the model mode based on options and config.
 * Precedence: --model > --adaptive > config
 */
function determineModelMode(options: WorkOptions, config: RalphConfig | null): ModelMode {
  if (options.model) {
    return options.model;
  }
  if (options.adaptive) {
    return 'adaptive';
  }
  return config?.work.model ?? 'opus';
}

/**
 * Selects the model for a specific iteration based on task complexity.
 */
function selectModelForIteration(
  modelMode: ModelMode,
  nextTask: NextTask | null,
): Model {
  if (modelMode === 'adaptive' && nextTask?.task) {
    const assessment = assessComplexity(nextTask.task, nextTask.phase);
    return assessment.model;
  }
  if (modelMode === 'adaptive') {
    return 'opus';
  }
  return modelMode as Model;
}

// ============================================================================
// Session Initialization
// ============================================================================

/**
 * Initializes the work session context including tracking and caching.
 */
async function initializeWorkSession(modelMode: ModelMode): Promise<WorkSessionContext> {
  const baseModel: Model = modelMode === 'adaptive' ? 'opus' : modelMode;

  let baseSession: BaseSessionContext | null = null;
  const baseSessionResult = await initializeBaseSession(baseModel);
  if (baseSessionResult.ok) {
    baseSession = baseSessionResult.value;
  }

  const sessionState = createSession({
    forking: baseSession !== null,
    specsCount: baseSession?.specsMtimes ? Object.keys(baseSession.specsMtimes).length : 0,
    projectPath: Deno.cwd(),
  });

  const metricsState = createMetricsState(sessionState.sessionId);
  const statusReporter = createReporter();

  return {
    sessionState,
    metricsState,
    baseSession,
    statusReporter,
    baseModel,
  };
}

/**
 * Refreshes the base session if specs have changed.
 */
async function refreshBaseSessionIfNeeded(
  context: WorkSessionContext,
): Promise<BaseSessionContext | null> {
  if (!context.baseSession) {
    return null;
  }

  const specsChanged = await haveSpecsChanged(context.baseSession.specsMtimes);
  if (!specsChanged) {
    return context.baseSession;
  }

  const newSessionResult = await initializeBaseSession(context.baseModel);
  return newSessionResult.ok ? newSessionResult.value : null;
}

// ============================================================================
// Tool Event Processing
// ============================================================================

/**
 * Marks the previous tool as completed.
 */
function markToolCompleted(
  toolId: string | null,
  onToolUse: ToolUseCallback,
  status: 'success' | 'error' = 'success',
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    cacheEfficiency: number;
  },
  costUsd?: number,
  model?: string,
): void {
  if (toolId) {
    onToolUse({
      id: toolId,
      name: '',
      status,
      endTime: Date.now(),
      input: {},
      tokenUsage,
      costUsd,
      model,
    });
  }
}

/**
 * Emits a new running tool event.
 */
function emitToolRunning(
  toolId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  onToolUse: ToolUseCallback,
): void {
  const subagentModel = toolName === 'Task' ? (toolInput.model as string | undefined) : undefined;

  onToolUse({
    id: toolId,
    name: toolName,
    status: 'running',
    startTime: Date.now(),
    input: toolInput,
    subagentModel,
  });
}

/**
 * Extracts a status message from assistant text for display.
 */
function extractStatusMessage(text: string): string | null {
  const firstParagraph = text.split('\n\n')[0]?.trim().replace(/\n/g, ' ');

  if (!firstParagraph || firstParagraph.length === 0) {
    return null;
  }
  if (firstParagraph.startsWith('#') || firstParagraph.startsWith('`')) {
    return null;
  }

  const maxLength = 300;
  if (firstParagraph.length > maxLength) {
    return firstParagraph.slice(0, maxLength - 3) + '...';
  }
  return firstParagraph;
}

/**
 * Extracts token usage data from a result event.
 */
function extractTokenUsage(data: Record<string, unknown>): {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCostUsd: number | undefined;
} {
  const usage = data.usage as Record<string, number> | undefined;
  const result = data.result as Record<string, unknown> | undefined;
  const resultUsage = result?.usage as Record<string, number> | undefined;

  return {
    inputTokens: usage?.input_tokens ?? resultUsage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? resultUsage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? resultUsage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage?.cache_creation_input_tokens ??
      resultUsage?.cache_creation_input_tokens ?? 0,
    totalCostUsd: typeof data.total_cost_usd === 'number' ? data.total_cost_usd : undefined,
  };
}

/**
 * Calculates cache efficiency percentage from token usage.
 */
function calculateCacheEfficiencyPercent(
  cacheReadTokens: number,
  cacheWriteTokens: number,
): number {
  const totalCacheableTokens = cacheReadTokens + cacheWriteTokens;
  if (totalCacheableTokens === 0) return 0;
  return Math.round((cacheReadTokens / totalCacheableTokens) * 100);
}

/**
 * Extracts model information from event data.
 */
function extractModel(data: Record<string, unknown>): string | undefined {
  const message = data.message as Record<string, unknown> | undefined;
  return message?.model as string | undefined;
}

// ============================================================================
// Iteration Recording
// ============================================================================

/**
 * Records iteration data in session tracker.
 */
function recordIterationInSession(
  sessionState: SessionState,
  iteration: number,
  task: string,
  model: Model,
  durationSec: number,
  operations: number,
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  },
  success: boolean,
): SessionState {
  return recordSessionIteration(sessionState, {
    iteration,
    task,
    model: model as 'opus' | 'sonnet' | 'haiku',
    durationSec,
    operations,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cacheReadTokens: tokens.cacheReadTokens,
    cacheWriteTokens: tokens.cacheWriteTokens,
    success,
  });
}

/**
 * Records iteration data in metrics collector.
 */
function recordIterationInMetrics(
  metricsState: MetricsState,
  iteration: number,
  model: Model,
  durationMs: number,
  operations: number,
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  },
  success: boolean,
): MetricsState {
  return recordMetricsIteration(metricsState, {
    iteration,
    model: model as 'opus' | 'sonnet' | 'haiku',
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cacheReadTokens: tokens.cacheReadTokens,
    cacheWriteTokens: tokens.cacheWriteTokens,
    duration: durationMs,
    toolCallCount: operations,
    success,
    timestamp: Date.now(),
  });
}

/**
 * Reports iteration metrics and status.
 */
function reportIterationComplete(
  statusReporter: StatusReporter,
  iteration: number,
  task: string | undefined,
  tokens: { inputTokens: number; outputTokens: number },
  cacheEfficiency: number,
  durationMs: number,
  operations: number,
  totalCostUsd: number,
  success: boolean,
): void {
  const totalTokens = tokens.inputTokens + tokens.outputTokens;

  reportMetrics(
    statusReporter,
    createMetricsUpdate(
      tokens.inputTokens,
      tokens.outputTokens,
      totalCostUsd,
      durationMs,
      operations,
      cacheEfficiency,
    ),
  );

  reportStatus(statusReporter, `Iteration ${iteration} complete`, {
    task,
    success,
    tokens: totalTokens,
    cacheEfficiency: cacheEfficiency.toFixed(1) + '%',
    duration: formatDuration(durationMs),
  });
}

// ============================================================================
// Session Summary
// ============================================================================

/**
 * Displays the session summary after the work loop completes.
 */
function displaySessionSummary(sessionState: SessionState, metricsState: MetricsState): void {
  const summaryLines = formatSessionSummary(sessionState);
  const aggregatedMetrics = getAggregatedMetrics(metricsState);
  const metricsLines = formatAggregatedMetrics(aggregatedMetrics);
  const sessionStats = getStats(sessionState);

  console.log();
  console.log(muted('  Session Summary:'));
  for (const line of summaryLines) {
    console.log(muted(`    ${line}`));
  }

  if (sessionStats.cacheEfficiency > 0) {
    console.log();
    console.log(muted(`  Cache Efficiency: ${sessionStats.cacheEfficiency.toFixed(1)}%`));
  }

  console.log();
  console.log(muted('  Metrics:'));
  for (const line of metricsLines) {
    console.log(muted(`    ${line}`));
  }
}

// ============================================================================
// Vibe Loop Continuation
// ============================================================================

/**
 * Handles vibe loop continuation after work completes.
 */
async function handleVibeLoopContinuation(completed: boolean): Promise<void> {
  if (!isVibeMode() || !completed) {
    Deno.exit(completed ? 0 : 1);
    return;
  }

  const currentState = getVibeLoopState();

  if (!currentState) {
    showAllSlcsComplete(1);
    Deno.exit(0);
    return;
  }

  if (currentState.slcIteration >= currentState.maxSlcIterations) {
    showMaxSlcReached(currentState.maxSlcIterations);
    Deno.exit(0);
    return;
  }

  await continueVibeSlcLoop(currentState);
}

// ============================================================================
// Claude Event Processing
// ============================================================================

interface ClaudeExecutionState {
  operationCount: number;
  fullText: string;
  hasError: boolean;
  toolCounter: number;
  currentToolId: string | null;
  /** Tool ID waiting for result event with token usage */
  pendingResultToolId: string | null;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    totalCostUsd: number | undefined;
  };
}

/**
 * Creates initial state for Claude execution tracking.
 */
function createExecutionState(): ClaudeExecutionState {
  return {
    operationCount: 0,
    fullText: '',
    hasError: false,
    toolCounter: 0,
    currentToolId: null,
    pendingResultToolId: null,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalCostUsd: undefined,
    },
  };
}

/**
 * Processes an assistant event from Claude.
 */
function processAssistantEvent(
  event: ClaudeStreamEvent,
  state: ClaudeExecutionState,
  iteration: number,
  callbacks: IterationCallbacks,
): void {
  const messages = parseAssistantMessage(event);

  for (const message of messages) {
    if (message.text) {
      state.fullText += message.text;
      const statusMessage = extractStatusMessage(message.text);
      if (statusMessage) {
        callbacks.onStatusUpdate(statusMessage);
      }
    }

    if (message.toolUse) {
      // Save the current tool ID - it will receive token usage when result event comes
      state.pendingResultToolId = state.currentToolId;
      markToolCompleted(state.currentToolId, callbacks.onToolUse);
      state.operationCount++;
      state.toolCounter++;
      state.currentToolId = `${iteration}-${state.toolCounter}`;

      const toolInput = (message.toolUse.input ?? {}) as Record<string, unknown>;
      emitToolRunning(state.currentToolId, message.toolUse.name, toolInput, callbacks.onToolUse);
    }
  }
}

/**
 * Processes a result event from Claude.
 */
function processResultEvent(
  event: ClaudeStreamEvent,
  state: ClaudeExecutionState,
  callbacks: IterationCallbacks,
): void {
  const data = event.data as Record<string, unknown>;
  state.hasError = data.is_error === true;
  state.tokenUsage = extractTokenUsage(data);

  // Build token usage for the tool call
  const tokenUsageForTool = {
    inputTokens: state.tokenUsage.inputTokens,
    outputTokens: state.tokenUsage.outputTokens,
    cacheReadTokens: state.tokenUsage.cacheReadTokens,
    cacheWriteTokens: state.tokenUsage.cacheWriteTokens,
    cacheEfficiency: calculateCacheEfficiencyPercent(
      state.tokenUsage.cacheReadTokens,
      state.tokenUsage.cacheWriteTokens,
    ),
  };

  const model = extractModel(data);
  const costUsd = state.tokenUsage.totalCostUsd;

  // Use pendingResultToolId - this is the tool that just completed and is waiting for token data
  markToolCompleted(
    state.pendingResultToolId,
    callbacks.onToolUse,
    state.hasError ? 'error' : 'success',
    tokenUsageForTool,
    costUsd,
    model,
  );
  state.pendingResultToolId = null;
}

/**
 * Executes Claude and processes all events.
 */
async function executeClaudeIteration(
  prompt: string,
  model: Model,
  context: WorkSessionContext,
  iteration: number,
  callbacks: IterationCallbacks,
): Promise<{ state: ClaudeExecutionState; error?: Error }> {
  const state = createExecutionState();

  try {
    for await (
      const event of runClaude({
        prompt,
        model,
        skipPermissions: true,
        resumeSessionId: context.baseSession?.sessionId,
        forkSession: context.baseSession !== null,
      })
    ) {
      if (event.type === 'assistant') {
        processAssistantEvent(event, state, iteration, callbacks);
      } else if (event.type === 'result') {
        processResultEvent(event, state, callbacks);
      }
    }
    return { state };
  } catch (err) {
    markToolCompleted(state.currentToolId, callbacks.onToolUse, 'error');
    return { state, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Finalizes iteration by recording metrics and reporting status.
 */
function finalizeIteration(
  context: WorkSessionContext,
  iteration: number,
  taskName: string,
  model: Model,
  durationMs: number,
  state: ClaudeExecutionState,
): void {
  const durationSec = Math.floor(durationMs / 1000);

  const cacheEfficiency = calculateCacheEfficiency({
    inputTokens: state.tokenUsage.inputTokens,
    outputTokens: state.tokenUsage.outputTokens,
    cacheReadTokens: state.tokenUsage.cacheReadTokens,
  });

  context.sessionState = recordIterationInSession(
    context.sessionState,
    iteration,
    taskName,
    model,
    durationSec,
    state.operationCount,
    state.tokenUsage,
    !state.hasError,
  );

  saveSession(context.sessionState).catch(() => {
    // Silent fail - tracking is optional
  });

  context.metricsState = recordIterationInMetrics(
    context.metricsState,
    iteration,
    model,
    durationMs,
    state.operationCount,
    state.tokenUsage,
    !state.hasError,
  );

  reportIterationComplete(
    context.statusReporter,
    iteration,
    taskName,
    { inputTokens: state.tokenUsage.inputTokens, outputTokens: state.tokenUsage.outputTokens },
    cacheEfficiency,
    durationMs,
    state.operationCount,
    state.tokenUsage.totalCostUsd ?? 0,
    !state.hasError,
  );
}

// ============================================================================
// Iteration Result Types
// ============================================================================

interface IterationResult {
  success: boolean;
  error?: string;
  task?: string;
  validation?: 'pass' | 'fail';
  exitSignal?: boolean;
  model: Model;
  operations: number;
  durationSec: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  usedBaseSession?: boolean;
}

/**
 * Creates an error result for iteration failures.
 */
function createErrorResult(
  model: Model,
  errorMessage: string,
  operations: number,
  durationSec: number,
): IterationResult {
  return {
    success: false,
    error: errorMessage,
    model,
    operations,
    durationSec,
  };
}

/**
 * Creates a success result from execution state.
 */
function createSuccessResult(
  state: ClaudeExecutionState,
  model: Model,
  taskName: string,
  durationSec: number,
  validation: 'pass' | 'fail',
  exitSignal: boolean,
  usedBaseSession: boolean,
): IterationResult {
  return {
    success: !state.hasError,
    task: taskName,
    validation,
    exitSignal,
    model,
    operations: state.operationCount,
    durationSec,
    inputTokens: state.tokenUsage.inputTokens,
    outputTokens: state.tokenUsage.outputTokens,
    cacheReadTokens: state.tokenUsage.cacheReadTokens,
    cacheWriteTokens: state.tokenUsage.cacheWriteTokens,
    usedBaseSession,
  };
}

// ============================================================================
// Main Iteration Handler
// ============================================================================

/**
 * Creates the iteration handler for the work loop.
 * This is the callback passed to renderWork that runs each iteration.
 */
function createIterationHandler(
  context: WorkSessionContext,
  modelMode: ModelMode,
): (iteration: number, callbacks: IterationCallbacks) => Promise<IterationResult> {
  return async (
    iteration: number,
    callbacks: IterationCallbacks,
  ): Promise<IterationResult> => {
    const nextTask = await getNextTaskFromPlan();
    if (nextTask?.task) {
      callbacks.onTaskUpdate(nextTask.task);
    }

    const model = selectModelForIteration(modelMode, nextTask);

    const prompt = await readBuildPrompt();
    if (!prompt) {
      return createErrorResult(
        model,
        'PROMPT_build.md not found. Run `ralph init` to create it.',
        0,
        0,
      );
    }

    context.baseSession = await refreshBaseSessionIfNeeded(context);

    const startTime = Date.now();
    const { state, error } = await executeClaudeIteration(
      prompt,
      model,
      context,
      iteration,
      callbacks,
    );

    if (error) {
      return createErrorResult(
        model,
        error.message,
        state.operationCount,
        Math.floor((Date.now() - startTime) / 1000),
      );
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.floor(durationMs / 1000);

    const status = parseRalphStatus(state.fullText);
    const exitSignal = status?.exitSignal ?? hasExitSignal(state.fullText);
    const taskName = status?.task ?? nextTask?.task ?? 'Unknown task';

    finalizeIteration(context, iteration, taskName, model, durationMs, state);

    return createSuccessResult(
      state,
      model,
      taskName,
      durationSec,
      status?.validation ?? 'pass',
      exitSignal,
      context.baseSession !== null,
    );
  };
}

// ============================================================================
// Command Action
// ============================================================================

/**
 * The work command action - main entry point.
 */
async function workAction(options: WorkOptions): Promise<void> {
  const configResult = await readConfig();
  const config = configResult.ok ? configResult.value : null;

  const maxIterations = options.maxIterations ?? DEFAULT_WORK.maxIterations;
  const maxSlcIterations = config?.work.maxSlcIterations ?? DEFAULT_WORK.maxSlcIterations;

  initializeVibeModeIfNeeded(options, maxSlcIterations);
  warnIfHighIterationLimit(maxIterations);
  await checkPrerequisites();

  if (options.dryRun) {
    await handleDryRun(options, maxIterations);
    return;
  }

  const modelMode = determineModelMode(options, config);
  const context = await initializeWorkSession(modelMode);

  reportStatus(context.statusReporter, 'Starting work loop', {
    maxIterations,
    modelMode,
    forking: context.baseSession !== null,
  });

  const initialUsage = await getSubscriptionUsage();

  const result = await renderWork({
    maxIterations,
    modelMode,
    usage: initialUsage.ok ? initialUsage.value : undefined,
    vibeMode: isVibeMode(),
    pauseDuration: 2000,
    onRefreshUsage: async () => {
      const usage = await getSubscriptionUsage();
      return usage.ok ? usage.value : undefined;
    },
    onRunIteration: createIterationHandler(context, modelMode),
  });

  const aggregatedMetrics = getAggregatedMetrics(context.metricsState);

  reportStatus(context.statusReporter, 'Work loop complete', {
    completed: result.completed,
    iterations: aggregatedMetrics.totalIterations,
    totalCost: aggregatedMetrics.totalCost,
    cacheEfficiency: aggregatedMetrics.cacheEfficiency,
    successRate: aggregatedMetrics.successRate,
  });

  if (result.iterations.length > 0 && !isVibeMode()) {
    displaySessionSummary(context.sessionState, context.metricsState);
  }

  await handleVibeLoopContinuation(result.completed);
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * Creates the work command.
 */
// deno-lint-ignore no-explicit-any
export function createWorkCommand(): Command<any> {
  return new Command()
    .description('Run the autonomous build loop (implements tasks one by one)')
    .option(
      '-n, --max-iterations <count:number>',
      'Maximum iterations before stopping (default: 25 for safety)',
      {
        default: DEFAULT_WORK.maxIterations,
      },
    )
    .option('--dry-run', 'Show what would happen without running')
    .option('--vibe', 'Vibe mode (no effect on work - already the last step)')
    .option('--adaptive', 'Adaptive model selection (sonnet for simple, opus for complex)')
    .option('--model <model:string>', 'Force specific model (opus or sonnet)', {
      value: (val: string) => {
        if (val !== 'opus' && val !== 'sonnet') {
          throw new Error('Model must be "opus" or "sonnet"');
        }
        return val as 'opus' | 'sonnet';
      },
    })
    .action(workAction);
}
