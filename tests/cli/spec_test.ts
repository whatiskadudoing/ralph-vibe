/**
 * @module tests/cli/spec_test
 *
 * Tests for cli/spec module.
 * Tests the createSpecCommand function and helper functions.
 */

import { assertEquals, assertExists } from '@std/assert';
import { createSpecCommand } from '../../src/cli/spec.ts';

// ============================================================================
// Command Definition Tests
// ============================================================================

Deno.test('createSpecCommand returns a Command object', () => {
  const command = createSpecCommand();
  assertExists(command);
});

Deno.test('createSpecCommand has correct description', () => {
  const command = createSpecCommand();
  const desc = command.getDescription();
  assertEquals(desc, 'Add a new feature spec via interview');
});

Deno.test('createSpecCommand has --feature option', () => {
  const command = createSpecCommand();
  const options = command.getOptions();
  const featureOption = options.find((opt) => opt.name === 'feature');
  assertExists(featureOption);
});

Deno.test('createSpecCommand feature option has correct flags', () => {
  const command = createSpecCommand();
  const options = command.getOptions();
  const featureOption = options.find((opt) => opt.name === 'feature');
  assertEquals(featureOption?.flags.includes('-f'), true);
  assertEquals(featureOption?.flags.includes('--feature'), true);
});

Deno.test('createSpecCommand has --vibe option', () => {
  const command = createSpecCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertExists(vibeOption);
});

Deno.test('createSpecCommand vibe option has correct description', () => {
  const command = createSpecCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertEquals(vibeOption?.description, 'Vibe mode - automatically continue to subsequent steps');
});

// ============================================================================
// formatDuration Helper Tests (via module internals)
// ============================================================================

// Note: formatDuration is not exported, so we test it indirectly through the
// command's behavior. For direct testing, it would need to be exported.

// We could extract formatDuration to a shared utils module for better testability.
// For now, we test the command's options and structure.
