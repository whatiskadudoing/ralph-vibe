/**
 * @module utils/constants
 *
 * Consolidated constants used throughout the codebase.
 * Centralizes magic strings to improve maintainability.
 */

// ============================================================================
// API Constants
// ============================================================================

/**
 * Anthropic beta header for OAuth usage API.
 * Used in: src/services/usage_service.ts
 */
export const ANTHROPIC_BETA_HEADER = 'oauth-2025-04-20';

// ============================================================================
// Signal Markers
// ============================================================================

/**
 * Exit signal marker that Claude includes when tasks are complete.
 * Used in: src/services/claude_service.ts
 */
export const EXIT_SIGNAL_MARKER = 'EXIT_SIGNAL: true';

/**
 * Ralph status marker prefix for parsing iteration status.
 * Used in: src/cli/work.ts
 */
export const RALPH_STATUS_MARKER = 'RALPH_STATUS:';

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Default Claude model when not specified.
 */
export const DEFAULT_MODEL = 'opus';

/**
 * Valid model names.
 */
export type ModelName = 'opus' | 'sonnet' | 'haiku';

/**
 * Model name variants for normalization.
 * Used when parsing model strings from various inputs.
 */
export const MODEL_VARIANTS: Record<ModelName, readonly string[]> = {
  opus: ['opus', 'claude-opus', 'claude-opus-4', 'opus-4'],
  sonnet: ['sonnet', 'claude-sonnet', 'claude-sonnet-4', 'sonnet-4'],
  haiku: ['haiku', 'claude-haiku', 'claude-haiku-3', 'haiku-3'],
};

/**
 * Normalizes a model string to a standard model name.
 * Returns undefined if the input doesn't match any known variant.
 */
export function normalizeModelName(input: string): ModelName | undefined {
  const normalized = input.toLowerCase().trim();

  for (const [model, variants] of Object.entries(MODEL_VARIANTS)) {
    if (variants.includes(normalized)) {
      return model as ModelName;
    }
  }

  return undefined;
}
