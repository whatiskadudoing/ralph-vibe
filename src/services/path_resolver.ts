/**
 * @module services/path_resolver
 *
 * Resolves file paths from project configuration.
 * All commands should use this module to get file paths,
 * ensuring paths are configurable via .ralph.json.
 *
 * Key feature: Finds the nearest .ralph.json going up the directory tree,
 * allowing commands to run from any subdirectory within a project.
 */

import { dirname, join } from '@std/path';
import { DEFAULT_PATHS, type PathsConfig, type RalphConfig } from '@/core/config.ts';
import { readConfig } from './project_service.ts';
import { exists } from './file_service.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Resolved paths with absolute paths ready to use.
 */
export interface ResolvedPaths {
  readonly root: string;
  readonly specs: string;
  readonly research: string;
  readonly plan: string;
  readonly agents: string;
  readonly audienceJtbd: string;
  readonly buildPrompt: string;
  readonly planPrompt: string;
  readonly researchPrompt: string;
  readonly startPrompt: string;
  readonly specPrompt: string;
  readonly audiencePrompt: string;
  readonly config: string;
}

// ============================================================================
// Project Root Discovery
// ============================================================================

/**
 * Finds the nearest Ralph project root by searching for .ralph.json
 * going up the directory tree from the current directory.
 *
 * @returns The project root path, or null if no project found.
 */
export async function findProjectRoot(startDir?: string): Promise<string | null> {
  let current = startDir ?? Deno.cwd();

  // Prevent infinite loops - max 50 levels up
  for (let i = 0; i < 50; i++) {
    const configPath = join(current, '.ralph.json');
    if (await exists(configPath)) {
      return current;
    }

    const parent = dirname(current);
    // Reached filesystem root
    if (parent === current) {
      return null;
    }
    current = parent;
  }

  return null;
}

/**
 * Finds the project root or throws an error if not found.
 * Use this when the command requires being in a Ralph project.
 */
export async function requireProjectRoot(startDir?: string): Promise<string> {
  const root = await findProjectRoot(startDir);
  if (!root) {
    throw new Error(
      'Not in a Ralph project. Run `ralph init` first, or navigate to a Ralph project directory.',
    );
  }
  return root;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Gets the paths config, falling back to defaults if config can't be read.
 * This allows commands to work even if .ralph.json is missing or invalid.
 */
export async function getPathsConfig(cwd?: string): Promise<PathsConfig> {
  const configResult = await readConfig(cwd);
  if (configResult.ok) {
    return configResult.value.paths;
  }
  return DEFAULT_PATHS;
}

/**
 * Resolves all project paths from configuration.
 * Automatically finds the project root by searching up the directory tree.
 * Returns absolute paths ready to use.
 *
 * @throws Error if not in a Ralph project (no .ralph.json found)
 */
export async function resolvePaths(startDir?: string): Promise<ResolvedPaths> {
  const root = await requireProjectRoot(startDir);
  const paths = await getPathsConfig(root);

  return {
    root,
    specs: join(root, paths.specs),
    research: join(root, paths.research),
    plan: join(root, paths.plan),
    agents: join(root, paths.agents),
    audienceJtbd: join(root, paths.audienceJtbd),
    buildPrompt: join(root, paths.buildPrompt),
    planPrompt: join(root, paths.planPrompt),
    researchPrompt: join(root, paths.researchPrompt),
    startPrompt: join(root, paths.startPrompt),
    specPrompt: join(root, paths.specPrompt),
    audiencePrompt: join(root, paths.audiencePrompt),
    config: join(root, '.ralph.json'),
  };
}

/**
 * Tries to resolve paths, returning null if not in a Ralph project.
 * Use this when you want to handle the "not a project" case yourself.
 */
export async function tryResolvePaths(startDir?: string): Promise<ResolvedPaths | null> {
  const root = await findProjectRoot(startDir);
  if (!root) {
    return null;
  }
  const paths = await getPathsConfig(root);

  return {
    root,
    specs: join(root, paths.specs),
    research: join(root, paths.research),
    plan: join(root, paths.plan),
    agents: join(root, paths.agents),
    audienceJtbd: join(root, paths.audienceJtbd),
    buildPrompt: join(root, paths.buildPrompt),
    planPrompt: join(root, paths.planPrompt),
    researchPrompt: join(root, paths.researchPrompt),
    startPrompt: join(root, paths.startPrompt),
    specPrompt: join(root, paths.specPrompt),
    audiencePrompt: join(root, paths.audiencePrompt),
    config: join(root, '.ralph.json'),
  };
}

/**
 * Resolves paths synchronously using provided config.
 * Use this when you already have the config loaded.
 */
export function resolvePathsFromConfig(config: RalphConfig, cwd?: string): ResolvedPaths {
  const root = cwd ?? Deno.cwd();
  const paths = config.paths;

  return {
    root,
    specs: join(root, paths.specs),
    research: join(root, paths.research),
    plan: join(root, paths.plan),
    agents: join(root, paths.agents),
    audienceJtbd: join(root, paths.audienceJtbd),
    buildPrompt: join(root, paths.buildPrompt),
    planPrompt: join(root, paths.planPrompt),
    researchPrompt: join(root, paths.researchPrompt),
    startPrompt: join(root, paths.startPrompt),
    specPrompt: join(root, paths.specPrompt),
    audiencePrompt: join(root, paths.audiencePrompt),
    config: join(root, '.ralph.json'),
  };
}

/**
 * Resolves paths using default paths (for when config doesn't exist yet).
 * Used during init before config is created.
 */
export function resolveDefaultPaths(cwd?: string): ResolvedPaths {
  const root = cwd ?? Deno.cwd();
  const paths = DEFAULT_PATHS;

  return {
    root,
    specs: join(root, paths.specs),
    research: join(root, paths.research),
    plan: join(root, paths.plan),
    agents: join(root, paths.agents),
    audienceJtbd: join(root, paths.audienceJtbd),
    buildPrompt: join(root, paths.buildPrompt),
    planPrompt: join(root, paths.planPrompt),
    researchPrompt: join(root, paths.researchPrompt),
    startPrompt: join(root, paths.startPrompt),
    specPrompt: join(root, paths.specPrompt),
    audiencePrompt: join(root, paths.audiencePrompt),
    config: join(root, '.ralph.json'),
  };
}
