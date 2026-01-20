/**
 * @module core/config
 *
 * Configuration schema and validation for Ralph projects.
 * Minimal config focused on paths and loop behavior.
 * Project metadata (language, commands) is discovered by Claude from project files.
 */

import { err, ok, type Result } from '@/utils/result.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Deep partial type for nested config overrides.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Supported AI models.
 */
export type Model = 'opus' | 'sonnet' | 'adaptive';

/**
 * Path configuration for Ralph files.
 * Allows customization in case files are renamed or moved.
 */
export interface PathsConfig {
  readonly specs: string;
  readonly plan: string;
  readonly agents: string;
  readonly audienceJtbd: string;
  readonly buildPrompt: string;
  readonly planPrompt: string;
  readonly startPrompt: string;
  readonly specPrompt: string;
  readonly audiencePrompt: string;
}

/**
 * Work loop configuration (replaces loop.sh).
 */
export interface WorkConfig {
  readonly model: Model;
  readonly maxIterations: number;
  readonly autoPush: boolean;
  readonly stopOnFailure: boolean;
  readonly cooldown: number;
}

/**
 * Complete Ralph configuration for a project.
 */
export interface RalphConfig {
  readonly version: string;
  readonly paths: PathsConfig;
  readonly work: WorkConfig;
}

/**
 * Validation error with path to the invalid field.
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Current config version.
 */
export const CONFIG_VERSION = '0.1.0';

/**
 * Default paths for Ralph files.
 */
export const DEFAULT_PATHS: PathsConfig = {
  specs: 'specs',
  plan: 'IMPLEMENTATION_PLAN.md',
  agents: 'AGENTS.md',
  audienceJtbd: 'AUDIENCE_JTBD.md',
  buildPrompt: 'PROMPT_build.md',
  planPrompt: 'PROMPT_plan.md',
  startPrompt: 'PROMPT_start.md',
  specPrompt: 'PROMPT_spec.md',
  audiencePrompt: 'PROMPT_audience.md',
};

/**
 * Default work loop settings.
 *
 * maxIterations: 25 is the recommended safety limit to prevent infinite loops
 * on impossible tasks. Users can increase if needed, but should always have a limit.
 */
export const DEFAULT_WORK: WorkConfig = {
  model: 'opus',
  maxIterations: 25,
  autoPush: true,
  stopOnFailure: false,
  cooldown: 5,
};

/**
 * Recommended max iterations for safety.
 * This prevents infinite loops on impossible tasks.
 */
export const RECOMMENDED_MAX_ITERATIONS = 25;

/**
 * Valid model values.
 */
export const VALID_MODELS: readonly Model[] = ['opus', 'sonnet', 'adaptive'];

// ============================================================================
// Functions
// ============================================================================

/**
 * Checks if a value is a valid model.
 */
export function isValidModel(value: unknown): value is Model {
  return typeof value === 'string' && VALID_MODELS.includes(value as Model);
}

/**
 * Creates a new config with defaults.
 */
export function createConfig(overrides?: DeepPartial<RalphConfig>): RalphConfig {
  return {
    version: CONFIG_VERSION,
    paths: {
      ...DEFAULT_PATHS,
      ...overrides?.paths,
    },
    work: {
      ...DEFAULT_WORK,
      ...overrides?.work,
    },
  };
}

/**
 * Validates a config object and returns a list of errors.
 */
export function validateConfig(config: unknown): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof config !== 'object' || config === null) {
    return [{ path: '', message: 'Config must be an object' }];
  }

  const c = config as Record<string, unknown>;

  // Validate version
  if (typeof c.version !== 'string') {
    errors.push({ path: 'version', message: 'Version must be a string' });
  }

  // Validate paths
  if (typeof c.paths !== 'object' || c.paths === null) {
    errors.push({ path: 'paths', message: 'Paths must be an object' });
  } else {
    const paths = c.paths as Record<string, unknown>;
    const requiredPaths = [
      'specs',
      'plan',
      'agents',
      'audienceJtbd',
      'buildPrompt',
      'planPrompt',
      'startPrompt',
      'specPrompt',
      'audiencePrompt',
    ];
    for (const key of requiredPaths) {
      if (typeof paths[key] !== 'string') {
        errors.push({ path: `paths.${key}`, message: `paths.${key} must be a string` });
      }
    }
  }

  // Validate work
  if (typeof c.work !== 'object' || c.work === null) {
    errors.push({ path: 'work', message: 'Work must be an object' });
  } else {
    const work = c.work as Record<string, unknown>;

    if (!isValidModel(work.model)) {
      errors.push({
        path: 'work.model',
        message: `Model must be one of: ${VALID_MODELS.join(', ')}`,
      });
    }

    if (typeof work.maxIterations !== 'number' || work.maxIterations < 1) {
      errors.push({
        path: 'work.maxIterations',
        message: 'maxIterations must be a positive number',
      });
    }

    if (typeof work.autoPush !== 'boolean') {
      errors.push({ path: 'work.autoPush', message: 'autoPush must be a boolean' });
    }

    if (typeof work.stopOnFailure !== 'boolean') {
      errors.push({ path: 'work.stopOnFailure', message: 'stopOnFailure must be a boolean' });
    }

    if (typeof work.cooldown !== 'number' || work.cooldown < 0) {
      errors.push({
        path: 'work.cooldown',
        message: 'cooldown must be a non-negative number',
      });
    }
  }

  return errors;
}

/**
 * Parses and validates a config from a JSON string.
 */
export function parseConfig(json: string): Result<RalphConfig, readonly ValidationError[]> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return err([{ path: '', message: 'Invalid JSON' }]);
  }

  const errors = validateConfig(parsed);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(parsed as RalphConfig);
}

/**
 * Serializes a config to a formatted JSON string.
 */
export function serializeConfig(config: RalphConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Merges partial config updates into an existing config.
 */
export function mergeConfig(
  base: RalphConfig,
  updates: DeepPartial<RalphConfig>,
): RalphConfig {
  return {
    ...base,
    ...updates,
    paths: {
      ...base.paths,
      ...updates.paths,
    },
    work: {
      ...base.work,
      ...updates.work,
    },
  };
}
