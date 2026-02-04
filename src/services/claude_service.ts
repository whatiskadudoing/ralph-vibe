/**
 * @module services/claude_service
 *
 * Claude CLI integration.
 * Handles calling the Claude CLI and parsing responses.
 */

import { err, ok, type Result } from '@/utils/result.ts';
import { flatMapTE, type TaskEither, taskEitherLeft, tryCatchTE } from '@/utils/fp.ts';
import { exists, getSpecsDir, listDirectory, readTextFile } from './file_service.ts';
import { join } from '@std/path';

// ============================================================================
// Types
// ============================================================================

export interface ClaudeError {
  readonly type: 'claude_error';
  readonly code: 'not_found' | 'execution_failed' | 'parse_error' | 'timeout';
  readonly message: string;
}

export interface ClaudeStreamEvent {
  readonly type: 'system' | 'assistant' | 'user' | 'result';
  readonly data: unknown;
}

export interface ClaudeRunOptions {
  /** The prompt to send. */
  readonly prompt: string;
  /** Model to use. Default: 'opus'. */
  readonly model?: 'opus' | 'sonnet';
  /** Skip permission prompts. Default: true. */
  readonly skipPermissions?: boolean;
  /** Working directory. Default: cwd. */
  readonly cwd?: string;
  /** Timeout in milliseconds. Default: none. */
  readonly timeout?: number;
  /** Session ID to create a new session with. */
  readonly sessionId?: string;
  /** Session ID to resume from. */
  readonly resumeSessionId?: string;
  /** Fork from the resumed session instead of continuing it. */
  readonly forkSession?: boolean;
}

export interface ToolUse {
  readonly name: string;
  readonly input: Record<string, unknown>;
  /** For Task tool, which model the subagent uses */
  readonly subagentModel?: 'opus' | 'sonnet' | 'haiku';
}

export interface ParsedMessage {
  readonly text?: string;
  readonly toolUse?: ToolUse;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Creates a ClaudeError.
 *
 * @pure No side effects - creates an error object
 *
 * This is an error factory function following the pattern used throughout the codebase.
 * Error factories create structured error objects with a discriminant `type` field
 * for type-safe error handling using Result types.
 *
 * @param code - The error code indicating the type of Claude API failure
 * @param message - A human-readable error message
 * @returns A structured ClaudeError object
 *
 * @example
 * const error = claudeError('auth_error', 'Invalid API key');
 * // Returns: { type: 'claude_error', code: 'auth_error', message: 'Invalid API key' }
 */
function claudeError(code: ClaudeError['code'], message: string): ClaudeError {
  return { type: 'claude_error', code, message };
}

// ============================================================================
// Impure Functions - CLI Detection
// ============================================================================

/**
 * Checks if the Claude CLI is installed and available.
 *
 * @impure Executes external command
 */
export async function isClaudeInstalled(): Promise<boolean> {
  try {
    const command = new Deno.Command('claude', {
      args: ['--version'],
      stdout: 'null',
      stderr: 'null',
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Gets the Claude CLI version.
 *
 * @impure Executes external command
 */
export async function getClaudeVersion(): Promise<Result<string, ClaudeError>> {
  try {
    const command = new Deno.Command('claude', {
      args: ['--version'],
      stdout: 'piped',
      stderr: 'piped',
    });
    const { success, stdout } = await command.output();

    if (!success) {
      return err(claudeError('not_found', 'Claude CLI not found'));
    }

    const version = new TextDecoder().decode(stdout).trim();
    return ok(version);
  } catch {
    return err(claudeError('not_found', 'Claude CLI not found'));
  }
}

/**
 * Gets the Claude CLI version (TaskEither version).
 * Returns TaskEither<ClaudeError, string>.
 *
 * @impure Executes external command
 */
export function getClaudeVersionTE(): TaskEither<ClaudeError, string> {
  return tryCatchTE(
    async () => {
      const command = new Deno.Command('claude', {
        args: ['--version'],
        stdout: 'piped',
        stderr: 'piped',
      });
      const { success, stdout } = await command.output();

      if (!success) {
        throw new Error('Claude CLI not found');
      }

      return new TextDecoder().decode(stdout).trim();
    },
    () => claudeError('not_found', 'Claude CLI not found'),
  );
}

// ============================================================================
// Pure Functions - Argument Building & Parsing
// ============================================================================

/**
 * Builds the Claude CLI command arguments.
 *
 * @pure No side effects - transforms options to argument array
 */
export function buildClaudeArgs(options: ClaudeRunOptions): string[] {
  const args: string[] = ['-p']; // Print mode

  if (options.skipPermissions !== false) {
    args.push('--dangerously-skip-permissions');
  }

  args.push('--output-format', 'stream-json');
  args.push('--verbose');

  if (options.model) {
    args.push('--model', options.model);
  }

  // Session management for prompt caching
  if (options.sessionId) {
    // Create a new session with this ID
    args.push('--session-id', options.sessionId);
  } else if (options.resumeSessionId) {
    // Resume from an existing session
    args.push('--resume', options.resumeSessionId);
    if (options.forkSession) {
      // Fork instead of continuing (creates a new branch from cached context)
      args.push('--fork-session');
    }
  }

  // The prompt is passed via stdin, not as an argument
  return args;
}

/**
 * Parses a stream-json line from Claude output.
 *
 * @pure No side effects - parses input string to event object
 */
export function parseStreamLine(line: string): ClaudeStreamEvent | null {
  if (!line.trim()) return null;

  try {
    const data = JSON.parse(line);
    const type = data.type as string;

    if (['system', 'assistant', 'user', 'result'].includes(type)) {
      return { type: type as ClaudeStreamEvent['type'], data };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts text and tool use from an assistant message.
 *
 * @pure No side effects - parses event to message array
 */
export function parseAssistantMessage(event: ClaudeStreamEvent): ParsedMessage[] {
  if (event.type !== 'assistant') return [];

  const data = event.data as Record<string, unknown>;
  const message = data.message as Record<string, unknown> | undefined;
  if (!message) return [];

  const content = message.content as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(content)) return [];

  const results: ParsedMessage[] = [];

  for (const item of content) {
    if (item.type === 'text' && typeof item.text === 'string') {
      results.push({ text: item.text });
    } else if (item.type === 'tool_use' && typeof item.name === 'string') {
      const input = (item.input as Record<string, unknown>) ?? {};

      // Extract subagent model from Task tool
      let subagentModel: 'opus' | 'sonnet' | 'haiku' | undefined;
      if (item.name === 'Task' && typeof input.model === 'string') {
        const model = input.model.toLowerCase();
        if (model === 'opus' || model === 'sonnet' || model === 'haiku') {
          subagentModel = model;
        }
      }

      results.push({
        toolUse: {
          name: item.name,
          input,
          subagentModel,
        },
      });
    }
  }

  return results;
}

/**
 * Checks if the output contains an EXIT_SIGNAL.
 *
 * @pure No side effects - string search only
 */
export function hasExitSignal(output: string): boolean {
  return output.includes('EXIT_SIGNAL: true');
}

/**
 * Formats a tool use for display.
 *
 * @impure Accesses Deno.cwd() and Deno.env for path formatting
 */
export function formatToolUse(toolUse: ToolUse): string {
  const { name, input } = toolUse;

  switch (name) {
    case 'Read': {
      const path = input.file_path as string | undefined;
      return path ? `Read: ${formatPath(path)}` : 'Read';
    }
    case 'Edit':
    case 'Write': {
      const path = input.file_path as string | undefined;
      return path ? `${name}: ${formatPath(path)}` : name;
    }
    case 'Bash': {
      const cmd = input.command as string | undefined;
      return cmd ? `Bash: ${formatBashCommand(cmd)}` : 'Bash';
    }
    case 'Glob': {
      const pattern = input.pattern as string | undefined;
      return pattern ? `Glob: ${pattern}` : 'Glob';
    }
    case 'Grep': {
      const pattern = input.pattern as string | undefined;
      return pattern ? `Grep: ${pattern}` : 'Grep';
    }
    case 'Task': {
      const desc = input.description as string | undefined;
      return desc ? `Task: ${desc}` : 'Task';
    }
    default:
      return name;
  }
}

/**
 * Gets the file name from a path.
 *
 * @pure No side effects - string manipulation only
 */
function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Formats a path for display - converts absolute paths to relative.
 *
 * @impure Accesses Deno.cwd()
 */
function formatPath(path: string): string {
  const cwd = Deno.cwd();
  if (path.startsWith(cwd + '/')) {
    return path.slice(cwd.length + 1); // Remove cwd prefix + slash
  }
  if (path.startsWith(cwd)) {
    return path.slice(cwd.length);
  }
  // For paths outside cwd, show just filename
  return getFileName(path);
}

/**
 * Formats a bash command for display - makes paths relative.
 *
 * @impure Accesses Deno.cwd() and Deno.env
 */
function formatBashCommand(cmd: string): string {
  const cwd = Deno.cwd();
  // Replace absolute cwd paths with relative ones
  let formatted = cmd.replace(new RegExp(cwd + '/', 'g'), '');
  formatted = formatted.replace(new RegExp(cwd, 'g'), '.');
  // Also handle common home directory paths
  const home = Deno.env.get('HOME');
  if (home && formatted.includes(home)) {
    formatted = formatted.replace(new RegExp(home, 'g'), '~');
  }
  return truncate(formatted, 45);
}

/**
 * Truncates a string with ellipsis.
 *
 * @pure No side effects - string manipulation only
 */
function truncate(str: string, maxLength: number): string {
  const firstLine = str.split('\n')[0] ?? str;
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// Impure Functions - CLI Execution
// ============================================================================

/**
 * Creates a Claude runner that streams output.
 * Returns an async generator of parsed events.
 *
 * @impure Spawns external process, performs I/O
 */
export async function* runClaude(
  options: ClaudeRunOptions,
): AsyncGenerator<ClaudeStreamEvent, void, unknown> {
  const args = buildClaudeArgs(options);

  const command = new Deno.Command('claude', {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
    cwd: options.cwd,
  });

  const process = command.spawn();

  // Write prompt to stdin
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(options.prompt));
  await writer.close();

  // Read stdout line by line
  const reader = process.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const event = parseStreamLine(line);
        if (event) {
          yield event;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const event = parseStreamLine(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }

  await process.status;
}

// ============================================================================
// Base Session Management
// ============================================================================

export interface BaseSessionContext {
  /** Session ID for forking */
  readonly sessionId: string;
  /** List of spec files loaded */
  readonly specs: string[];
  /** Snapshot of spec file modification times (for change detection) */
  readonly specsMtimes: Map<string, number>;
}

/**
 * Converts an array of spec file entries to a Map.
 * Pure helper function for spec processing.
 *
 * @pure No side effects - data transformation only
 *
 * @param entries - Array of [filename, content] tuples
 * @returns Map of filename to content
 */
export function specFilesToMap(entries: readonly [string, string][]): Map<string, string> {
  return new Map(entries);
}

/**
 * Loads all specs from the specs/ directory.
 *
 * @impure Performs file I/O
 */
async function loadSpecs(): Promise<Map<string, string>> {
  const specs = new Map<string, string>();
  const specsDir = getSpecsDir();

  if (!(await exists(specsDir))) {
    return specs;
  }

  const result = await listDirectory(specsDir);
  if (!result.ok) {
    return specs;
  }

  for (const file of result.value) {
    if (file.endsWith('.md')) {
      const content = await readTextFile(join(specsDir, file));
      if (content.ok) {
        specs.set(file, content.value);
      }
    }
  }

  return specs;
}

/**
 * Gets modification times for all spec files.
 * Used for detecting spec changes between iterations.
 *
 * @impure Performs file I/O via Deno.stat
 */
async function getSpecMtimes(): Promise<Map<string, number>> {
  const mtimes = new Map<string, number>();
  const specsDir = getSpecsDir();

  if (!(await exists(specsDir))) {
    return mtimes;
  }

  const result = await listDirectory(specsDir);
  if (!result.ok) {
    return mtimes;
  }

  for (const file of result.value) {
    if (file.endsWith('.md')) {
      try {
        const stat = await Deno.stat(join(specsDir, file));
        mtimes.set(file, stat.mtime?.getTime() ?? 0);
      } catch {
        // File may have been deleted, skip it
      }
    }
  }

  return mtimes;
}

/**
 * Checks if specs have changed since the given snapshot.
 * Returns true if any spec was added, removed, or modified.
 *
 * @impure Performs file I/O via getSpecMtimes
 */
export async function haveSpecsChanged(snapshot: Map<string, number>): Promise<boolean> {
  const current = await getSpecMtimes();

  // Check for added or removed files
  if (current.size !== snapshot.size) {
    return true;
  }

  // Check for modified files
  for (const [file, mtime] of current) {
    const snapshotMtime = snapshot.get(file);
    if (snapshotMtime === undefined || snapshotMtime !== mtime) {
      return true;
    }
  }

  return false;
}

/**
 * Builds the base context prompt with all specs.
 * AGENTS.md is NOT cached because it can be updated during iterations.
 * This creates a "brain" that Claude can fork from.
 *
 * @pure No side effects - string building only
 */
function buildBaseContextPrompt(specs: Map<string, string>): string {
  const lines: string[] = [
    '# 🍺 Ralph Base Context',
    '',
    'This session contains all project specifications.',
    'Each iteration will fork from this cached context.',
    '',
    '---',
    '',
  ];

  // Add specs
  if (specs.size > 0) {
    lines.push('## Project Specifications');
    lines.push('');

    for (const [name, content] of specs.entries()) {
      lines.push(`### ${name}`);
      lines.push('');
      lines.push(content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  lines.push('## Ready');
  lines.push('');
  lines.push(
    'Specs loaded. AGENTS.md and IMPLEMENTATION_PLAN.md will be read fresh each iteration.',
  );
  lines.push('');
  lines.push('Reply with: "🍺 Context cached. Ready to vibe."');

  return lines.join('\n');
}

/**
 * Initializes a base session with all specs loaded.
 * AGENTS.md is NOT cached - it's read fresh each iteration (can be updated).
 * Returns the session ID that can be used to fork subsequent iterations.
 *
 * @impure Performs file I/O and spawns external process
 */
export async function initializeBaseSession(
  model: 'opus' | 'sonnet' = 'opus',
): Promise<Result<BaseSessionContext, ClaudeError>> {
  // Load specs only (AGENTS.md is read fresh each iteration)
  const specs = await loadSpecs();

  if (specs.size === 0) {
    return err(claudeError('execution_failed', 'No specs found. Nothing to cache.'));
  }

  // Capture spec mtimes for change detection
  const specsMtimes = await getSpecMtimes();

  // Generate a unique session ID
  const sessionId = crypto.randomUUID();

  // Build the base context prompt
  const prompt = buildBaseContextPrompt(specs);

  // Create the base session
  const args = [
    '-p',
    '--dangerously-skip-permissions',
    '--output-format',
    'json',
    '--session-id',
    sessionId,
    '--model',
    model,
  ];

  const command = new Deno.Command('claude', {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });

  try {
    const process = command.spawn();

    // Write prompt to stdin
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(prompt));
    await writer.close();

    const output = await process.output();
    const status = await process.status;

    if (!status.success) {
      const stderr = new TextDecoder().decode(output.stderr);
      return err(claudeError('execution_failed', `Failed to create base session: ${stderr}`));
    }

    return ok({
      sessionId,
      specs: Array.from(specs.keys()),
      specsMtimes,
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    return err(claudeError('execution_failed', `Failed to create base session: ${errorMsg}`));
  }
}

/**
 * Initializes a base session with all specs loaded (TaskEither version).
 * AGENTS.md is NOT cached - it's read fresh each iteration (can be updated).
 * Returns TaskEither<ClaudeError, BaseSessionContext>.
 *
 * @impure Performs file I/O and spawns external process
 */
export function initializeBaseSessionTE(
  model: 'opus' | 'sonnet' = 'opus',
): TaskEither<ClaudeError, BaseSessionContext> {
  // Load specs first
  const loadSpecsTE: TaskEither<ClaudeError, Map<string, string>> = tryCatchTE(
    () => loadSpecs(),
    (e) =>
      claudeError(
        'execution_failed',
        `Failed to load specs: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ),
  );

  // Chain the operations
  return flatMapTE((specs: Map<string, string>) => {
    // Validate specs are not empty
    if (specs.size === 0) {
      return taskEitherLeft<ClaudeError, BaseSessionContext>(
        claudeError('execution_failed', 'No specs found. Nothing to cache.'),
      );
    }

    // Build session with specs
    return tryCatchTE(
      async () => {
        // Capture spec mtimes for change detection
        const specsMtimes = await getSpecMtimes();

        // Generate a unique session ID
        const sessionId = crypto.randomUUID();

        // Build the base context prompt
        const prompt = buildBaseContextPrompt(specs);

        // Create the base session
        const args = [
          '-p',
          '--dangerously-skip-permissions',
          '--output-format',
          'json',
          '--session-id',
          sessionId,
          '--model',
          model,
        ];

        const command = new Deno.Command('claude', {
          args,
          stdin: 'piped',
          stdout: 'piped',
          stderr: 'piped',
        });

        const process = command.spawn();

        // Write prompt to stdin
        const writer = process.stdin.getWriter();
        await writer.write(new TextEncoder().encode(prompt));
        await writer.close();

        const output = await process.output();
        const status = await process.status;

        if (!status.success) {
          const stderr = new TextDecoder().decode(output.stderr);
          throw new Error(`Failed to create base session: ${stderr}`);
        }

        return {
          sessionId,
          specs: Array.from(specs.keys()),
          specsMtimes,
        };
      },
      (e) => claudeError('execution_failed', e instanceof Error ? e.message : 'Unknown error'),
    );
  })(loadSpecsTE);
}
