/**
 * @module tests/services/session_tracker_test
 *
 * Tests for services/session_tracker module.
 * Covers session tracking, statistics aggregation, and formatting utilities.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import {
  createSession,
  formatSessionSummary,
  formatSessionSummaryFromState,
  formatTokens,
  getStats,
  type IterationStats,
  recordIteration,
  SessionTracker,
  updateLastIteration,
} from '../../src/services/session_tracker.ts';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock iteration stats object for testing.
 */
function createIterationStats(
  overrides: Partial<IterationStats> = {},
): Omit<IterationStats, 'timestamp'> {
  return {
    iteration: 1,
    task: 'Test task',
    model: 'opus',
    durationSec: 60,
    operations: 5,
    inputTokens: 1000,
    outputTokens: 500,
    success: true,
    ...overrides,
  };
}

// ============================================================================
// SessionTracker Constructor Tests
// ============================================================================

Deno.test('SessionTracker initializes with correct data', () => {
  const tracker = new SessionTracker(false, 3);
  const data = tracker.getData();

  assertEquals(data.sessionId.length, 8);
  assertEquals(data.forking, false);
  assertEquals(data.specsCount, 3);
  assertEquals(data.iterations.length, 0);
  assertEquals(typeof data.startTime, 'string');
  assertEquals(typeof data.projectPath, 'string');
});

Deno.test('SessionTracker generates unique session IDs', () => {
  const tracker1 = new SessionTracker(true, 1);
  const tracker2 = new SessionTracker(true, 1);

  const id1 = tracker1.getData().sessionId;
  const id2 = tracker2.getData().sessionId;

  // Should be different (extremely unlikely to be same)
  assertEquals(id1 !== id2, true);
});

Deno.test('SessionTracker stores forking flag correctly', () => {
  const forkingTracker = new SessionTracker(true, 0);
  const nonForkingTracker = new SessionTracker(false, 0);

  assertEquals(forkingTracker.isForking(), true);
  assertEquals(nonForkingTracker.isForking(), false);
});

Deno.test('SessionTracker creates file path in temp directory', () => {
  const tracker = new SessionTracker(false, 0);
  const filePath = tracker.getFilePath();

  // Should be in temp directory
  const tmpDir = Deno.env.get('TMPDIR') ?? '/tmp';
  assertStringIncludes(filePath, tmpDir);
  assertStringIncludes(filePath, 'ralph-session-');
  assertStringIncludes(filePath, '.json');
});

// ============================================================================
// SessionTracker.recordIteration Tests
// ============================================================================

Deno.test('SessionTracker.recordIteration adds iteration to data', async () => {
  const tracker = new SessionTracker(false, 1);
  const stats = createIterationStats({ iteration: 1 });

  await tracker.recordIteration(stats);

  const data = tracker.getData();
  assertEquals(data.iterations.length, 1);
  const firstIter = data.iterations[0];
  assertEquals(firstIter?.iteration, 1);
  assertEquals(firstIter?.task, 'Test task');
  assertEquals(typeof firstIter?.timestamp, 'string');
});

Deno.test('SessionTracker.recordIteration adds timestamp automatically', async () => {
  const tracker = new SessionTracker(false, 1);
  const stats = createIterationStats();

  const before = new Date().toISOString();
  await tracker.recordIteration(stats);
  const after = new Date().toISOString();

  const data = tracker.getData();
  const firstIter = data.iterations[0];
  const timestamp = firstIter?.timestamp ?? '';

  // Timestamp should be between before and after
  assertEquals(timestamp >= before, true);
  assertEquals(timestamp <= after, true);
});

Deno.test('SessionTracker.recordIteration handles multiple iterations', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ iteration: 1, model: 'opus' }));
  await tracker.recordIteration(createIterationStats({ iteration: 2, model: 'sonnet' }));
  await tracker.recordIteration(createIterationStats({ iteration: 3, model: 'opus' }));

  const data = tracker.getData();
  assertEquals(data.iterations.length, 3);
  assertEquals(data.iterations[0]?.iteration, 1);
  assertEquals(data.iterations[1]?.iteration, 2);
  assertEquals(data.iterations[2]?.iteration, 3);
});

// ============================================================================
// SessionTracker.getAggregateStats Tests
// ============================================================================

Deno.test('getAggregateStats returns zeros for empty session', () => {
  const tracker = new SessionTracker(false, 0);
  const stats = tracker.getAggregateStats();

  assertEquals(stats.totalIterations, 0);
  assertEquals(stats.totalOperations, 0);
  assertEquals(stats.totalDurationSec, 0);
  assertEquals(stats.totalInputTokens, 0);
  assertEquals(stats.totalOutputTokens, 0);
  assertEquals(stats.totalCacheReadTokens, 0);
  assertEquals(stats.totalCacheWriteTokens, 0);
  assertEquals(stats.successfulIterations, 0);
  assertEquals(stats.failedIterations, 0);
  assertEquals(stats.tokensSavedByCache, 0);
  assertEquals(stats.modelBreakdown.opus, 0);
  assertEquals(stats.modelBreakdown.sonnet, 0);
});

Deno.test('getAggregateStats sums basic metrics correctly', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(
    createIterationStats({
      iteration: 1,
      durationSec: 30,
      operations: 5,
      inputTokens: 1000,
      outputTokens: 500,
    }),
  );
  await tracker.recordIteration(
    createIterationStats({
      iteration: 2,
      durationSec: 45,
      operations: 3,
      inputTokens: 2000,
      outputTokens: 800,
    }),
  );

  const stats = tracker.getAggregateStats();

  assertEquals(stats.totalIterations, 2);
  assertEquals(stats.totalDurationSec, 75);
  assertEquals(stats.totalOperations, 8);
  assertEquals(stats.totalInputTokens, 3000);
  assertEquals(stats.totalOutputTokens, 1300);
});

Deno.test('getAggregateStats sums cache tokens correctly', async () => {
  const tracker = new SessionTracker(true, 1);

  await tracker.recordIteration(
    createIterationStats({
      cacheReadTokens: 500,
      cacheWriteTokens: 200,
    }),
  );
  await tracker.recordIteration(
    createIterationStats({
      cacheReadTokens: 300,
      cacheWriteTokens: 100,
    }),
  );

  const stats = tracker.getAggregateStats();

  assertEquals(stats.totalCacheReadTokens, 800);
  assertEquals(stats.totalCacheWriteTokens, 300);
});

Deno.test('getAggregateStats calculates tokens saved by cache', async () => {
  const tracker = new SessionTracker(true, 1);

  await tracker.recordIteration(
    createIterationStats({ cacheReadTokens: 1000 }),
  );

  const stats = tracker.getAggregateStats();

  // tokensSavedByCache = cacheReadTokens * 0.9
  assertEquals(stats.tokensSavedByCache, 900);
});

Deno.test('getAggregateStats tracks success/failure counts', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ success: true }));
  await tracker.recordIteration(createIterationStats({ success: true }));
  await tracker.recordIteration(createIterationStats({ success: false }));

  const stats = tracker.getAggregateStats();

  assertEquals(stats.successfulIterations, 2);
  assertEquals(stats.failedIterations, 1);
});

Deno.test('getAggregateStats tracks model breakdown', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ model: 'opus' }));
  await tracker.recordIteration(createIterationStats({ model: 'opus' }));
  await tracker.recordIteration(createIterationStats({ model: 'sonnet' }));

  const stats = tracker.getAggregateStats();

  assertEquals(stats.modelBreakdown.opus, 2);
  assertEquals(stats.modelBreakdown.sonnet, 1);
});

Deno.test('getAggregateStats handles missing cache tokens', async () => {
  const tracker = new SessionTracker(false, 1);

  // Stats without cache tokens
  await tracker.recordIteration(
    createIterationStats({ iteration: 1 }),
  );

  const stats = tracker.getAggregateStats();

  assertEquals(stats.totalCacheReadTokens, 0);
  assertEquals(stats.totalCacheWriteTokens, 0);
});

// ============================================================================
// formatTokens Tests
// ============================================================================

Deno.test('formatTokens formats small numbers as-is', () => {
  assertEquals(formatTokens(0), '0');
  assertEquals(formatTokens(1), '1');
  assertEquals(formatTokens(999), '999');
});

Deno.test('formatTokens formats thousands with K suffix', () => {
  assertEquals(formatTokens(1000), '1.0K');
  assertEquals(formatTokens(1500), '1.5K');
  assertEquals(formatTokens(10000), '10.0K');
  assertEquals(formatTokens(999999), '1000.0K');
});

Deno.test('formatTokens formats millions with M suffix', () => {
  assertEquals(formatTokens(1000000), '1.0M');
  assertEquals(formatTokens(1500000), '1.5M');
  assertEquals(formatTokens(10000000), '10.0M');
});

Deno.test('formatTokens handles boundary values', () => {
  assertEquals(formatTokens(999), '999');
  assertEquals(formatTokens(1000), '1.0K');
  assertEquals(formatTokens(999999), '1000.0K');
  assertEquals(formatTokens(1000000), '1.0M');
});

// ============================================================================
// formatSessionSummary Tests
// ============================================================================

Deno.test('formatSessionSummary includes basic stats', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(
    createIterationStats({
      durationSec: 120,
      operations: 10,
      inputTokens: 5000,
      outputTokens: 2000,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // First line: iterations, ops, duration
  const firstLine = lines[0] ?? '';
  assertStringIncludes(firstLine, '1 iterations');
  assertStringIncludes(firstLine, '10 ops');
  assertStringIncludes(firstLine, '2m 0s');
});

Deno.test('formatSessionSummary includes token counts', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(
    createIterationStats({
      inputTokens: 5000,
      outputTokens: 2000,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // Second line: token counts
  const secondLine = lines[1] ?? '';
  assertStringIncludes(secondLine, '7.0K tokens');
  assertStringIncludes(secondLine, '5.0K in');
  assertStringIncludes(secondLine, '2.0K out');
});

Deno.test('formatSessionSummary includes model breakdown', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ model: 'opus' }));
  await tracker.recordIteration(createIterationStats({ model: 'sonnet' }));

  const lines = formatSessionSummary(tracker);

  // Should have model breakdown line
  const modelLine = lines.find((l) => l.includes('Models:'));
  assertEquals(modelLine !== undefined, true);
  if (modelLine) {
    assertStringIncludes(modelLine, 'opus: 1');
    assertStringIncludes(modelLine, 'sonnet: 1');
  }
});

Deno.test('formatSessionSummary includes cache stats when forking', async () => {
  const tracker = new SessionTracker(true, 1);

  await tracker.recordIteration(
    createIterationStats({
      cacheReadTokens: 10000,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // Should have cache line when forking is enabled
  const cacheLine = lines.find((l) => l.includes('Cache:'));
  assertEquals(cacheLine !== undefined, true);
  if (cacheLine) {
    assertStringIncludes(cacheLine, '10.0K read');
    assertStringIncludes(cacheLine, 'saved');
  }
});

Deno.test('formatSessionSummary excludes cache stats when not forking', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(
    createIterationStats({
      cacheReadTokens: 10000,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // Should NOT have cache line when forking is disabled
  const cacheLine = lines.find((l) => l.includes('Cache:'));
  assertEquals(cacheLine, undefined);
});

Deno.test('formatSessionSummary excludes cache stats when no cache reads', async () => {
  const tracker = new SessionTracker(true, 1);

  await tracker.recordIteration(
    createIterationStats({
      cacheReadTokens: 0,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // Should NOT have cache line when no cache reads
  const cacheLine = lines.find((l) => l.includes('Cache:'));
  assertEquals(cacheLine, undefined);
});

Deno.test('formatSessionSummary handles opus-only sessions', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ model: 'opus' }));
  await tracker.recordIteration(createIterationStats({ model: 'opus' }));

  const lines = formatSessionSummary(tracker);
  const modelLine = lines.find((l) => l.includes('Models:'));

  assertEquals(modelLine !== undefined, true);
  if (modelLine) {
    assertStringIncludes(modelLine, 'opus: 2');
    assertEquals(modelLine.includes('sonnet'), false);
  }
});

Deno.test('formatSessionSummary handles sonnet-only sessions', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(createIterationStats({ model: 'sonnet' }));

  const lines = formatSessionSummary(tracker);
  const modelLine = lines.find((l) => l.includes('Models:'));

  assertEquals(modelLine !== undefined, true);
  if (modelLine) {
    assertStringIncludes(modelLine, 'sonnet: 1');
    assertEquals(modelLine.includes('opus'), false);
  }
});

// ============================================================================
// Duration Formatting Tests (via formatSessionSummary)
// ============================================================================

Deno.test('formatSessionSummary formats seconds correctly', async () => {
  const tracker = new SessionTracker(false, 1);
  await tracker.recordIteration(createIterationStats({ durationSec: 45 }));

  const lines = formatSessionSummary(tracker);
  // formatDuration now shows decimals for seconds under a minute (e.g., "45.0s")
  assertStringIncludes(lines[0] ?? '', '45.0s');
});

Deno.test('formatSessionSummary formats minutes and seconds correctly', async () => {
  const tracker = new SessionTracker(false, 1);
  await tracker.recordIteration(createIterationStats({ durationSec: 125 }));

  const lines = formatSessionSummary(tracker);
  assertStringIncludes(lines[0] ?? '', '2m 5s');
});

Deno.test('formatSessionSummary formats hours correctly', async () => {
  const tracker = new SessionTracker(false, 1);
  // 1 hour, 30 minutes = 5400 seconds
  await tracker.recordIteration(createIterationStats({ durationSec: 5400 }));

  const lines = formatSessionSummary(tracker);
  assertStringIncludes(lines[0] ?? '', '1h 30m');
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('SessionTracker handles zero tokens', async () => {
  const tracker = new SessionTracker(false, 0);

  await tracker.recordIteration(
    createIterationStats({
      inputTokens: 0,
      outputTokens: 0,
    }),
  );

  const lines = formatSessionSummary(tracker);

  // Should not include token line when no tokens
  const tokenLine = lines.find((l) => l.includes('tokens'));
  assertEquals(tokenLine, undefined);

  // Should still include basic stats and model breakdown
  assertEquals(lines.length >= 1, true);
  assertStringIncludes(lines[0] ?? '', '1 iterations');
});

Deno.test('SessionTracker getData returns immutable-like data', () => {
  const tracker = new SessionTracker(false, 1);
  const data1 = tracker.getData();
  const data2 = tracker.getData();

  // Should be same values
  assertEquals(data1.sessionId, data2.sessionId);
  assertEquals(data1.forking, data2.forking);
});

Deno.test('SessionTracker handles large token counts', async () => {
  const tracker = new SessionTracker(false, 1);

  await tracker.recordIteration(
    createIterationStats({
      inputTokens: 10_000_000,
      outputTokens: 5_000_000,
      cacheReadTokens: 20_000_000,
    }),
  );

  const stats = tracker.getAggregateStats();

  assertEquals(stats.totalInputTokens, 10_000_000);
  assertEquals(stats.totalOutputTokens, 5_000_000);
  assertEquals(stats.totalCacheReadTokens, 20_000_000);
});

// ============================================================================
// Functional API Tests
// ============================================================================

Deno.test('createSession creates initial state with correct defaults', () => {
  const state = createSession({ forking: true, specsCount: 5 });

  assertEquals(state.sessionId.length, 8);
  assertEquals(state.forking, true);
  assertEquals(state.specsCount, 5);
  assertEquals(state.iterations.length, 0);
  assertEquals(typeof state.startTime, 'string');
  assertEquals(typeof state.projectPath, 'string');
  assertEquals(typeof state.filePath, 'string');
  assertStringIncludes(state.filePath, 'ralph-session-');
});

Deno.test('createSession uses provided sessionId', () => {
  const state = createSession({
    forking: false,
    specsCount: 1,
    sessionId: 'custom-id',
  });

  assertEquals(state.sessionId, 'custom-id');
});

Deno.test('recordIteration returns new state with iteration added', () => {
  const initial = createSession({ forking: false, specsCount: 1 });

  const stats = {
    iteration: 1,
    task: 'Test',
    model: 'opus' as const,
    durationSec: 30,
    operations: 5,
    inputTokens: 1000,
    outputTokens: 500,
    success: true,
  };

  const updated = recordIteration(initial, stats);

  // Original state unchanged (immutability)
  assertEquals(initial.iterations.length, 0);

  // New state has the iteration
  assertEquals(updated.iterations.length, 1);
  assertEquals(updated.iterations[0]?.iteration, 1);
  assertEquals(updated.iterations[0]?.task, 'Test');
  assertEquals(typeof updated.iterations[0]?.timestamp, 'string');
});

Deno.test('recordIteration preserves other state properties', () => {
  const initial = createSession({ forking: true, specsCount: 3 });

  const stats = {
    iteration: 1,
    task: 'Test',
    model: 'sonnet' as const,
    durationSec: 60,
    operations: 10,
    inputTokens: 2000,
    outputTokens: 1000,
    success: true,
  };

  const updated = recordIteration(initial, stats);

  assertEquals(updated.sessionId, initial.sessionId);
  assertEquals(updated.startTime, initial.startTime);
  assertEquals(updated.projectPath, initial.projectPath);
  assertEquals(updated.forking, initial.forking);
  assertEquals(updated.specsCount, initial.specsCount);
  assertEquals(updated.filePath, initial.filePath);
});

Deno.test('updateLastIteration updates the last iteration', () => {
  let state = createSession({ forking: false, specsCount: 1 });

  state = recordIteration(state, {
    iteration: 1,
    task: 'Test',
    model: 'opus',
    durationSec: 30,
    operations: 5,
    inputTokens: 1000,
    outputTokens: 500,
    success: true,
  });

  const updated = updateLastIteration(state, { success: false, operations: 10 });

  // Original state unchanged
  assertEquals(state.iterations[0]?.success, true);
  assertEquals(state.iterations[0]?.operations, 5);

  // Updated state has new values
  assertEquals(updated.iterations[0]?.success, false);
  assertEquals(updated.iterations[0]?.operations, 10);
});

Deno.test('updateLastIteration returns unchanged state when empty', () => {
  const state = createSession({ forking: false, specsCount: 1 });
  const updated = updateLastIteration(state, { success: false });

  assertEquals(state, updated);
});

Deno.test('getStats calculates aggregate statistics correctly', () => {
  let state = createSession({ forking: true, specsCount: 2 });

  state = recordIteration(state, {
    iteration: 1,
    task: 'Task 1',
    model: 'opus',
    durationSec: 30,
    operations: 5,
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    success: true,
  });

  state = recordIteration(state, {
    iteration: 2,
    task: 'Task 2',
    model: 'sonnet',
    durationSec: 45,
    operations: 8,
    inputTokens: 2000,
    outputTokens: 1000,
    cacheReadTokens: 300,
    success: false,
  });

  const stats = getStats(state);

  assertEquals(stats.totalIterations, 2);
  assertEquals(stats.totalOperations, 13);
  assertEquals(stats.totalDurationSec, 75);
  assertEquals(stats.totalInputTokens, 3000);
  assertEquals(stats.totalOutputTokens, 1500);
  assertEquals(stats.totalCacheReadTokens, 500);
  assertEquals(stats.successfulIterations, 1);
  assertEquals(stats.failedIterations, 1);
  assertEquals(stats.modelBreakdown.opus, 1);
  assertEquals(stats.modelBreakdown.sonnet, 1);
  assertEquals(stats.averageDurationSec, 37.5);
  assertEquals(stats.successRate, 50);
});

Deno.test('getStats returns zeros for empty state', () => {
  const state = createSession({ forking: false, specsCount: 0 });
  const stats = getStats(state);

  assertEquals(stats.totalIterations, 0);
  assertEquals(stats.totalCost, 0);
  assertEquals(stats.cacheEfficiency, 0);
  assertEquals(stats.averageDurationSec, 0);
  assertEquals(stats.successRate, 0);
});

Deno.test('getStats calculates cost from cost_calculator', () => {
  let state = createSession({ forking: false, specsCount: 1 });

  state = recordIteration(state, {
    iteration: 1,
    task: 'Test',
    model: 'opus',
    durationSec: 60,
    operations: 5,
    inputTokens: 1_000_000,
    outputTokens: 500_000,
    success: true,
  });

  const stats = getStats(state);

  // Opus pricing: $15/M input, $75/M output
  // Cost = 1M * 15/1M + 0.5M * 75/1M = 15 + 37.5 = 52.5
  assertEquals(stats.totalCost, 52.5);
});

Deno.test('getStats aggregates tool call breakdown', () => {
  let state = createSession({ forking: false, specsCount: 1 });

  state = recordIteration(state, {
    iteration: 1,
    task: 'Test',
    model: 'opus',
    durationSec: 60,
    operations: 5,
    inputTokens: 1000,
    outputTokens: 500,
    success: true,
    toolCalls: ['read', 'write', 'read', 'bash'],
  });

  state = recordIteration(state, {
    iteration: 2,
    task: 'Test 2',
    model: 'sonnet',
    durationSec: 30,
    operations: 3,
    inputTokens: 500,
    outputTokens: 250,
    success: true,
    toolCalls: ['read', 'bash'],
  });

  const stats = getStats(state);

  assertEquals(stats.toolCallBreakdown['read'], 3);
  assertEquals(stats.toolCallBreakdown['write'], 1);
  assertEquals(stats.toolCallBreakdown['bash'], 2);
});

Deno.test('formatSessionSummary works with SessionState directly', () => {
  let state = createSession({ forking: false, specsCount: 1 });

  state = recordIteration(state, {
    iteration: 1,
    task: 'Test',
    model: 'opus',
    durationSec: 120,
    operations: 10,
    inputTokens: 5000,
    outputTokens: 2000,
    success: true,
  });

  const lines = formatSessionSummaryFromState(state);

  assertStringIncludes(lines[0] ?? '', '1 iterations');
  assertStringIncludes(lines[0] ?? '', '10 ops');
  assertStringIncludes(lines[0] ?? '', '2m 0s');
});

Deno.test('formatSessionSummary accepts both class and state', () => {
  const tracker = new SessionTracker(false, 1);
  const state = createSession({ forking: false, specsCount: 1 });

  // Both should work with formatSessionSummary
  const classLines = formatSessionSummary(tracker);
  const stateLines = formatSessionSummary(state);

  // Both should return arrays
  assertEquals(Array.isArray(classLines), true);
  assertEquals(Array.isArray(stateLines), true);
});
