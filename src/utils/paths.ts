/**
 * @module utils/paths
 *
 * Path resolution utilities for consistent project path handling.
 * All functions are pure except getCwd() which reads from Deno.cwd().
 */

import { join } from '@std/path';

// ============================================================================
// Impure Functions
// ============================================================================

/**
 * Gets the current working directory.
 *
 * @impure Reads from Deno.cwd()
 */
export function getCwd(): string {
  return Deno.cwd();
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Resolves a path relative to a project directory.
 * If no project directory is provided, uses the current working directory.
 *
 * Note: Impure when projectDir is undefined (calls getCwd internally).
 * Pure when projectDir is provided.
 *
 * @param projectDir - The project directory, or undefined to use cwd
 * @param relativePath - The path relative to the project directory
 * @returns The fully resolved path
 *
 * @example
 * ```ts
 * resolveProjectPath('/home/user/project', 'specs')
 * // => '/home/user/project/specs'
 *
 * resolveProjectPath(undefined, '.ralph.json')
 * // => '<cwd>/.ralph.json'
 *
 * // Empty relative path returns the base path
 * resolveProjectPath('/home/user/project', '')
 * // => '/home/user/project'
 * ```
 */
export function resolveProjectPath(projectDir: string | undefined, relativePath: string): string {
  const basePath = projectDir ?? getCwd();
  if (relativePath === '') {
    return basePath;
  }
  return join(basePath, relativePath);
}

/**
 * Creates a path resolver function bound to a specific base path.
 * Useful for partial application when resolving multiple paths from the same base.
 *
 * @pure No side effects - returns a pure function
 *
 * @param basePath - The base path to resolve from
 * @returns A function that resolves paths relative to the base path
 *
 * @example
 * ```ts
 * const resolve = createPathResolver('/home/user/project');
 * resolve('specs')        // => '/home/user/project/specs'
 * resolve('.ralph.json')  // => '/home/user/project/.ralph.json'
 * resolve('AGENTS.md')    // => '/home/user/project/AGENTS.md'
 * ```
 */
export function createPathResolver(basePath: string): (relativePath: string) => string {
  return (relativePath: string) => {
    if (relativePath === '') {
      return basePath;
    }
    return join(basePath, relativePath);
  };
}
