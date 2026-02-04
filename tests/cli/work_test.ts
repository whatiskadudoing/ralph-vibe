/**
 * @module tests/cli/work_test
 *
 * Tests for cli/work module.
 * Tests the createWorkCommand function, status parsing, and helper functions.
 */

import { assertEquals, assertExists } from '@std/assert';
import { createWorkCommand } from '../../src/cli/work.ts';
import { DEFAULT_WORK } from '../../src/core/config.ts';

// ============================================================================
// Command Definition Tests
// ============================================================================

Deno.test('createWorkCommand returns a Command object', () => {
  const command = createWorkCommand();
  assertExists(command);
});

Deno.test('createWorkCommand has correct description', () => {
  const command = createWorkCommand();
  const desc = command.getDescription();
  assertEquals(desc, 'Run the autonomous build loop (implements tasks one by one)');
});

Deno.test('createWorkCommand has --max-iterations option', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const maxIterOption = options.find((opt) => opt.name === 'max-iterations');
  assertExists(maxIterOption);
});

Deno.test('createWorkCommand max-iterations has short flag -n', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const maxIterOption = options.find((opt) => opt.name === 'max-iterations');
  assertEquals(maxIterOption?.flags.includes('-n'), true);
});

Deno.test('createWorkCommand max-iterations has correct default', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const maxIterOption = options.find((opt) => opt.name === 'max-iterations');
  assertEquals(maxIterOption?.default, DEFAULT_WORK.maxIterations);
});

Deno.test('createWorkCommand has --dry-run option', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const dryRunOption = options.find((opt) => opt.name === 'dry-run');
  assertExists(dryRunOption);
});

Deno.test('createWorkCommand has --vibe option', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertExists(vibeOption);
});

Deno.test('createWorkCommand has --adaptive option', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const adaptiveOption = options.find((opt) => opt.name === 'adaptive');
  assertExists(adaptiveOption);
});

Deno.test('createWorkCommand adaptive option description mentions sonnet and opus', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const adaptiveOption = options.find((opt) => opt.name === 'adaptive');
  assertEquals(adaptiveOption?.description?.includes('sonnet'), true);
  assertEquals(adaptiveOption?.description?.includes('opus'), true);
});

Deno.test('createWorkCommand has --model option', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const modelOption = options.find((opt) => opt.name === 'model');
  assertExists(modelOption);
});

Deno.test('createWorkCommand model option description mentions opus and sonnet', () => {
  const command = createWorkCommand();
  const options = command.getOptions();
  const modelOption = options.find((opt) => opt.name === 'model');
  assertEquals(modelOption?.description?.includes('opus'), true);
  assertEquals(modelOption?.description?.includes('sonnet'), true);
});

// ============================================================================
// parseRalphStatus Tests (Testing via Export)
// ============================================================================

// Note: parseRalphStatus and parseStatusBlock are not exported from work.ts
// To enable unit testing, we need to export them or create a separate module.
// For now, we test these indirectly through integration tests.

// We can create a separate module (e.g., work_parser.ts) that exports these
// pure functions for direct testing.
