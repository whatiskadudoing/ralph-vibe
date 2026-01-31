/**
 * @module services/cost_calculator
 *
 * Calculates API costs based on token usage for Claude models.
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
  readonly input: number;      // $ per million tokens
  readonly output: number;     // $ per million tokens
  readonly cacheWrite: number; // $ per million tokens
  readonly cacheRead: number;  // $ per million tokens
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
 * Claude model pricing (per million tokens)
 * @see https://www.anthropic.com/pricing
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Opus 4
  "claude-opus-4": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  "claude-opus-4-5-20251101": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  "opus": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },

  // Sonnet 4
  "claude-sonnet-4": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-sonnet-4-20250514": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "sonnet": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },

  // Haiku 3.5
  "claude-3-5-haiku": {
    input: 0.8,
    output: 4,
    cacheWrite: 1,
    cacheRead: 0.08,
  },
  "claude-3-5-haiku-20241022": {
    input: 0.8,
    output: 4,
    cacheWrite: 1,
    cacheRead: 0.08,
  },
  "haiku": {
    input: 0.8,
    output: 4,
    cacheWrite: 1,
    cacheRead: 0.08,
  },
};

// Default to Opus pricing if model not found
const DEFAULT_PRICING = MODEL_PRICING["opus"]!;

// ============================================================================
// Functions
// ============================================================================

/**
 * Gets pricing for a model, with fallback to default.
 */
export function getModelPricing(model: string): ModelPricing {
  // Normalize model name
  const normalized = model.toLowerCase().trim();

  // Try exact match first
  if (MODEL_PRICING[normalized]) {
    return MODEL_PRICING[normalized]!;
  }

  // Try partial match
  if (normalized.includes("opus")) {
    return MODEL_PRICING["opus"]!;
  }
  if (normalized.includes("sonnet")) {
    return MODEL_PRICING["sonnet"]!;
  }
  if (normalized.includes("haiku")) {
    return MODEL_PRICING["haiku"]!;
  }

  return DEFAULT_PRICING;
}

/**
 * Calculates cost breakdown for token usage.
 */
export function calculateCostBreakdown(
  usage: TokenUsage,
  model: string
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
 */
export function calculateCost(usage: TokenUsage, model: string): number {
  return calculateCostBreakdown(usage, model).total;
}

/**
 * Formats a dollar amount for display.
 * - Under $0.01: shows as cents (e.g., "0.5¢")
 * - Under $1: shows 4 decimal places (e.g., "$0.0234")
 * - $1 and above: shows 2 decimal places (e.g., "$1.23")
 */
export function formatCost(dollars: number): string {
  if (dollars === 0) return "$0.00";

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
 */
export function formatCostWithDelta(
  total: number,
  delta?: number
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
 */
export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  model: string
): number {
  return calculateCost(
    { inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens },
    model
  );
}

/**
 * Gets a cost trend indicator based on recent costs.
 */
export function getCostTrend(
  recentCosts: number[],
  threshold: number = 0.01
): "increasing" | "decreasing" | "stable" {
  if (recentCosts.length < 2) return "stable";

  const recent = recentCosts.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const last = recent[recent.length - 1]!;

  if (last > avg * (1 + threshold)) return "increasing";
  if (last < avg * (1 - threshold)) return "decreasing";
  return "stable";
}

/**
 * Formats a cost breakdown for detailed display.
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
 */
export function calculateCacheEfficiency(usage: TokenUsage): number {
  const cacheRead = usage.cacheReadTokens ?? 0;
  const totalInput = usage.inputTokens + cacheRead;

  if (totalInput === 0) return 0;

  return (cacheRead / totalInput) * 100;
}

/**
 * Estimates savings from cache usage.
 */
export function calculateCacheSavings(
  usage: TokenUsage,
  model: string
): number {
  const pricing = getModelPricing(model);
  const cacheRead = usage.cacheReadTokens ?? 0;

  // What it would have cost without cache
  const withoutCache = (cacheRead * pricing.input) / 1_000_000;

  // What it actually cost with cache
  const withCache = (cacheRead * pricing.cacheRead) / 1_000_000;

  return withoutCache - withCache;
}
