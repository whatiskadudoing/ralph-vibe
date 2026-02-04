/**
 * @module tests/services/cost_calculator_test
 *
 * Tests for services/cost_calculator module.
 * Covers token cost calculation, formatting, and cache efficiency metrics.
 */

import { assertAlmostEquals, assertEquals } from '@std/assert';
import {
  calculateCacheEfficiency,
  calculateCacheSavings,
  calculateCost,
  calculateCostBreakdown,
  estimateCost,
  formatCost,
  formatCostBreakdown,
  formatCostWithDelta,
  getCostTrend,
  getModelPricing,
  MODEL_PRICING,
  type TokenUsage,
} from '../../src/services/cost_calculator.ts';

// ============================================================================
// getModelPricing Tests
// ============================================================================

Deno.test('getModelPricing returns correct pricing for exact model names', () => {
  // Opus variations
  assertEquals(getModelPricing('opus'), MODEL_PRICING['opus']);
  assertEquals(getModelPricing('claude-opus-4'), MODEL_PRICING['claude-opus-4']);
  assertEquals(
    getModelPricing('claude-opus-4-5-20251101'),
    MODEL_PRICING['claude-opus-4-5-20251101'],
  );

  // Sonnet variations
  assertEquals(getModelPricing('sonnet'), MODEL_PRICING['sonnet']);
  assertEquals(getModelPricing('claude-sonnet-4'), MODEL_PRICING['claude-sonnet-4']);
  assertEquals(
    getModelPricing('claude-sonnet-4-20250514'),
    MODEL_PRICING['claude-sonnet-4-20250514'],
  );

  // Haiku variations
  assertEquals(getModelPricing('haiku'), MODEL_PRICING['haiku']);
  assertEquals(getModelPricing('claude-3-5-haiku'), MODEL_PRICING['claude-3-5-haiku']);
  assertEquals(
    getModelPricing('claude-3-5-haiku-20241022'),
    MODEL_PRICING['claude-3-5-haiku-20241022'],
  );
});

Deno.test('getModelPricing normalizes model names (case insensitive)', () => {
  assertEquals(getModelPricing('OPUS'), MODEL_PRICING['opus']);
  assertEquals(getModelPricing('Sonnet'), MODEL_PRICING['sonnet']);
  assertEquals(getModelPricing('HAIKU'), MODEL_PRICING['haiku']);
  assertEquals(getModelPricing('Claude-Opus-4'), MODEL_PRICING['opus']);
});

Deno.test('getModelPricing handles partial matches', () => {
  // Should match "opus" anywhere in the string
  assertEquals(getModelPricing('my-opus-model'), MODEL_PRICING['opus']);
  assertEquals(getModelPricing('opus-custom'), MODEL_PRICING['opus']);

  // Should match "sonnet" anywhere in the string
  assertEquals(getModelPricing('sonnet-v2'), MODEL_PRICING['sonnet']);
  assertEquals(getModelPricing('custom-sonnet'), MODEL_PRICING['sonnet']);

  // Should match "haiku" anywhere in the string
  assertEquals(getModelPricing('haiku-fast'), MODEL_PRICING['haiku']);
  assertEquals(getModelPricing('fast-haiku'), MODEL_PRICING['haiku']);
});

Deno.test('getModelPricing returns default pricing for unknown models', () => {
  const defaultPricing = MODEL_PRICING['opus'];
  assertEquals(getModelPricing('unknown-model'), defaultPricing);
  assertEquals(getModelPricing('gpt-4'), defaultPricing);
  assertEquals(getModelPricing(''), defaultPricing);
});

Deno.test('getModelPricing handles whitespace in model names', () => {
  assertEquals(getModelPricing('  opus  '), MODEL_PRICING['opus']);
  assertEquals(getModelPricing('\tsonnet\n'), MODEL_PRICING['sonnet']);
});

// ============================================================================
// calculateCostBreakdown Tests
// ============================================================================

Deno.test('calculateCostBreakdown computes correct costs for opus', () => {
  const usage: TokenUsage = {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  };

  const breakdown = calculateCostBreakdown(usage, 'opus');

  // Opus pricing: $15 input, $75 output per million tokens
  assertEquals(breakdown.input, 15);
  assertEquals(breakdown.output, 75);
  assertEquals(breakdown.cacheWrite, 0);
  assertEquals(breakdown.cacheRead, 0);
  assertEquals(breakdown.total, 90);
});

Deno.test('calculateCostBreakdown computes correct costs for sonnet', () => {
  const usage: TokenUsage = {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  };

  const breakdown = calculateCostBreakdown(usage, 'sonnet');

  // Sonnet pricing: $3 input, $15 output per million tokens
  assertEquals(breakdown.input, 3);
  assertEquals(breakdown.output, 15);
  assertEquals(breakdown.total, 18);
});

Deno.test('calculateCostBreakdown computes correct costs for haiku', () => {
  const usage: TokenUsage = {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  };

  const breakdown = calculateCostBreakdown(usage, 'haiku');

  // Haiku pricing: $0.8 input, $4 output per million tokens
  assertAlmostEquals(breakdown.input, 0.8, 0.001);
  assertEquals(breakdown.output, 4);
  assertAlmostEquals(breakdown.total, 4.8, 0.001);
});

Deno.test('calculateCostBreakdown includes cache costs', () => {
  const usage: TokenUsage = {
    inputTokens: 500_000,
    outputTokens: 500_000,
    cacheWriteTokens: 200_000,
    cacheReadTokens: 300_000,
  };

  const breakdown = calculateCostBreakdown(usage, 'opus');

  // Opus pricing: $15 input, $75 output, $18.75 cache write, $1.5 cache read per million
  assertAlmostEquals(breakdown.input, 7.5, 0.001); // 500k * 15 / 1M
  assertAlmostEquals(breakdown.output, 37.5, 0.001); // 500k * 75 / 1M
  assertAlmostEquals(breakdown.cacheWrite, 3.75, 0.001); // 200k * 18.75 / 1M
  assertAlmostEquals(breakdown.cacheRead, 0.45, 0.001); // 300k * 1.5 / 1M
  assertAlmostEquals(breakdown.total, 49.2, 0.001);
});

Deno.test('calculateCostBreakdown handles zero tokens', () => {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
  };

  const breakdown = calculateCostBreakdown(usage, 'opus');

  assertEquals(breakdown.input, 0);
  assertEquals(breakdown.output, 0);
  assertEquals(breakdown.cacheWrite, 0);
  assertEquals(breakdown.cacheRead, 0);
  assertEquals(breakdown.total, 0);
});

Deno.test('calculateCostBreakdown handles small token counts', () => {
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
  };

  const breakdown = calculateCostBreakdown(usage, 'opus');

  // 1000 * 15 / 1_000_000 = 0.015
  assertAlmostEquals(breakdown.input, 0.015, 0.0001);
  // 500 * 75 / 1_000_000 = 0.0375
  assertAlmostEquals(breakdown.output, 0.0375, 0.0001);
  assertAlmostEquals(breakdown.total, 0.0525, 0.0001);
});

// ============================================================================
// calculateCost Tests
// ============================================================================

Deno.test('calculateCost returns total from breakdown', () => {
  const usage: TokenUsage = {
    inputTokens: 100_000,
    outputTokens: 50_000,
  };

  const cost = calculateCost(usage, 'opus');
  const breakdown = calculateCostBreakdown(usage, 'opus');

  assertEquals(cost, breakdown.total);
});

// ============================================================================
// formatCost Tests
// ============================================================================

Deno.test('formatCost formats zero correctly', () => {
  assertEquals(formatCost(0), '$0.00');
});

Deno.test('formatCost formats large amounts with 2 decimal places', () => {
  assertEquals(formatCost(1.5), '$1.50');
  assertEquals(formatCost(10.99), '$10.99');
  assertEquals(formatCost(100.123), '$100.12');
  assertEquals(formatCost(1234.5678), '$1234.57');
});

Deno.test('formatCost formats amounts under $1 with 4 decimal places', () => {
  assertEquals(formatCost(0.5), '$0.5000');
  assertEquals(formatCost(0.1234), '$0.1234');
  assertEquals(formatCost(0.0999), '$0.0999');
  assertEquals(formatCost(0.01), '$0.0100');
});

Deno.test('formatCost formats amounts under $0.01 as cents', () => {
  assertEquals(formatCost(0.005), '0.5¢');
  assertEquals(formatCost(0.0099), '1.0¢');
  assertEquals(formatCost(0.001), '0.1¢');
});

Deno.test('formatCost formats very small amounts as fraction of cents', () => {
  assertEquals(formatCost(0.0005), '0.05¢');
  assertEquals(formatCost(0.0001), '0.01¢');
  assertEquals(formatCost(0.00001), '0.00¢');
});

// ============================================================================
// formatCostWithDelta Tests
// ============================================================================

Deno.test('formatCostWithDelta formats without delta when undefined', () => {
  assertEquals(formatCostWithDelta(1.5), '$1.50');
  assertEquals(formatCostWithDelta(0.05, undefined), '$0.0500');
});

Deno.test('formatCostWithDelta formats without delta when zero', () => {
  assertEquals(formatCostWithDelta(1.5, 0), '$1.50');
});

Deno.test('formatCostWithDelta includes delta when present', () => {
  assertEquals(formatCostWithDelta(1.5, 0.5), '$1.50 (+$0.5000)');
  assertEquals(formatCostWithDelta(0.05, 0.01), '$0.0500 (+$0.0100)');
});

// ============================================================================
// estimateCost Tests
// ============================================================================

Deno.test('estimateCost calculates cost from token estimates', () => {
  const cost = estimateCost(100_000, 50_000, 'opus');

  // 100k * 15 / 1M = 1.5 input
  // 50k * 75 / 1M = 3.75 output
  assertAlmostEquals(cost, 5.25, 0.001);
});

Deno.test('estimateCost works with different models', () => {
  const sonnetCost = estimateCost(100_000, 50_000, 'sonnet');
  const haikuCost = estimateCost(100_000, 50_000, 'haiku');

  // Sonnet: 100k * 3 / 1M = 0.3 input, 50k * 15 / 1M = 0.75 output
  assertAlmostEquals(sonnetCost, 1.05, 0.001);

  // Haiku: 100k * 0.8 / 1M = 0.08 input, 50k * 4 / 1M = 0.2 output
  assertAlmostEquals(haikuCost, 0.28, 0.001);
});

// ============================================================================
// getCostTrend Tests
// ============================================================================

Deno.test('getCostTrend returns stable for empty or single cost', () => {
  assertEquals(getCostTrend([]), 'stable');
  assertEquals(getCostTrend([0.5]), 'stable');
});

Deno.test('getCostTrend returns stable for consistent costs', () => {
  assertEquals(getCostTrend([0.5, 0.5, 0.5]), 'stable');
  assertEquals(getCostTrend([1.0, 1.0, 1.0, 1.0]), 'stable');
});

Deno.test('getCostTrend returns increasing when last cost exceeds average', () => {
  assertEquals(getCostTrend([0.5, 0.5, 0.8]), 'increasing');
  assertEquals(getCostTrend([1.0, 1.0, 1.5]), 'increasing');
});

Deno.test('getCostTrend returns decreasing when last cost below average', () => {
  assertEquals(getCostTrend([0.8, 0.8, 0.5]), 'decreasing');
  assertEquals(getCostTrend([1.5, 1.5, 1.0]), 'decreasing');
});

Deno.test('getCostTrend uses custom threshold', () => {
  // With default 0.01 threshold, small changes are stable
  assertEquals(getCostTrend([1.0, 1.0, 1.005], 0.01), 'stable');

  // With lower threshold, same change is detected
  assertEquals(getCostTrend([1.0, 1.0, 1.005], 0.001), 'increasing');
});

Deno.test('getCostTrend only considers last 3 costs', () => {
  // Old high costs should not affect the trend
  assertEquals(getCostTrend([10.0, 10.0, 1.0, 1.0, 1.0]), 'stable');
});

// ============================================================================
// formatCostBreakdown Tests
// ============================================================================

Deno.test('formatCostBreakdown includes all non-zero components', () => {
  const breakdown = {
    input: 0.5,
    output: 1.5,
    cacheWrite: 0.2,
    cacheRead: 0.1,
    total: 2.3,
  };

  const lines = formatCostBreakdown(breakdown);

  assertEquals(lines.length, 5);
  assertEquals(lines[0], 'Input: $0.5000');
  assertEquals(lines[1], 'Output: $1.50');
  assertEquals(lines[2], 'Cache write: $0.2000');
  assertEquals(lines[3], 'Cache read: $0.1000');
  assertEquals(lines[4], 'Total: $2.30');
});

Deno.test('formatCostBreakdown excludes zero components', () => {
  const breakdown = {
    input: 0.5,
    output: 1.5,
    cacheWrite: 0,
    cacheRead: 0,
    total: 2.0,
  };

  const lines = formatCostBreakdown(breakdown);

  assertEquals(lines.length, 3);
  assertEquals(lines[0], 'Input: $0.5000');
  assertEquals(lines[1], 'Output: $1.50');
  assertEquals(lines[2], 'Total: $2.00');
});

Deno.test('formatCostBreakdown handles zero total', () => {
  const breakdown = {
    input: 0,
    output: 0,
    cacheWrite: 0,
    cacheRead: 0,
    total: 0,
  };

  const lines = formatCostBreakdown(breakdown);

  assertEquals(lines.length, 1);
  assertEquals(lines[0], 'Total: $0.00');
});

// ============================================================================
// calculateCacheEfficiency Tests
// ============================================================================

Deno.test('calculateCacheEfficiency returns 0 for no cache reads', () => {
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
  };

  assertEquals(calculateCacheEfficiency(usage), 0);
});

Deno.test('calculateCacheEfficiency returns 0 for zero input', () => {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 500,
    cacheReadTokens: 0,
  };

  assertEquals(calculateCacheEfficiency(usage), 0);
});

Deno.test('calculateCacheEfficiency calculates correct percentage', () => {
  const usage: TokenUsage = {
    inputTokens: 500,
    outputTokens: 100,
    cacheReadTokens: 500,
  };

  // 500 cache / (500 input + 500 cache) = 50%
  assertEquals(calculateCacheEfficiency(usage), 50);
});

Deno.test('calculateCacheEfficiency returns 100% when all from cache', () => {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 100,
    cacheReadTokens: 1000,
  };

  // 1000 cache / (0 input + 1000 cache) = 100%
  assertEquals(calculateCacheEfficiency(usage), 100);
});

// ============================================================================
// calculateCacheSavings Tests
// ============================================================================

Deno.test('calculateCacheSavings returns 0 for no cache reads', () => {
  const usage: TokenUsage = {
    inputTokens: 1000,
    outputTokens: 500,
  };

  assertEquals(calculateCacheSavings(usage, 'opus'), 0);
});

Deno.test('calculateCacheSavings calculates correct savings for opus', () => {
  const usage: TokenUsage = {
    inputTokens: 500_000,
    outputTokens: 100_000,
    cacheReadTokens: 500_000,
  };

  // Opus: input $15/M, cache read $1.5/M
  // Without cache: 500k * 15 / 1M = 7.5
  // With cache: 500k * 1.5 / 1M = 0.75
  // Savings: 7.5 - 0.75 = 6.75
  assertAlmostEquals(calculateCacheSavings(usage, 'opus'), 6.75, 0.001);
});

Deno.test('calculateCacheSavings calculates correct savings for sonnet', () => {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 1_000_000,
  };

  // Sonnet: input $3/M, cache read $0.3/M
  // Without cache: 1M * 3 / 1M = 3
  // With cache: 1M * 0.3 / 1M = 0.3
  // Savings: 3 - 0.3 = 2.7
  assertAlmostEquals(calculateCacheSavings(usage, 'sonnet'), 2.7, 0.001);
});

Deno.test('calculateCacheSavings calculates correct savings for haiku', () => {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 1_000_000,
  };

  // Haiku: input $0.8/M, cache read $0.08/M
  // Without cache: 1M * 0.8 / 1M = 0.8
  // With cache: 1M * 0.08 / 1M = 0.08
  // Savings: 0.8 - 0.08 = 0.72
  assertAlmostEquals(calculateCacheSavings(usage, 'haiku'), 0.72, 0.001);
});

// ============================================================================
// Model Pricing Data Validation
// ============================================================================

Deno.test('MODEL_PRICING has consistent structure', () => {
  for (const [model, pricing] of Object.entries(MODEL_PRICING)) {
    assertEquals(typeof pricing.input, 'number', `${model}.input should be number`);
    assertEquals(typeof pricing.output, 'number', `${model}.output should be number`);
    assertEquals(typeof pricing.cacheWrite, 'number', `${model}.cacheWrite should be number`);
    assertEquals(typeof pricing.cacheRead, 'number', `${model}.cacheRead should be number`);

    // All prices should be positive
    assertEquals(pricing.input > 0, true, `${model}.input should be positive`);
    assertEquals(pricing.output > 0, true, `${model}.output should be positive`);
    assertEquals(pricing.cacheWrite > 0, true, `${model}.cacheWrite should be positive`);
    assertEquals(pricing.cacheRead > 0, true, `${model}.cacheRead should be positive`);

    // Cache read should be cheaper than input
    assertEquals(
      pricing.cacheRead < pricing.input,
      true,
      `${model} cache read should be cheaper than input`,
    );
  }
});

Deno.test('MODEL_PRICING opus is more expensive than sonnet', () => {
  const opus = MODEL_PRICING['opus'];
  const sonnet = MODEL_PRICING['sonnet'];

  if (opus && sonnet) {
    assertEquals(opus.input > sonnet.input, true);
    assertEquals(opus.output > sonnet.output, true);
  }
});

Deno.test('MODEL_PRICING sonnet is more expensive than haiku', () => {
  const sonnet = MODEL_PRICING['sonnet'];
  const haiku = MODEL_PRICING['haiku'];

  if (sonnet && haiku) {
    assertEquals(sonnet.input > haiku.input, true);
    assertEquals(sonnet.output > haiku.output, true);
  }
});
