/**
 * @module utils/command
 *
 * Command execution utilities for running external commands.
 * Consolidates patterns from git_service.ts and claude_service.ts.
 *
 * @example
 * // Execute a command and get output
 * const result = await executeCommand('git', ['status']);
 * if (result.ok) {
 *   console.log(result.value.stdout);
 * }
 *
 * @example
 * // Execute quietly and check success
 * const success = await executeCommandQuiet('git', ['--version']);
 */

import { err, ok, type Result } from './result.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Error returned when command execution fails.
 */
export interface CommandError {
  readonly type: 'command_error';
  readonly code: 'not_found' | 'execution_failed' | 'timeout';
  readonly message: string;
  readonly stderr?: string;
  readonly exitCode?: number;
}

/**
 * Result of a successful command execution.
 */
export interface CommandOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * Options for command execution.
 */
export interface CommandOptions {
  /** Working directory for the command. */
  readonly cwd?: string;
  /** Timeout in milliseconds. If exceeded, command is killed. */
  readonly timeout?: number;
  /** Environment variables to add/override. */
  readonly env?: Record<string, string>;
  /** Input to write to stdin. */
  readonly stdin?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Creates a CommandError.
 *
 * This is an error factory function following the pattern used throughout the codebase.
 * Error factories create structured error objects with a discriminant `type` field
 * for type-safe error handling using Result types.
 *
 * @param code - The error code indicating the type of command execution failure
 * @param message - A human-readable error message
 * @param options - Optional additional error context (stderr output, exit code)
 * @returns A structured CommandError object
 *
 * @example
 * const error = commandError('execution_failed', 'Command exited with code 1', { exitCode: 1 });
 * // Returns: { type: 'command_error', code: 'execution_failed', message: '...', exitCode: 1 }
 */
function commandError(
  code: CommandError['code'],
  message: string,
  options?: { stderr?: string; exitCode?: number },
): CommandError {
  return {
    type: 'command_error',
    code,
    message,
    stderr: options?.stderr,
    exitCode: options?.exitCode,
  };
}

/**
 * Decodes bytes to string, handling empty arrays.
 */
function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Executes a command and returns stdout/stderr.
 *
 * Use this when you need to capture the output of a command.
 *
 * @param command - The command to execute (e.g., 'git', 'npm')
 * @param args - Arguments to pass to the command
 * @param options - Execution options (cwd, timeout, env, stdin)
 * @returns Result with stdout/stderr on success, CommandError on failure
 *
 * @example
 * const result = await executeCommand('git', ['branch', '--show-current']);
 * if (result.ok) {
 *   console.log('Current branch:', result.value.stdout.trim());
 * }
 */
export async function executeCommand(
  command: string,
  args: readonly string[],
  options: CommandOptions = {},
): Promise<Result<CommandOutput, CommandError>> {
  try {
    const cmd = new Deno.Command(command, {
      args: [...args],
      stdout: 'piped',
      stderr: 'piped',
      stdin: options.stdin !== undefined ? 'piped' : 'null',
      cwd: options.cwd,
      env: options.env ? { ...Deno.env.toObject(), ...options.env } : undefined,
    });

    const process = cmd.spawn();

    // Handle stdin if provided
    if (options.stdin !== undefined) {
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(options.stdin));
      await writer.close();
    }

    // Handle timeout if specified
    let timeoutId: number | undefined;
    let timedOut = false;

    if (options.timeout !== undefined) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          process.kill('SIGTERM');
        } catch {
          // Process may have already exited
        }
      }, options.timeout);
    }

    const output = await process.output();
    const status = await process.status;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (timedOut) {
      return err(
        commandError('timeout', `Command '${command}' timed out after ${options.timeout}ms`),
      );
    }

    const stdout = decode(output.stdout);
    const stderr = decode(output.stderr);

    if (!status.success) {
      return err(
        commandError(
          'execution_failed',
          `Command '${command}' failed with exit code ${status.code}`,
          {
            stderr,
            exitCode: status.code,
          },
        ),
      );
    }

    return ok({
      stdout,
      stderr,
      exitCode: status.code,
    });
  } catch (e) {
    // Command not found typically throws
    if (e instanceof Deno.errors.NotFound) {
      return err(commandError('not_found', `Command '${command}' not found`));
    }
    const message = e instanceof Error ? e.message : String(e);
    return err(commandError('execution_failed', message));
  }
}

/**
 * Executes a command quietly, returning only success/failure.
 *
 * Use this when you only need to know if a command succeeded,
 * not its output (e.g., checking if a tool is installed).
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options (cwd, timeout, env)
 * @returns true if command succeeded (exit code 0), false otherwise
 *
 * @example
 * const isGitInstalled = await executeCommandQuiet('git', ['--version']);
 */
export async function executeCommandQuiet(
  command: string,
  args: readonly string[],
  options: Omit<CommandOptions, 'stdin'> = {},
): Promise<boolean> {
  try {
    const cmd = new Deno.Command(command, {
      args: [...args],
      stdout: 'null',
      stderr: 'null',
      cwd: options.cwd,
      env: options.env ? { ...Deno.env.toObject(), ...options.env } : undefined,
    });

    // Handle timeout if specified
    if (options.timeout !== undefined) {
      const process = cmd.spawn();

      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          process.kill('SIGTERM');
        } catch {
          // Process may have already exited
        }
      }, options.timeout);

      const status = await process.status;
      clearTimeout(timeoutId);

      return !timedOut && status.success;
    }

    const { success } = await cmd.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Event emitted during streaming command execution.
 */
export interface StreamEvent {
  /** Type of stream event */
  readonly type: 'stdout' | 'stderr' | 'exit';
  /** Data for stdout/stderr events, exit code for exit event */
  readonly data: string | number;
}

/**
 * Executes a command with streaming output.
 *
 * Use this when you need to process output as it arrives,
 * rather than waiting for the command to complete.
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options (cwd, timeout, env, stdin)
 * @returns AsyncGenerator yielding stdout/stderr chunks and exit status
 *
 * @example
 * for await (const event of executeCommandStream('npm', ['install'])) {
 *   if (event.type === 'stdout') {
 *     console.log(event.data);
 *   } else if (event.type === 'exit') {
 *     console.log('Exited with code:', event.data);
 *   }
 * }
 */
export async function* executeCommandStream(
  command: string,
  args: readonly string[],
  options: CommandOptions = {},
): AsyncGenerator<StreamEvent, void, unknown> {
  const cmd = new Deno.Command(command, {
    args: [...args],
    stdout: 'piped',
    stderr: 'piped',
    stdin: options.stdin !== undefined ? 'piped' : 'null',
    cwd: options.cwd,
    env: options.env ? { ...Deno.env.toObject(), ...options.env } : undefined,
  });

  const process = cmd.spawn();

  // Handle stdin if provided
  if (options.stdin !== undefined) {
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(options.stdin));
    await writer.close();
  }

  // Set up timeout if specified
  let timeoutId: number | undefined;
  let timedOut = false;

  if (options.timeout !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        process.kill('SIGTERM');
      } catch {
        // Process may have already exited
      }
    }, options.timeout);
  }

  // Read stdout and stderr concurrently
  const stdoutReader = process.stdout.getReader();
  const stderrReader = process.stderr.getReader();
  const decoder = new TextDecoder();

  // Helper to read from a stream
  async function* readStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    type: 'stdout' | 'stderr',
  ): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield { type, data: decoder.decode(value, { stream: true }) };
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Interleave stdout and stderr
  // We collect events from both streams and yield them
  const stdoutGen = readStream(stdoutReader, 'stdout');
  const stderrGen = readStream(stderrReader, 'stderr');

  // Simple approach: alternate between streams
  // More sophisticated approaches could use Promise.race
  const events: StreamEvent[] = [];
  const stdoutDone = (async () => {
    for await (const event of stdoutGen) {
      events.push(event);
    }
  })();
  const stderrDone = (async () => {
    for await (const event of stderrGen) {
      events.push(event);
    }
  })();

  // Wait for both to complete
  await Promise.all([stdoutDone, stderrDone]);

  // Yield all collected events
  for (const event of events) {
    yield event;
  }

  // Wait for process to exit
  const status = await process.status;

  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }

  if (timedOut) {
    yield { type: 'exit', data: -1 };
  } else {
    yield { type: 'exit', data: status.code };
  }
}

/**
 * Checks if a command exists and is executable.
 *
 * @param command - The command to check
 * @returns true if the command exists
 *
 * @example
 * if (await commandExists('git')) {
 *   console.log('Git is installed');
 * }
 */
export async function commandExists(command: string): Promise<boolean> {
  // Try running with --version, --help, or just the command
  // Most commands support at least one of these
  return await executeCommandQuiet(command, ['--version']);
}

/**
 * Executes a command and returns only stdout on success.
 * Convenience wrapper around executeCommand for simple use cases.
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options
 * @returns stdout string on success, error on failure
 *
 * @example
 * const branch = await getCommandOutput('git', ['branch', '--show-current']);
 * if (branch.ok) {
 *   console.log('Branch:', branch.value.trim());
 * }
 */
export async function getCommandOutput(
  command: string,
  args: readonly string[],
  options: CommandOptions = {},
): Promise<Result<string, CommandError>> {
  const result = await executeCommand(command, args, options);
  if (result.ok) {
    return ok(result.value.stdout);
  }
  return result;
}
