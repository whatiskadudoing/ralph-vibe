/**
 * @module tests/utils/formatting_test
 *
 * Tests for utils/formatting module.
 */

import { assertEquals } from '@std/assert';
import {
  formatBytes,
  formatDuration,
  formatPercentage,
  formatTokenCount,
} from '../../src/utils/formatting.ts';

// ============================================================================
// formatDuration tests
// ============================================================================

Deno.test('formatDuration returns milliseconds for values under 1000', () => {
  assertEquals(formatDuration(0), '0ms');
  assertEquals(formatDuration(1), '1ms');
  assertEquals(formatDuration(500), '500ms');
  assertEquals(formatDuration(999), '999ms');
});

Deno.test('formatDuration returns seconds with decimal for values under 60s', () => {
  assertEquals(formatDuration(1000), '1.0s');
  assertEquals(formatDuration(1500), '1.5s');
  assertEquals(formatDuration(30000), '30.0s');
  assertEquals(formatDuration(59999), '60.0s');
});

Deno.test('formatDuration returns minutes and seconds for values under 1 hour', () => {
  assertEquals(formatDuration(60000), '1m 0s');
  assertEquals(formatDuration(65000), '1m 5s');
  assertEquals(formatDuration(150000), '2m 30s');
  assertEquals(formatDuration(3599000), '59m 59s');
});

Deno.test('formatDuration returns hours, minutes, and seconds for large values', () => {
  assertEquals(formatDuration(3600000), '1h 0m 0s');
  assertEquals(formatDuration(3661000), '1h 1m 1s');
  assertEquals(formatDuration(7200000), '2h 0m 0s');
  assertEquals(formatDuration(4530000), '1h 15m 30s');
});

Deno.test('formatDuration handles negative values as zero', () => {
  assertEquals(formatDuration(-1), '0ms');
  assertEquals(formatDuration(-1000), '0ms');
});

Deno.test('formatDuration handles very large values', () => {
  // 100 hours
  assertEquals(formatDuration(360000000), '100h 0m 0s');
});

// ============================================================================
// formatTokenCount tests
// ============================================================================

Deno.test('formatTokenCount returns raw number for values under 1000', () => {
  assertEquals(formatTokenCount(0), '0');
  assertEquals(formatTokenCount(1), '1');
  assertEquals(formatTokenCount(500), '500');
  assertEquals(formatTokenCount(999), '999');
});

Deno.test('formatTokenCount returns K suffix for thousands', () => {
  assertEquals(formatTokenCount(1000), '1.0K');
  assertEquals(formatTokenCount(1500), '1.5K');
  assertEquals(formatTokenCount(10000), '10.0K');
  assertEquals(formatTokenCount(999999), '1000.0K');
});

Deno.test('formatTokenCount returns M suffix for millions', () => {
  assertEquals(formatTokenCount(1000000), '1.0M');
  assertEquals(formatTokenCount(2300000), '2.3M');
  assertEquals(formatTokenCount(10000000), '10.0M');
});

Deno.test('formatTokenCount handles negative values as zero', () => {
  assertEquals(formatTokenCount(-1), '0');
  assertEquals(formatTokenCount(-1000), '0');
});

Deno.test('formatTokenCount handles very large values', () => {
  assertEquals(formatTokenCount(1000000000), '1000.0M');
});

Deno.test('formatTokenCount rounds decimal tokens', () => {
  assertEquals(formatTokenCount(500.7), '501');
  assertEquals(formatTokenCount(1234.5), '1.2K');
});

// ============================================================================
// formatBytes tests
// ============================================================================

Deno.test('formatBytes returns bytes for values under 1024', () => {
  assertEquals(formatBytes(0), '0B');
  assertEquals(formatBytes(1), '1B');
  assertEquals(formatBytes(500), '500B');
  assertEquals(formatBytes(1023), '1023B');
});

Deno.test('formatBytes returns KB for kilobytes', () => {
  assertEquals(formatBytes(1024), '1.0KB');
  assertEquals(formatBytes(1536), '1.5KB');
  assertEquals(formatBytes(10240), '10.0KB');
});

Deno.test('formatBytes returns MB for megabytes', () => {
  assertEquals(formatBytes(1048576), '1.0MB');
  assertEquals(formatBytes(2359296), '2.3MB');
  assertEquals(formatBytes(10485760), '10.0MB');
});

Deno.test('formatBytes returns GB for gigabytes', () => {
  assertEquals(formatBytes(1073741824), '1.0GB');
  assertEquals(formatBytes(1288490189), '1.2GB');
});

Deno.test('formatBytes returns TB for terabytes', () => {
  assertEquals(formatBytes(1099511627776), '1.0TB');
});

Deno.test('formatBytes handles negative values as zero', () => {
  assertEquals(formatBytes(-1), '0B');
  assertEquals(formatBytes(-1024), '0B');
});

Deno.test('formatBytes handles very large values', () => {
  // Multiple terabytes
  assertEquals(formatBytes(5497558138880), '5.0TB');
});

// ============================================================================
// formatPercentage tests
// ============================================================================

Deno.test('formatPercentage formats decimal as percentage', () => {
  assertEquals(formatPercentage(0), '0.0%');
  assertEquals(formatPercentage(0.5), '50.0%');
  assertEquals(formatPercentage(1), '100.0%');
});

Deno.test('formatPercentage handles values greater than 1', () => {
  assertEquals(formatPercentage(1.5), '150.0%');
  assertEquals(formatPercentage(2), '200.0%');
});

Deno.test('formatPercentage handles negative values', () => {
  assertEquals(formatPercentage(-0.5), '-50.0%');
  assertEquals(formatPercentage(-1), '-100.0%');
});

Deno.test('formatPercentage respects decimal places parameter', () => {
  assertEquals(formatPercentage(0.1234, 0), '12%');
  assertEquals(formatPercentage(0.1234, 1), '12.3%');
  assertEquals(formatPercentage(0.1234, 2), '12.34%');
  assertEquals(formatPercentage(0.1234, 3), '12.340%');
});

Deno.test('formatPercentage handles infinity and NaN', () => {
  assertEquals(formatPercentage(Infinity), '0.0%');
  assertEquals(formatPercentage(-Infinity), '0.0%');
  assertEquals(formatPercentage(NaN), '0.0%');
});

Deno.test('formatPercentage handles small decimal values', () => {
  assertEquals(formatPercentage(0.001), '0.1%');
  assertEquals(formatPercentage(0.0001), '0.0%');
  assertEquals(formatPercentage(0.0001, 2), '0.01%');
});

// ============================================================================
// Edge cases and integration tests
// ============================================================================

Deno.test('all formatting functions are pure (same input gives same output)', () => {
  // Run multiple times to verify consistency
  for (let i = 0; i < 3; i++) {
    assertEquals(formatDuration(1500), '1.5s');
    assertEquals(formatTokenCount(1500), '1.5K');
    assertEquals(formatBytes(1536), '1.5KB');
    assertEquals(formatPercentage(0.5), '50.0%');
  }
});

Deno.test('formatting functions handle zero consistently', () => {
  assertEquals(formatDuration(0), '0ms');
  assertEquals(formatTokenCount(0), '0');
  assertEquals(formatBytes(0), '0B');
  assertEquals(formatPercentage(0), '0.0%');
});
