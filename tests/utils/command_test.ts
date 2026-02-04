/**
 * @module tests/utils/command_test
 *
 * Tests for utils/command module.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import {
  type CommandError,
  commandExists,
  type CommandOutput,
  executeCommand,
  executeCommandQuiet,
  executeCommandStream,
  getCommandOutput,
  type StreamEvent,
} from '../../src/utils/command.ts';

// ============================================================================
// executeCommand tests
// ============================================================================

Deno.test('executeCommand returns stdout for successful command', async () => {
  const result = await executeCommand('echo', ['hello world']);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.stdout, 'hello world');
    assertEquals(result.value.exitCode, 0);
  }
});

Deno.test('executeCommand returns error for failed command', async () => {
  // Use a command that will definitely fail
  const result = await executeCommand('ls', ['--invalid-flag-that-does-not-exist']);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'command_error');
    assertEquals(result.error.code, 'execution_failed');
  }
});

Deno.test('executeCommand returns not_found for missing command', async () => {
  const result = await executeCommand('command_that_definitely_does_not_exist_12345', []);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, 'not_found');
  }
});

Deno.test('executeCommand respects working directory', async () => {
  const result = await executeCommand('pwd', [], { cwd: '/tmp' });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.stdout.trim(), 'tmp');
  }
});

Deno.test('executeCommand captures stderr', async () => {
  // Use a command that writes to stderr
  const result = await executeCommand('ls', ['--invalid-option-xyz']);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(typeof result.error.stderr, 'string');
  }
});

Deno.test('executeCommand handles empty output', async () => {
  // true command produces no output
  const result = await executeCommand('true', []);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.stdout, '');
    assertEquals(result.value.exitCode, 0);
  }
});

Deno.test('executeCommand handles stdin input', async () => {
  const result = await executeCommand('cat', [], { stdin: 'test input' });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.stdout, 'test input');
  }
});

Deno.test('executeCommand handles special characters in arguments', async () => {
  const result = await executeCommand('echo', ['hello "world" with $pecial chars!']);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.stdout, 'hello');
    assertStringIncludes(result.value.stdout, 'world');
  }
});

Deno.test('executeCommand handles multiline output', async () => {
  const result = await executeCommand('printf', ['line1\\nline2\\nline3']);

  assertEquals(result.ok, true);
  if (result.ok) {
    const lines = result.value.stdout.split('\n').filter((l) => l);
    assertEquals(lines.length, 3);
  }
});

Deno.test('executeCommand handles timeout', async () => {
  // Use a very short timeout with a command that takes time
  const result = await executeCommand('sleep', ['10'], { timeout: 100 });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, 'timeout');
  }
});

// ============================================================================
// executeCommandQuiet tests
// ============================================================================

Deno.test('executeCommandQuiet returns true for successful command', async () => {
  const success = await executeCommandQuiet('true', []);
  assertEquals(success, true);
});

Deno.test('executeCommandQuiet returns false for failed command', async () => {
  const success = await executeCommandQuiet('false', []);
  assertEquals(success, false);
});

Deno.test('executeCommandQuiet returns false for missing command', async () => {
  const success = await executeCommandQuiet('command_that_definitely_does_not_exist_12345', []);
  assertEquals(success, false);
});

Deno.test('executeCommandQuiet respects working directory', async () => {
  // Test in a valid directory
  const success = await executeCommandQuiet('pwd', [], { cwd: '/tmp' });
  assertEquals(success, true);
});

Deno.test('executeCommandQuiet handles timeout', async () => {
  const success = await executeCommandQuiet('sleep', ['10'], { timeout: 100 });
  assertEquals(success, false);
});

// ============================================================================
// executeCommandStream tests
// ============================================================================

Deno.test('executeCommandStream yields stdout events', async () => {
  const events: StreamEvent[] = [];

  for await (const event of executeCommandStream('echo', ['streaming test'])) {
    events.push(event);
  }

  // Should have at least one stdout event and one exit event
  const stdoutEvents = events.filter((e) => e.type === 'stdout');
  const exitEvents = events.filter((e) => e.type === 'exit');

  assertEquals(stdoutEvents.length >= 1, true);
  assertEquals(exitEvents.length, 1);

  // Check stdout content
  const stdout = stdoutEvents.map((e) => e.data).join('');
  assertStringIncludes(stdout, 'streaming test');

  // Check exit code
  assertEquals(exitEvents[0]?.data, 0);
});

Deno.test('executeCommandStream yields exit event with correct code', async () => {
  const events: StreamEvent[] = [];

  for await (const event of executeCommandStream('false', [])) {
    events.push(event);
  }

  const exitEvent = events.find((e) => e.type === 'exit');
  assertEquals(exitEvent?.type, 'exit');
  // false command exits with 1
  assertEquals(exitEvent?.data !== 0, true);
});

Deno.test('executeCommandStream handles empty output', async () => {
  const events: StreamEvent[] = [];

  for await (const event of executeCommandStream('true', [])) {
    events.push(event);
  }

  const exitEvent = events.find((e) => e.type === 'exit');
  assertEquals(exitEvent?.data, 0);
});

// ============================================================================
// commandExists tests
// ============================================================================

Deno.test('commandExists returns true for installed command', async () => {
  // echo should exist on all systems
  const exists = await commandExists('echo');
  assertEquals(exists, true);
});

Deno.test('commandExists returns false for missing command', async () => {
  const exists = await commandExists('command_that_definitely_does_not_exist_12345');
  assertEquals(exists, false);
});

// ============================================================================
// getCommandOutput tests
// ============================================================================

Deno.test('getCommandOutput returns stdout on success', async () => {
  const result = await getCommandOutput('echo', ['test output']);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value, 'test output');
  }
});

Deno.test('getCommandOutput returns error on failure', async () => {
  const result = await getCommandOutput('false', []);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'command_error');
  }
});

Deno.test('getCommandOutput respects working directory', async () => {
  const result = await getCommandOutput('pwd', [], { cwd: '/tmp' });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.trim(), 'tmp');
  }
});

// ============================================================================
// Edge cases and type tests
// ============================================================================

Deno.test('CommandError has correct structure', async () => {
  const result = await executeCommand('false', []);

  assertEquals(result.ok, false);
  if (!result.ok) {
    const error: CommandError = result.error;
    assertEquals(error.type, 'command_error');
    assertEquals(['not_found', 'execution_failed', 'timeout'].includes(error.code), true);
    assertEquals(typeof error.message, 'string');
  }
});

Deno.test('CommandOutput has correct structure', async () => {
  const result = await executeCommand('echo', ['test']);

  assertEquals(result.ok, true);
  if (result.ok) {
    const output: CommandOutput = result.value;
    assertEquals(typeof output.stdout, 'string');
    assertEquals(typeof output.stderr, 'string');
    assertEquals(typeof output.exitCode, 'number');
  }
});

Deno.test('executeCommand handles empty args array', async () => {
  const result = await executeCommand('pwd', []);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.stdout.length > 0, true);
  }
});

Deno.test('executeCommand handles many arguments', async () => {
  const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
  const result = await executeCommand('echo', args);

  assertEquals(result.ok, true);
  if (result.ok) {
    for (const arg of args) {
      assertStringIncludes(result.value.stdout, arg);
    }
  }
});

// ============================================================================
// Integration tests with real commands
// ============================================================================

Deno.test('executeCommand works with git (if installed)', async () => {
  const installed = await commandExists('git');
  if (!installed) {
    // Skip test if git is not installed
    return;
  }

  const result = await executeCommand('git', ['--version']);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.stdout.toLowerCase(), 'git');
  }
});

Deno.test('executeCommand works with deno', async () => {
  const result = await executeCommand('deno', ['--version']);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value.stdout.toLowerCase(), 'deno');
  }
});
