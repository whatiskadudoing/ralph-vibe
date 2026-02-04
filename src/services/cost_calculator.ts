/**
 * @module services/cost_calculator
 *
 * Calculates API costs based on token usage for Claude models.
 * All functions in this module are pure - no side effects.
 * Pricing as of January 2025.
 */

// ============================================================================
// Types
// ============================================================================

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheWriteTokens?: number;
  readonly cacheReadTokens?: number;
}

export interface ModelPricing {
  readonly input: number; // $ per million tokens
  readonly output: number; // $ per million tokens
  readonly cacheWrite: number; // $ per million tokens
  readonly cacheRead: number; // $ per million tokens
}

export interface CostBreakdown {
  readonly input: number;
  readonly output: number;
  readonly cacheWrite: number;
  readonly cacheRead: number;
  readonly total: number;
}

// ============================================================================
// Pricing Data
// ============================================================================

/**
 * Base pricing constants for each model family.
 * Defined once to avoid duplication.
 * @see https://www.anthropic.com/pricing
 */
const OPUS_PRICING: ModelPricing = {
  input: 15,
  output: 75,
  cacheWrite: 18.75,
  cacheRead: 1.5,
};

const SONNET_PRICING: ModelPricing = {
  input: 3,
  output: 15,
  cacheWrite: 3.75,
  cacheRead: 0.3,
};

const HAIKU_PRICING: ModelPricing = {
  input: 0.8,
  output: 4,
  cacheWrite: 1,
  cacheRead: 0.08,
};

/**
 * Claude model pricing (per million tokens).
 * Uses aliases to base pricing constants to avoid duplication.
 * @see https://www.anthropic.com/pricing
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Opus 4 - all variants point to same pricing
  'claude-opus-4': OPUS_PRICING,
  'claude-opus-4-5-20251101': OPUS_PRICING,
  'opus': OPUS_PRICING,

  // Sonnet 4 - all variants point to same pricing
  'claude-sonnet-4': SONNET_PRICING,
  'claude-sonnet-4-20250514': SONNET_PRICING,
  'sonnet': SONNET_PRICING,

  // Haiku 3.5 - all variants point to same pricing
  'claude-3-5-haiku': HAIKU_PRICING,
  'claude-3-5-haiku-20241022': HAIKU_PRICING,
  'haiku': HAIKU_PRICING,
};

// Default to Opus pricing if model not found
const DEFAULT_PRICING: ModelPricing = OPUS_PRICING;

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Gets pricing for a model, with fallback to default.
 *
 * @pure No side effects - lookup only
 */
export function getModelPricing(model: string): ModelPricing {
  // Normalize model name
  const normalized = model.toLowerCase().trim();

  // Try exact match first
  const exactMatch = MODEL_PRICING[normalized];
  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match
  if (normalized.includes('opus')) {
    return OPUS_PRICING;
  }
  if (normalized.includes('sonnet')) {
    return SONNET_PRICING;
  }
  if (normalized.includes('haiku')) {
    return HAIKU_PRICING;
  }

  return DEFAULT_PRICING;
}

/**
 * Calculates cost breakdown for token usage.
 *
 * @pure No side effects - computation only
 */
export function calculateCostBreakdown(
  usage: TokenUsage,
  model: string,
): CostBreakdown {
  const pricing = getModelPricing(model);

  const inputCost = (usage.inputTokens * pricing.input) / 1_000_000;
  const outputCost = (usage.outputTokens * pricing.output) / 1_000_000;
  const cacheWriteCost = ((usage.cacheWriteTokens ?? 0) * pricing.cacheWrite) / 1_000_000;
  const cacheReadCost = ((usage.cacheReadTokens ?? 0) * pricing.cacheRead) / 1_000_000;

  return {
    input: inputCost,
    output: outputCost,
    cacheWrite: cacheWriteCost,
    cacheRead: cacheReadCost,
    total: inputCost + outputCost + cacheWriteCost + cacheReadCost,
  };
}

/**
 * Calculates total cost for token usage.
 *
 * @pure No side effects - computation only
 */
export function calculateCost(usage: TokenUsage, model: string): number {
  return calculateCostBreakdown(usage, model).total;
}

/**
 * Formats a dollar amount for display.
 * - Under $0.01: shows as cents (e.g., "0.5¢")
 * - Under $1: shows 4 decimal places (e.g., "$0.0234")
 * - $1 and above: shows 2 decimal places (e.g., "$1.23")
 *
 * @pure No side effects - string formatting only
 */
export function formatCost(dollars: number): string {
  if (dollars === 0) return '$0.00';

  if (dollars < 0.001) {
    // Show as fraction of a cent
    const cents = dollars * 100;
    return `${cents.toFixed(2)}¢`;
  }

  if (dollars < 0.01) {
    // Show as cents
    const cents = dollars * 100;
    return `${cents.toFixed(1)}¢`;
  }

  if (dollars < 1) {
    // Show with 4 decimal places
    return `$${dollars.toFixed(4)}`;
  }

  // Show with 2 decimal places
  return `$${dollars.toFixed(2)}`;
}

/**
 * Formats cost with delta indicator.
 * e.g., "$0.0234 (+$0.0089)"
 *
 * @pure No side effects - string formatting only
 */
export function formatCostWithDelta(
  total: number,
  delta?: number,
): string {
  const totalStr = formatCost(total);

  if (delta === undefined || delta === 0) {
    return totalStr;
  }

  const deltaStr = formatCost(delta);
  return `${totalStr} (+${deltaStr})`;
}

/**
 * Estimates cost for a given number of tokens at a model's rate.
 * Useful for showing estimated remaining cost.
 *
 * @pure No side effects - computation only
 */
export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  model: string,
): number {
  return calculateCost(
    { inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens },
    model,
  );
}

/**
 * Gets a cost trend indicator based on recent costs.
 *
 * @pure No side effects - computation only
 */
export function getCostTrend(
  recentCosts: number[],
  threshold: number = 0.01,
): 'increasing' | 'decreasing' | 'stable' {
  if (recentCosts.length < 2) return 'stable';

  const recent = recentCosts.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const last = recent[recent.length - 1] ?? 0;

  if (last > avg * (1 + threshold)) return 'increasing';
  if (last < avg * (1 - threshold)) return 'decreasing';
  return 'stable';
}

/**
 * Formats a cost breakdown for detailed display.
 *
 * @pure No side effects - string formatting only
 */
export function formatCostBreakdown(breakdown: CostBreakdown): string[] {
  const lines: string[] = [];

  if (breakdown.input > 0) {
    lines.push(`Input: ${formatCost(breakdown.input)}`);
  }
  if (breakdown.output > 0) {
    lines.push(`Output: ${formatCost(breakdown.output)}`);
  }
  if (breakdown.cacheWrite > 0) {
    lines.push(`Cache write: ${formatCost(breakdown.cacheWrite)}`);
  }
  if (breakdown.cacheRead > 0) {
    lines.push(`Cache read: ${formatCost(breakdown.cacheRead)}`);
  }

  lines.push(`Total: ${formatCost(breakdown.total)}`);

  return lines;
}

/**
 * Calculates cache efficiency as a percentage.
 * Higher is better - means more tokens came from cache.
 *
 * @pure No side effects - computation only
 */
export function calculateCacheEfficiency(usage: TokenUsage): number {
  const cacheRead = usage.cacheReadTokens ?? 0;
  const totalInput = usage.inputTokens + cacheRead;

  if (totalInput === 0) return 0;

  return (cacheRead / totalInput) * 100;
}

/**
 * Estimates savings from cache usage.
 *
 * @pure No side effects - computation only
 */
export function calculateCacheSavings(
  usage: TokenUsage,
  model: string,
): number {
  const pricing = getModelPricing(model);
  const cacheRead = usage.cacheReadTokens ?? 0;

  // What it would have cost without cache
  const withoutCache = (cacheRead * pricing.input) / 1_000_000;

  // What it actually cost with cache
  const withCache = (cacheRead * pricing.cacheRead) / 1_000_000;

  return withoutCache - withCache;
}
