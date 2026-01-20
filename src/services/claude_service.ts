/**
 * @module services/claude_service
 *
 * Claude CLI integration.
 * Handles calling the Claude CLI and parsing responses.
 */

import { err, ok, type Result } from '@/utils/result.ts';
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
// Functions
// ============================================================================

/**
 * Creates a ClaudeError.
 */
function claudeError(code: ClaudeError['code'], message: string): ClaudeError {
  return { type: 'claude_error', code, message };
}

/**
 * Checks if the Claude CLI is installed and available.
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
 * Builds the Claude CLI command arguments.
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
 */
export function hasExitSignal(output: string): boolean {
  return output.includes('EXIT_SIGNAL: true');
}

/**
 * Formats a tool use for display.
 */
export function formatToolUse(toolUse: ToolUse): string {
  const { name, input } = toolUse;

  switch (name) {
    case 'Read': {
      const path = input.file_path as string | undefined;
      return path ? `Read: ${getFileName(path)}` : 'Read';
    }
    case 'Edit':
    case 'Write': {
      const path = input.file_path as string | undefined;
      return path ? `${name}: ${getFileName(path)}` : name;
    }
    case 'Bash': {
      const cmd = input.command as string | undefined;
      return cmd ? `Bash: ${truncate(cmd, 40)}` : 'Bash';
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
 */
function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Truncates a string with ellipsis.
 */
function truncate(str: string, maxLength: number): string {
  const firstLine = str.split('\n')[0] ?? str;
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength - 3) + '...';
}

/**
 * Creates a Claude runner that streams output.
 * Returns an async generator of parsed events.
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
 * Loads all specs from the specs/ directory.
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
  lines.push('Specs loaded. AGENTS.md and IMPLEMENTATION_PLAN.md will be read fresh each iteration.');
  lines.push('');
  lines.push('Reply with: "🍺 Context cached. Ready to vibe."');

  return lines.join('\n');
}

/**
 * Initializes a base session with all specs loaded.
 * AGENTS.md is NOT cached - it's read fresh each iteration (can be updated).
 * Returns the session ID that can be used to fork subsequent iterations.
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
    '--output-format', 'json',
    '--session-id', sessionId,
    '--model', model,
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
