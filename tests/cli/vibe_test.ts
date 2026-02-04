/**
 * @module tests/cli/vibe_test
 *
 * Tests for cli/vibe module.
 * Tests vibe mode state, flow order, and loop state management.
 */

import { assertEquals, assertExists } from '@std/assert';
import {
  enableVibeMode,
  getNextCommands,
  getVibeLoopState,
  initializeVibeLoop,
  isVibeMode,
  setVibeLoopEnv,
  type VibeLoopState,
} from '../../src/cli/vibe.ts';
import { DEFAULT_WORK } from '../../src/core/config.ts';

// ============================================================================
// Helper to reset vibe state
// ============================================================================

// Since vibeMode is module-level state, we need to be careful about test isolation.
// Tests should be aware that vibeMode state persists across tests.

// ============================================================================
// getNextCommands Tests
// ============================================================================

Deno.test('getNextCommands - init returns start, research, plan, work', () => {
  const next = getNextCommands('init');
  assertEquals(next, ['start', 'research', 'plan', 'work']);
});

Deno.test('getNextCommands - start returns research, plan, work', () => {
  const next = getNextCommands('start');
  assertEquals(next, ['research', 'plan', 'work']);
});

Deno.test('getNextCommands - spec returns research, plan, work', () => {
  const next = getNextCommands('spec');
  assertEquals(next, ['research', 'plan', 'work']);
});

Deno.test('getNextCommands - research returns plan, work', () => {
  const next = getNextCommands('research');
  assertEquals(next, ['plan', 'work']);
});

Deno.test('getNextCommands - plan returns work', () => {
  const next = getNextCommands('plan');
  assertEquals(next, ['work']);
});

Deno.test('getNextCommands - work returns empty array', () => {
  const next = getNextCommands('work');
  assertEquals(next, []);
});

Deno.test('getNextCommands - unknown command returns empty array', () => {
  const next = getNextCommands('unknown');
  assertEquals(next, []);
});

// ============================================================================
// Vibe Loop State Tests
// ============================================================================

Deno.test('initializeVibeLoop creates correct env vars', () => {
  const maxIterations = 5;
  const env = initializeVibeLoop(maxIterations);

  assertEquals(env['RALPH_VIBE_MODE'], '1');
  assertEquals(env['RALPH_SLC_ITERATION'], '1');
  assertEquals(env['RALPH_MAX_SLC_ITERATIONS'], '5');
});

Deno.test('initializeVibeLoop uses provided max iterations', () => {
  const env = initializeVibeLoop(10);
  assertEquals(env['RALPH_MAX_SLC_ITERATIONS'], '10');
});

Deno.test('setVibeLoopEnv sets correct state', () => {
  const state: VibeLoopState = {
    slcIteration: 3,
    maxSlcIterations: 7,
  };

  const env = setVibeLoopEnv(state);

  assertEquals(env['RALPH_VIBE_MODE'], '1');
  assertEquals(env['RALPH_SLC_ITERATION'], '3');
  assertEquals(env['RALPH_MAX_SLC_ITERATIONS'], '7');
});

Deno.test('getVibeLoopState returns null when mode not set', () => {
  // Clear any existing env vars
  Deno.env.delete('RALPH_VIBE_MODE');
  Deno.env.delete('RALPH_SLC_ITERATION');
  Deno.env.delete('RALPH_MAX_SLC_ITERATIONS');

  const state = getVibeLoopState();
  assertEquals(state, null);
});

Deno.test('getVibeLoopState returns null when mode is not 1', () => {
  Deno.env.set('RALPH_VIBE_MODE', '0');

  const state = getVibeLoopState();
  assertEquals(state, null);

  // Cleanup
  Deno.env.delete('RALPH_VIBE_MODE');
});

Deno.test('getVibeLoopState returns state when env vars are set', () => {
  Deno.env.set('RALPH_VIBE_MODE', '1');
  Deno.env.set('RALPH_SLC_ITERATION', '2');
  Deno.env.set('RALPH_MAX_SLC_ITERATIONS', '8');

  const state = getVibeLoopState();

  assertExists(state);
  assertEquals(state?.slcIteration, 2);
  assertEquals(state?.maxSlcIterations, 8);

  // Cleanup
  Deno.env.delete('RALPH_VIBE_MODE');
  Deno.env.delete('RALPH_SLC_ITERATION');
  Deno.env.delete('RALPH_MAX_SLC_ITERATIONS');
});

Deno.test('getVibeLoopState defaults to 1 for iteration when not set', () => {
  Deno.env.set('RALPH_VIBE_MODE', '1');
  Deno.env.delete('RALPH_SLC_ITERATION');
  Deno.env.delete('RALPH_MAX_SLC_ITERATIONS');

  const state = getVibeLoopState();

  assertEquals(state?.slcIteration, 1);

  // Cleanup
  Deno.env.delete('RALPH_VIBE_MODE');
});

Deno.test('getVibeLoopState uses default maxSlcIterations from config', () => {
  Deno.env.set('RALPH_VIBE_MODE', '1');
  Deno.env.delete('RALPH_MAX_SLC_ITERATIONS');

  const state = getVibeLoopState();

  assertEquals(state?.maxSlcIterations, DEFAULT_WORK.maxSlcIterations);

  // Cleanup
  Deno.env.delete('RALPH_VIBE_MODE');
});

// ============================================================================
// Vibe Mode State Tests
// ============================================================================

// Note: These tests affect global state and may interfere with each other
// In production, you might want to use dependency injection for better isolation

Deno.test('enableVibeMode enables vibe mode', () => {
  enableVibeMode();
  assertEquals(isVibeMode(), true);
});
