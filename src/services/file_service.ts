/**
 * @module services/file_service
 *
 * File system operations.
 * Wraps Deno file APIs for easier testing and consistent error handling.
 */

import { err, fromPromise, ok, type Result } from '@/utils/result.ts';
import { ensureDir } from '@std/fs';
import { dirname, join } from '@std/path';

// ============================================================================
// Types
// ============================================================================

export interface FileError {
  readonly type: 'file_error';
  readonly operation: 'read' | 'write' | 'delete' | 'mkdir' | 'exists' | 'list';
  readonly path: string;
  readonly message: string;
}

/**
 * Creates a FileError.
 */
function fileError(
  operation: FileError['operation'],
  path: string,
  message: string,
): FileError {
  return { type: 'file_error', operation, path, message };
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Checks if a file or directory exists.
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false;
    }
    throw e;
  }
}

/**
 * Checks if a path is a directory.
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Checks if a path is a file.
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Reads a text file.
 */
export async function readTextFile(path: string): Promise<Result<string, FileError>> {
  const result = await fromPromise(
    Deno.readTextFile(path),
    (e) => fileError('read', path, e instanceof Error ? e.message : String(e)),
  );
  return result;
}

/**
 * Writes a text file, creating parent directories if needed.
 */
export async function writeTextFile(
  path: string,
  content: string,
): Promise<Result<void, FileError>> {
  try {
    // Ensure parent directory exists
    const dir = dirname(path);
    await ensureDir(dir);

    await Deno.writeTextFile(path, content);
    return ok(undefined);
  } catch (e) {
    return err(fileError('write', path, e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Creates a directory (and parent directories if needed).
 */
export async function createDirectory(path: string): Promise<Result<void, FileError>> {
  try {
    await ensureDir(path);
    return ok(undefined);
  } catch (e) {
    return err(fileError('mkdir', path, e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Deletes a file.
 */
export async function deleteFile(path: string): Promise<Result<void, FileError>> {
  try {
    await Deno.remove(path);
    return ok(undefined);
  } catch (e) {
    return err(fileError('delete', path, e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Deletes a directory recursively.
 */
export async function deleteDirectory(path: string): Promise<Result<void, FileError>> {
  try {
    await Deno.remove(path, { recursive: true });
    return ok(undefined);
  } catch (e) {
    return err(fileError('delete', path, e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Lists files in a directory.
 */
export async function listDirectory(path: string): Promise<Result<string[], FileError>> {
  try {
    const entries: string[] = [];
    for await (const entry of Deno.readDir(path)) {
      entries.push(entry.name);
    }
    return ok(entries);
  } catch (e) {
    return err(fileError('list', path, e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Lists files in a directory with full paths.
 */
export async function listDirectoryPaths(path: string): Promise<Result<string[], FileError>> {
  const result = await listDirectory(path);
  if (!result.ok) return result;

  return ok(result.value.map((name) => join(path, name)));
}

/**
 * Copies a file.
 */
export async function copyFile(
  source: string,
  destination: string,
): Promise<Result<void, FileError>> {
  try {
    const dir = dirname(destination);
    await ensureDir(dir);
    await Deno.copyFile(source, destination);
    return ok(undefined);
  } catch (e) {
    return err(fileError('write', destination, e instanceof Error ? e.message : String(e)));
  }
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Gets the current working directory.
 */
export function getCwd(): string {
  return Deno.cwd();
}

/**
 * Joins path segments.
 */
export function joinPath(...segments: string[]): string {
  return join(...segments);
}

/**
 * Gets the Ralph directory path for a project.
 * Files are created at project root (not in a subdirectory).
 */
export function getRalphDir(projectDir?: string): string {
  return projectDir ?? getCwd();
}

/**
 * Gets the specs directory path.
 */
export function getSpecsDir(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'specs');
}

/**
 * Gets the config file path (hidden file at project root).
 */
export function getConfigPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), '.ralph.json');
}

/**
 * Gets the implementation plan file path.
 */
export function getPlanPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'IMPLEMENTATION_PLAN.md');
}

/**
 * Gets the build prompt file path.
 */
export function getBuildPromptPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'PROMPT_build.md');
}

/**
 * Gets the plan prompt file path.
 */
export function getPlanPromptPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'PROMPT_plan.md');
}

/**
 * Gets the start prompt file path.
 */
export function getStartPromptPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'PROMPT_start.md');
}

/**
 * Gets the spec prompt file path.
 */
export function getSpecPromptPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'PROMPT_spec.md');
}

/**
 * Gets the audience prompt file path.
 */
export function getAudiencePromptPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'PROMPT_audience.md');
}

/**
 * Gets the AGENTS.md file path.
 */
export function getAgentsMdPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'AGENTS.md');
}

/**
 * Gets the AUDIENCE_JTBD.md file path.
 */
export function getAudienceJtbdPath(projectDir?: string): string {
  return join(projectDir ?? getCwd(), 'AUDIENCE_JTBD.md');
}
