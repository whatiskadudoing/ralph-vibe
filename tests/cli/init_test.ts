/**
 * @module tests/cli/init_test
 *
 * Tests for cli/init module.
 * Tests the createInitCommand function and command options.
 */

import { assertEquals, assertExists } from '@std/assert';
import { createInitCommand } from '../../src/cli/init.ts';

// ============================================================================
// Command Definition Tests
// ============================================================================

Deno.test('createInitCommand returns a Command object', () => {
  const command = createInitCommand();
  assertExists(command);
});

Deno.test('createInitCommand has correct description', () => {
  const command = createInitCommand();
  // Command description is accessed through getDescription
  const desc = command.getDescription();
  assertEquals(desc, 'Initialize a new Ralph project');
});

Deno.test('createInitCommand has --vibe option', () => {
  const command = createInitCommand();
  // Check that the command has options by checking the generated help
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertExists(vibeOption);
});

Deno.test('createInitCommand vibe option has correct description', () => {
  const command = createInitCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertEquals(vibeOption?.description, 'Vibe mode - automatically continue to subsequent steps');
});
