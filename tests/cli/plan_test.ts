/**
 * @module tests/cli/plan_test
 *
 * Tests for cli/plan module.
 * Tests the createPlanCommand function and command options.
 */

import { assertEquals, assertExists } from '@std/assert';
import { createPlanCommand } from '../../src/cli/plan.ts';

// ============================================================================
// Command Definition Tests
// ============================================================================

Deno.test('createPlanCommand returns a Command object', () => {
  const command = createPlanCommand();
  assertExists(command);
});

Deno.test('createPlanCommand has correct description', () => {
  const command = createPlanCommand();
  const desc = command.getDescription();
  assertEquals(desc, 'Generate implementation plan from specs (gap analysis)');
});

Deno.test('createPlanCommand has --model option', () => {
  const command = createPlanCommand();
  const options = command.getOptions();
  const modelOption = options.find((opt) => opt.name === 'model');
  assertExists(modelOption);
});

Deno.test('createPlanCommand model option accepts string', () => {
  const command = createPlanCommand();
  const options = command.getOptions();
  const modelOption = options.find((opt) => opt.name === 'model');
  // Option should accept string value
  assertEquals(modelOption?.args !== undefined, true);
});

Deno.test('createPlanCommand has --vibe option', () => {
  const command = createPlanCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertExists(vibeOption);
});

Deno.test('createPlanCommand vibe option has correct description', () => {
  const command = createPlanCommand();
  const options = command.getOptions();
  const vibeOption = options.find((opt) => opt.name === 'vibe');
  assertEquals(vibeOption?.description, 'Vibe mode - automatically continue to subsequent steps');
});
