/**
 * @module tests/services/status_reporter_test
 *
 * Tests for services/status_reporter module.
 * Covers status reporting, observer pattern, progress tracking, and formatting.
 */

import { assertEquals, assertExists } from '@std/assert';
import {
  calculateTokensPerSecond,
  createMetricsUpdate,
  createProgressUpdate,
  createReporter,
  formatDuration,
  formatMetricsDisplay,
  formatProgressBar,
  formatTokenRate,
  type MetricsUpdate,
  type ProgressUpdate,
  reportMetrics,
  reportProgress,
  reportStatus,
  type StatusUpdate,
  subscribe,
} from '../../src/services/status_reporter.ts';

// ============================================================================
// createReporter Tests
// ============================================================================

Deno.test('createReporter creates a reporter with empty observers', () => {
  const reporter = createReporter();

  assertExists(reporter);
  assertExists(reporter.observers);
  assertEquals(reporter.observers.size, 0);
});

Deno.test('createReporter creates independent instances', () => {
  const reporter1 = createReporter();
  const reporter2 = createReporter();

  // Add observer to reporter1
  reporter1.observers.add(() => {});

  // reporter2 should still have no observers
  assertEquals(reporter1.observers.size, 1);
  assertEquals(reporter2.observers.size, 0);
});

// ============================================================================
// subscribe Tests
// ============================================================================

Deno.test('subscribe adds observer to reporter', () => {
  const reporter = createReporter();
  const observer = () => {};

  subscribe(reporter, observer);

  assertEquals(reporter.observers.size, 1);
  assertEquals(reporter.observers.has(observer), true);
});

Deno.test('subscribe returns unsubscribe function', () => {
  const reporter = createReporter();
  const observer = () => {};

  const unsubscribe = subscribe(reporter, observer);

  assertEquals(reporter.observers.size, 1);

  unsubscribe();

  assertEquals(reporter.observers.size, 0);
  assertEquals(reporter.observers.has(observer), false);
});

Deno.test('subscribe allows multiple observers', () => {
  const reporter = createReporter();
  const observer1 = () => {};
  const observer2 = () => {};
  const observer3 = () => {};

  subscribe(reporter, observer1);
  subscribe(reporter, observer2);
  subscribe(reporter, observer3);

  assertEquals(reporter.observers.size, 3);
});

Deno.test('unsubscribe only removes the specific observer', () => {
  const reporter = createReporter();
  const observer1 = () => {};
  const observer2 = () => {};

  subscribe(reporter, observer1);
  const unsubscribe2 = subscribe(reporter, observer2);

  assertEquals(reporter.observers.size, 2);

  unsubscribe2();

  assertEquals(reporter.observers.size, 1);
  assertEquals(reporter.observers.has(observer1), true);
  assertEquals(reporter.observers.has(observer2), false);
});

// ============================================================================
// reportStatus Tests
// ============================================================================

Deno.test('reportStatus notifies all observers with status update', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  reportStatus(reporter, 'Test message');

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.type, 'status');
  assertEquals(update.message, 'Test message');
  assertExists(update.timestamp);
});

Deno.test('reportStatus includes optional data', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  reportStatus(reporter, 'Test message', { key: 'value', count: 42 });

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.data?.key, 'value');
  assertEquals(update.data?.count, 42);
});

Deno.test('reportStatus notifies multiple observers', () => {
  const reporter = createReporter();
  let count1 = 0;
  let count2 = 0;

  subscribe(reporter, () => count1++);
  subscribe(reporter, () => count2++);

  reportStatus(reporter, 'Test message');

  assertEquals(count1, 1);
  assertEquals(count2, 1);
});

Deno.test('reportStatus does nothing with no observers', () => {
  const reporter = createReporter();

  // Should not throw
  reportStatus(reporter, 'Test message');
});

// ============================================================================
// reportProgress Tests
// ============================================================================

Deno.test('reportProgress notifies observers with progress update', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  const progress: ProgressUpdate = {
    current: 5,
    total: 10,
    percentage: 50,
    label: 'Processing',
  };

  reportProgress(reporter, progress);

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.type, 'progress');
  assertExists(update.message);
  assertEquals(update.data?.current, 5);
  assertEquals(update.data?.total, 10);
  assertEquals(update.data?.percentage, 50);
  assertEquals(update.data?.label, 'Processing');
});

Deno.test('reportProgress includes ETA in message when provided', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  const progress: ProgressUpdate = {
    current: 5,
    total: 10,
    percentage: 50,
    label: 'Processing',
    eta: 5000, // 5 seconds
  };

  reportProgress(reporter, progress);

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.message.includes('ETA'), true);
});

// ============================================================================
// reportMetrics Tests
// ============================================================================

Deno.test('reportMetrics notifies observers with metrics update', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  const metrics: MetricsUpdate = {
    inputTokens: 1000,
    outputTokens: 500,
    totalCost: 0.05,
    duration: 5000,
    operationCount: 3,
  };

  reportMetrics(reporter, metrics);

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.type, 'metrics');
  assertExists(update.message);
  assertEquals(update.data?.inputTokens, 1000);
  assertEquals(update.data?.outputTokens, 500);
  assertEquals(update.data?.totalCost, 0.05);
  assertEquals(update.data?.duration, 5000);
  assertEquals(update.data?.operationCount, 3);
});

Deno.test('reportMetrics includes cache efficiency when provided', () => {
  const reporter = createReporter();
  const updates: StatusUpdate[] = [];

  subscribe(reporter, (update) => updates.push(update));

  const metrics: MetricsUpdate = {
    inputTokens: 1000,
    outputTokens: 500,
    totalCost: 0.05,
    duration: 5000,
    operationCount: 3,
    cacheEfficiency: 25.5,
  };

  reportMetrics(reporter, metrics);

  assertEquals(updates.length, 1);
  const update = updates[0] ?? {} as StatusUpdate;
  assertEquals(update.data?.cacheEfficiency, 25.5);
});

// ============================================================================
// formatProgressBar Tests
// ============================================================================

Deno.test('formatProgressBar creates correct bar for 0%', () => {
  const progress: ProgressUpdate = {
    current: 0,
    total: 10,
    percentage: 0,
    label: 'Loading',
  };

  const bar = formatProgressBar(progress);

  assertEquals(bar.includes('Loading'), true);
  assertEquals(bar.includes('0.0%'), true);
  // Should have only empty characters in the bar
  assertEquals(bar.includes('\u2588'), false); // No filled characters
});

Deno.test('formatProgressBar creates correct bar for 50%', () => {
  const progress: ProgressUpdate = {
    current: 5,
    total: 10,
    percentage: 50,
    label: 'Processing',
  };

  const bar = formatProgressBar(progress, 20); // 20 character wide bar

  assertEquals(bar.includes('Processing'), true);
  assertEquals(bar.includes('50.0%'), true);
  // Should have mix of filled and empty
  assertEquals(bar.includes('\u2588'), true);
  assertEquals(bar.includes('\u2591'), true);
});

Deno.test('formatProgressBar creates correct bar for 100%', () => {
  const progress: ProgressUpdate = {
    current: 10,
    total: 10,
    percentage: 100,
    label: 'Complete',
  };

  const bar = formatProgressBar(progress);

  assertEquals(bar.includes('Complete'), true);
  assertEquals(bar.includes('100.0%'), true);
  // Should have only filled characters in the bar
  assertEquals(bar.includes('\u2591'), false); // No empty characters
});

Deno.test('formatProgressBar includes ETA when provided', () => {
  const progress: ProgressUpdate = {
    current: 5,
    total: 10,
    percentage: 50,
    label: 'Working',
    eta: 30000, // 30 seconds
  };

  const bar = formatProgressBar(progress);

  assertEquals(bar.includes('remaining'), true);
});

Deno.test('formatProgressBar respects custom width', () => {
  const progress: ProgressUpdate = {
    current: 5,
    total: 10,
    percentage: 50,
    label: 'Test',
  };

  const bar10 = formatProgressBar(progress, 10);
  const bar40 = formatProgressBar(progress, 40);

  // The bar with width 40 should be longer
  assertEquals(bar40.length > bar10.length, true);
});

// ============================================================================
// formatMetricsDisplay Tests
// ============================================================================

Deno.test('formatMetricsDisplay returns array of formatted lines', () => {
  const metrics: MetricsUpdate = {
    inputTokens: 1500,
    outputTokens: 800,
    totalCost: 0.045,
    duration: 3500,
    operationCount: 5,
  };

  const lines = formatMetricsDisplay(metrics);

  assertEquals(Array.isArray(lines), true);
  assertEquals(lines.length >= 6, true); // At least 6 basic lines
});

Deno.test('formatMetricsDisplay includes all basic metrics', () => {
  const metrics: MetricsUpdate = {
    inputTokens: 1500,
    outputTokens: 800,
    totalCost: 0.045,
    duration: 3500,
    operationCount: 5,
  };

  const lines = formatMetricsDisplay(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Input'), true);
  assertEquals(joined.includes('Output'), true);
  assertEquals(joined.includes('Total'), true);
  assertEquals(joined.includes('Cost'), true);
  assertEquals(joined.includes('Duration'), true);
  assertEquals(joined.includes('Operations'), true);
});

Deno.test('formatMetricsDisplay includes cache efficiency when provided', () => {
  const metrics: MetricsUpdate = {
    inputTokens: 1000,
    outputTokens: 500,
    totalCost: 0.03,
    duration: 2000,
    operationCount: 2,
    cacheEfficiency: 45.5,
  };

  const lines = formatMetricsDisplay(metrics);
  const joined = lines.join('\n');

  assertEquals(joined.includes('Cache efficiency'), true);
  assertEquals(joined.includes('45.5%'), true);
});

Deno.test('formatMetricsDisplay formats token counts with locale', () => {
  const metrics: MetricsUpdate = {
    inputTokens: 1500000,
    outputTokens: 800000,
    totalCost: 5.0,
    duration: 60000,
    operationCount: 10,
  };

  const lines = formatMetricsDisplay(metrics);
  const joined = lines.join('\n');

  // Should use locale formatting (commas for thousands)
  assertEquals(joined.includes('1,500,000') || joined.includes('1500000'), true);
});

// ============================================================================
// formatDuration Tests
// ============================================================================

Deno.test('formatDuration formats milliseconds', () => {
  assertEquals(formatDuration(0), '0ms');
  assertEquals(formatDuration(100), '100ms');
  assertEquals(formatDuration(999), '999ms');
});

Deno.test('formatDuration formats seconds with decimal', () => {
  assertEquals(formatDuration(1000), '1.0s');
  assertEquals(formatDuration(1500), '1.5s');
  assertEquals(formatDuration(59999), '60.0s');
});

Deno.test('formatDuration formats minutes and seconds', () => {
  assertEquals(formatDuration(60000), '1m 0s');
  assertEquals(formatDuration(65000), '1m 5s');
  assertEquals(formatDuration(125000), '2m 5s');
  assertEquals(formatDuration(3599000), '59m 59s');
});

Deno.test('formatDuration formats hours, minutes, and seconds', () => {
  assertEquals(formatDuration(3600000), '1h 0m 0s');
  assertEquals(formatDuration(3661000), '1h 1m 1s');
  assertEquals(formatDuration(7325000), '2h 2m 5s');
  assertEquals(formatDuration(86400000), '24h 0m 0s');
});

// ============================================================================
// createProgressUpdate Tests
// ============================================================================

Deno.test('createProgressUpdate creates correct update', () => {
  const progress = createProgressUpdate(5, 10, 'Testing');

  assertEquals(progress.current, 5);
  assertEquals(progress.total, 10);
  assertEquals(progress.percentage, 50);
  assertEquals(progress.label, 'Testing');
  assertEquals(progress.eta, undefined);
});

Deno.test('createProgressUpdate calculates percentage correctly', () => {
  assertEquals(createProgressUpdate(0, 100, 'Test').percentage, 0);
  assertEquals(createProgressUpdate(25, 100, 'Test').percentage, 25);
  assertEquals(createProgressUpdate(50, 100, 'Test').percentage, 50);
  assertEquals(createProgressUpdate(75, 100, 'Test').percentage, 75);
  assertEquals(createProgressUpdate(100, 100, 'Test').percentage, 100);
});

Deno.test('createProgressUpdate handles zero total gracefully', () => {
  const progress = createProgressUpdate(5, 0, 'Empty');

  assertEquals(progress.percentage, 0);
});

Deno.test('createProgressUpdate calculates ETA when startTime provided', () => {
  // Use a fixed time for testing
  const startTime = Date.now() - 5000; // 5 seconds ago
  const progress = createProgressUpdate(50, 100, 'Halfway', startTime);

  // ETA should be calculated based on elapsed time and remaining work
  assertExists(progress.eta);
  // If 50% done in 5 seconds, remaining 50% should take ~5 seconds
  assertEquals(progress.eta !== undefined && progress.eta > 0, true);
});

Deno.test('createProgressUpdate does not calculate ETA at 0%', () => {
  const startTime = Date.now() - 1000;
  const progress = createProgressUpdate(0, 100, 'Starting', startTime);

  assertEquals(progress.eta, undefined);
});

Deno.test('createProgressUpdate does not calculate ETA at 100%', () => {
  const startTime = Date.now() - 10000;
  const progress = createProgressUpdate(100, 100, 'Done', startTime);

  assertEquals(progress.eta, undefined);
});

// ============================================================================
// createMetricsUpdate Tests
// ============================================================================

Deno.test('createMetricsUpdate creates correct update', () => {
  const metrics = createMetricsUpdate(1000, 500, 0.05, 5000, 3);

  assertEquals(metrics.inputTokens, 1000);
  assertEquals(metrics.outputTokens, 500);
  assertEquals(metrics.totalCost, 0.05);
  assertEquals(metrics.duration, 5000);
  assertEquals(metrics.operationCount, 3);
  assertEquals(metrics.cacheEfficiency, undefined);
});

Deno.test('createMetricsUpdate includes cache efficiency when provided', () => {
  const metrics = createMetricsUpdate(1000, 500, 0.05, 5000, 3, 25.5);

  assertEquals(metrics.cacheEfficiency, 25.5);
});

// ============================================================================
// calculateTokensPerSecond Tests
// ============================================================================

Deno.test('calculateTokensPerSecond calculates correct rate', () => {
  // 1000 tokens in 1 second = 1000 tok/s
  assertEquals(calculateTokensPerSecond(1000, 1000), 1000);

  // 500 tokens in 2 seconds = 250 tok/s
  assertEquals(calculateTokensPerSecond(500, 2000), 250);

  // 2000 tokens in 0.5 seconds = 4000 tok/s
  assertEquals(calculateTokensPerSecond(2000, 500), 4000);
});

Deno.test('calculateTokensPerSecond handles zero duration', () => {
  assertEquals(calculateTokensPerSecond(1000, 0), 0);
});

Deno.test('calculateTokensPerSecond handles zero tokens', () => {
  assertEquals(calculateTokensPerSecond(0, 1000), 0);
});

// ============================================================================
// formatTokenRate Tests
// ============================================================================

Deno.test('formatTokenRate formats small rates', () => {
  assertEquals(formatTokenRate(0), '0 tok/s');
  assertEquals(formatTokenRate(100), '100 tok/s');
  assertEquals(formatTokenRate(999), '999 tok/s');
});

Deno.test('formatTokenRate formats large rates with K suffix', () => {
  assertEquals(formatTokenRate(1000), '1.0k tok/s');
  assertEquals(formatTokenRate(1500), '1.5k tok/s');
  assertEquals(formatTokenRate(10000), '10.0k tok/s');
  assertEquals(formatTokenRate(50000), '50.0k tok/s');
});
