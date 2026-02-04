/**
 * @module tests/services/metrics_collector_test
 *
 * Tests for services/metrics_collector module.
 * Covers metrics collection, aggregation, and formatting with immutable state pattern.
 */

import { assertEquals, assertExists, assertNotEquals } from '@std/assert';
import {
  collectDuration,
  collectTokenUsage,
  collectToolCall,
  createMetricsState,
  formatAggregatedMetrics,
  getAggregatedMetrics,
  type IterationMetrics,
  recordIteration,
  type ToolCallMetric,
} from '../../src/services/metrics_collector.ts';
import { type TokenUsage } from '../../src/services/cost_calculator.ts';

// ============================================================================
// createMetricsState Tests
// ============================================================================

Deno.test('createMetricsState creates state with generated session ID', () => {
  const state = createMetricsState();

  assertExists(state.sessionId);
  assertEquals(state.sessionId.length, 8); // UUID slice
  assertExists(state.startTime);
  assertEquals(state.iterations.length, 0);
  assertEquals(state.toolCalls.length, 0);
});

Deno.test('createMetricsState accepts custom session ID', () => {
  const state = createMetricsState('custom-session');

  assertEquals(state.sessionId, 'custom-session');
});

Deno.test('createMetricsState creates independent instances', () => {
  const state1 = createMetricsState('session-1');
  const state2 = createMetricsState('session-2');

  assertEquals(state1.sessionId, 'session-1');
  assertEquals(state2.sessionId, 'session-2');
  assertNotEquals(state1.startTime, state2.startTime + 1000); // Should be close but independent
});

Deno.test('createMetricsState sets startTime to current time', () => {
  const before = Date.now();
  const state = createMetricsState();
  const after = Date.now();

  assertEquals(state.startTime >= before, true);
  assertEquals(state.startTime <= after, true);
});

// ============================================================================
// collectTokenUsage Tests
// ============================================================================

Deno.test('collectTokenUsage returns new state (immutable)', () => {
  const state = createMetricsState('test');
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
  };

  const newState = collectTokenUsage(state, usage, 'opus');

  assertNotEquals(state, newState);
  assertEquals(state.iterations.length, 0);
  assertEquals(newState.iterations.length, 1);
});

Deno.test('collectTokenUsage creates iteration with correct token data', () => {
  const state = createMetricsState('test');
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    cacheWriteTokens: 100,
  };

  const newState = collectTokenUsage(state, usage, 'sonnet');
  const iteration = newState.iterations[0];

  assertExists(iteration);
  assertEquals(iteration.inputTokens, 1000);
  assertEquals(iteration.outputTokens, 500);
  assertEquals(iteration.cacheReadTokens, 200);
  assertEquals(iteration.cacheWriteTokens, 100);
  assertEquals(iteration.model, 'sonnet');
  assertEquals(iteration.iteration, 1);
  assertEquals(iteration.success, true);
  assertEquals(iteration.duration, 0); // Duration added separately
  assertEquals(iteration.toolCallCount, 0);
});

Deno.test('collectTokenUsage normalizes model names', () => {
  const state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };

  const opusState = collectTokenUsage(state, usage, 'claude-opus-4');
  assertEquals(opusState.iterations[0]?.model, 'opus');

  const sonnetState = collectTokenUsage(state, usage, 'claude-sonnet-4');
  assertEquals(sonnetState.iterations[0]?.model, 'sonnet');

  const haikuState = collectTokenUsage(state, usage, 'claude-3-5-haiku');
  assertEquals(haikuState.iterations[0]?.model, 'haiku');
});

Deno.test('collectTokenUsage defaults unknown model to opus', () => {
  const state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };

  const newState = collectTokenUsage(state, usage, 'unknown-model');
  assertEquals(newState.iterations[0]?.model, 'opus');
});

Deno.test('collectTokenUsage increments iteration number', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };

  state = collectTokenUsage(state, usage, 'opus');
  state = collectTokenUsage(state, usage, 'opus');
  state = collectTokenUsage(state, usage, 'opus');

  assertEquals(state.iterations.length, 3);
  assertEquals(state.iterations[0]?.iteration, 1);
  assertEquals(state.iterations[1]?.iteration, 2);
  assertEquals(state.iterations[2]?.iteration, 3);
});

Deno.test('collectTokenUsage handles missing cache tokens', () => {
  const state = createMetricsState('test');
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
    // No cache tokens
  };

  const newState = collectTokenUsage(state, usage, 'opus');
  const iteration = newState.iterations[0];

  assertEquals(iteration?.cacheReadTokens, 0);
  assertEquals(iteration?.cacheWriteTokens, 0);
});

// ============================================================================
// collectDuration Tests
// ============================================================================

Deno.test('collectDuration returns new state (immutable)', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  const newState = collectDuration(state, 5000);

  assertNotEquals(state, newState);
  assertEquals(state.iterations[0]?.duration, 0);
  assertEquals(newState.iterations[0]?.duration, 5000);
});

Deno.test('collectDuration updates last iteration only', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };

  state = collectTokenUsage(state, usage, 'opus');
  state = collectDuration(state, 1000);
  state = collectTokenUsage(state, usage, 'opus');
  state = collectDuration(state, 2000);

  assertEquals(state.iterations[0]?.duration, 1000);
  assertEquals(state.iterations[1]?.duration, 2000);
});

Deno.test('collectDuration returns same state if no iterations', () => {
  const state = createMetricsState('test');

  const newState = collectDuration(state, 5000);

  assertEquals(state, newState);
});

// ============================================================================
// collectToolCall Tests
// ============================================================================

Deno.test('collectToolCall returns new state (immutable)', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  const toolCall: ToolCallMetric = {
    iteration: 1,
    toolName: 'bash',
    duration: 500,
    success: true,
  };

  const newState = collectToolCall(state, toolCall);

  assertNotEquals(state, newState);
  assertEquals(state.toolCalls.length, 0);
  assertEquals(newState.toolCalls.length, 1);
});

Deno.test('collectToolCall adds tool call to state', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  const toolCall: ToolCallMetric = {
    iteration: 1,
    toolName: 'read',
    duration: 100,
    success: true,
  };

  const newState = collectToolCall(state, toolCall);

  assertEquals(newState.toolCalls.length, 1);
  assertEquals(newState.toolCalls[0]?.toolName, 'read');
  assertEquals(newState.toolCalls[0]?.duration, 100);
  assertEquals(newState.toolCalls[0]?.success, true);
});

Deno.test('collectToolCall updates iteration tool call count', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  const toolCall: ToolCallMetric = {
    iteration: 1,
    toolName: 'bash',
    duration: 500,
    success: true,
  };

  state = collectToolCall(state, toolCall);
  assertEquals(state.iterations[0]?.toolCallCount, 1);

  state = collectToolCall(state, { ...toolCall, toolName: 'read' });
  assertEquals(state.iterations[0]?.toolCallCount, 2);
});

Deno.test('collectToolCall handles failed tool calls', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  const toolCall: ToolCallMetric = {
    iteration: 1,
    toolName: 'bash',
    duration: 1000,
    success: false,
  };

  const newState = collectToolCall(state, toolCall);

  assertEquals(newState.toolCalls[0]?.success, false);
});

// ============================================================================
// recordIteration Tests
// ============================================================================

Deno.test('recordIteration returns new state (immutable)', () => {
  const state = createMetricsState('test');

  const iteration: IterationMetrics = {
    iteration: 1,
    model: 'opus',
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 100,
    cacheWriteTokens: 50,
    duration: 3000,
    toolCallCount: 2,
    success: true,
    timestamp: Date.now(),
  };

  const newState = recordIteration(state, iteration);

  assertNotEquals(state, newState);
  assertEquals(state.iterations.length, 0);
  assertEquals(newState.iterations.length, 1);
});

Deno.test('recordIteration adds complete iteration', () => {
  const state = createMetricsState('test');

  const iteration: IterationMetrics = {
    iteration: 1,
    model: 'sonnet',
    inputTokens: 2000,
    outputTokens: 1000,
    cacheReadTokens: 500,
    cacheWriteTokens: 200,
    duration: 5000,
    toolCallCount: 5,
    success: true,
    timestamp: Date.now(),
  };

  const newState = recordIteration(state, iteration);

  assertEquals(newState.iterations[0], iteration);
});

Deno.test('recordIteration preserves existing iterations', () => {
  let state = createMetricsState('test');

  const iteration1: IterationMetrics = {
    iteration: 1,
    model: 'opus',
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 2000,
    toolCallCount: 1,
    success: true,
    timestamp: Date.now(),
  };

  const iteration2: IterationMetrics = {
    iteration: 2,
    model: 'sonnet',
    inputTokens: 800,
    outputTokens: 400,
    cacheReadTokens: 100,
    cacheWriteTokens: 0,
    duration: 1500,
    toolCallCount: 2,
    success: true,
    timestamp: Date.now(),
  };

  state = recordIteration(state, iteration1);
  state = recordIteration(state, iteration2);

  assertEquals(state.iterations.length, 2);
  assertEquals(state.iterations[0]?.model, 'opus');
  assertEquals(state.iterations[1]?.model, 'sonnet');
});

// ============================================================================
// getAggregatedMetrics Tests
// ============================================================================

Deno.test('getAggregatedMetrics returns zeros for empty state', () => {
  const state = createMetricsState('test');

  const metrics = getAggregatedMetrics(state);

  assertEquals(metrics.totalIterations, 0);
  assertEquals(metrics.totalInputTokens, 0);
  assertEquals(metrics.totalOutputTokens, 0);
  assertEquals(metrics.totalCacheReadTokens, 0);
  assertEquals(metrics.totalCacheWriteTokens, 0);
  assertEquals(metrics.totalDuration, 0);
  assertEquals(metrics.totalCost, 0);
  assertEquals(metrics.cacheEfficiency, 0);
  assertEquals(metrics.averageIterationDuration, 0);
  assertEquals(metrics.successRate, 0);
  assertEquals(Object.keys(metrics.toolCallsByType).length, 0);
});

Deno.test('getAggregatedMetrics calculates totals correctly', () => {
  let state = createMetricsState('test');

  const iteration1: IterationMetrics = {
    iteration: 1,
    model: 'opus',
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    cacheWriteTokens: 100,
    duration: 2000,
    toolCallCount: 2,
    success: true,
    timestamp: Date.now(),
  };

  const iteration2: IterationMetrics = {
    iteration: 2,
    model: 'opus',
    inputTokens: 800,
    outputTokens: 400,
    cacheReadTokens: 300,
    cacheWriteTokens: 50,
    duration: 1500,
    toolCallCount: 1,
    success: true,
    timestamp: Date.now(),
  };

  state = recordIteration(state, iteration1);
  state = recordIteration(state, iteration2);

  const metrics = getAggregatedMetrics(state);

  assertEquals(metrics.totalIterations, 2);
  assertEquals(metrics.totalInputTokens, 1800);
  assertEquals(metrics.totalOutputTokens, 900);
  assertEquals(metrics.totalCacheReadTokens, 500);
  assertEquals(metrics.totalCacheWriteTokens, 150);
  assertEquals(metrics.totalDuration, 3500);
});

Deno.test('getAggregatedMetrics calculates cache efficiency', () => {
  let state = createMetricsState('test');

  const iteration: IterationMetrics = {
    iteration: 1,
    model: 'opus',
    inputTokens: 500,
    outputTokens: 200,
    cacheReadTokens: 500, // 50% from cache
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  };

  state = recordIteration(state, iteration);

  const metrics = getAggregatedMetrics(state);

  // Cache efficiency: 500 / (500 + 500) = 50%
  assertEquals(metrics.cacheEfficiency, 50);
});

Deno.test('getAggregatedMetrics calculates average duration', () => {
  let state = createMetricsState('test');

  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  state = recordIteration(state, {
    iteration: 2,
    model: 'opus',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 3000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);

  // Average: (1000 + 3000) / 2 = 2000
  assertEquals(metrics.averageIterationDuration, 2000);
});

Deno.test('getAggregatedMetrics calculates success rate', () => {
  let state = createMetricsState('test');

  const baseIteration: IterationMetrics = {
    iteration: 1,
    model: 'opus',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  };

  state = recordIteration(state, { ...baseIteration, iteration: 1, success: true });
  state = recordIteration(state, { ...baseIteration, iteration: 2, success: true });
  state = recordIteration(state, { ...baseIteration, iteration: 3, success: false });
  state = recordIteration(state, { ...baseIteration, iteration: 4, success: true });

  const metrics = getAggregatedMetrics(state);

  // 3 successful out of 4 = 75%
  assertEquals(metrics.successRate, 75);
});

Deno.test('getAggregatedMetrics aggregates tool calls by type', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  state = collectToolCall(state, { iteration: 1, toolName: 'bash', duration: 100, success: true });
  state = collectToolCall(state, { iteration: 1, toolName: 'read', duration: 50, success: true });
  state = collectToolCall(state, { iteration: 1, toolName: 'bash', duration: 200, success: true });
  state = collectToolCall(state, { iteration: 1, toolName: 'write', duration: 150, success: true });
  state = collectToolCall(state, { iteration: 1, toolName: 'bash', duration: 100, success: true });

  const metrics = getAggregatedMetrics(state);

  assertEquals(metrics.toolCallsByType['bash'], 3);
  assertEquals(metrics.toolCallsByType['read'], 1);
  assertEquals(metrics.toolCallsByType['write'], 1);
});

Deno.test('getAggregatedMetrics calculates total cost', () => {
  let state = createMetricsState('test');

  // Add an iteration with known token counts for opus
  // Opus pricing: $15 input, $75 output per million tokens
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 100_000, // 0.1M * $15 = $1.5
    outputTokens: 10_000, // 0.01M * $75 = $0.75
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);

  // Total: $1.5 + $0.75 = $2.25
  assertEquals(metrics.totalCost > 2, true);
  assertEquals(metrics.totalCost < 2.5, true);
});

// ============================================================================
// formatAggregatedMetrics Tests
// ============================================================================

Deno.test('formatAggregatedMetrics returns array of formatted lines', () => {
  const metrics = getAggregatedMetrics(createMetricsState('test'));

  const lines = formatAggregatedMetrics(metrics);

  assertEquals(Array.isArray(lines), true);
  assertEquals(lines.length > 0, true);
});

Deno.test('formatAggregatedMetrics includes iteration count and success rate', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Iterations'), true);
  assertEquals(joined.includes('100.0%'), true);
});

Deno.test('formatAggregatedMetrics includes token counts', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 1500,
    outputTokens: 800,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Tokens'), true);
  assertEquals(joined.includes('in'), true);
  assertEquals(joined.includes('out'), true);
});

Deno.test('formatAggregatedMetrics includes cache stats when present', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 500,
    outputTokens: 200,
    cacheReadTokens: 300,
    cacheWriteTokens: 100,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Cache'), true);
  assertEquals(joined.includes('efficiency'), true);
});

Deno.test('formatAggregatedMetrics excludes cache stats when no cache usage', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 500,
    outputTokens: 200,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  // Should not include separate cache line
  assertEquals(joined.includes('Cache:'), false);
});

Deno.test('formatAggregatedMetrics includes duration', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 5000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Duration'), true);
  assertEquals(joined.includes('total'), true);
  assertEquals(joined.includes('avg'), true);
});

Deno.test('formatAggregatedMetrics includes cost', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 100_000,
    outputTokens: 50_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Cost'), true);
  assertEquals(joined.includes('$'), true);
});

Deno.test('formatAggregatedMetrics includes tool calls breakdown', () => {
  let state = createMetricsState('test');
  const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
  state = collectTokenUsage(state, usage, 'opus');

  state = collectToolCall(state, { iteration: 1, toolName: 'bash', duration: 100, success: true });
  state = collectToolCall(state, { iteration: 1, toolName: 'read', duration: 50, success: true });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Tool calls'), true);
  assertEquals(joined.includes('bash'), true);
});

Deno.test('formatAggregatedMetrics formats token counts with suffixes', () => {
  let state = createMetricsState('test');
  state = recordIteration(state, {
    iteration: 1,
    model: 'opus',
    inputTokens: 1_500_000, // 1.5M
    outputTokens: 800_000, // 800K
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    duration: 1000,
    toolCallCount: 0,
    success: true,
    timestamp: Date.now(),
  });

  const metrics = getAggregatedMetrics(state);
  const lines = formatAggregatedMetrics(metrics);
  const joined = lines.join('\n');

  // Should use K or M suffixes
  assertEquals(joined.includes('K') || joined.includes('M'), true);
});
