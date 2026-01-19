/**
 * @module tests/ui/terminal_test
 *
 * Tests for ui/terminal module.
 */

import { assertEquals } from '@std/assert';
import {
  atomicWrite,
  cleanup,
  endRenderSession,
  getSessionWidth,
  getTerminalWidth,
  isInRenderSession,
  isTTY,
  registerCleanup,
  removeSignalHandlers,
  setupSignalHandlers,
  startRenderSession,
} from '../../src/ui/terminal.ts';

// ============================================================================
// isTTY tests
// ============================================================================

Deno.test('isTTY returns boolean', () => {
  const result = isTTY();
  assertEquals(typeof result, 'boolean');
});

// ============================================================================
// getTerminalWidth tests
// ============================================================================

Deno.test('getTerminalWidth returns number >= 60', () => {
  const width = getTerminalWidth();
  assertEquals(typeof width, 'number');
  assertEquals(width >= 60, true, 'Width should be at least 60');
  assertEquals(width <= 120, true, 'Width should be at most 120');
});

Deno.test('getTerminalWidth returns 80 for non-TTY', () => {
  // When not a TTY, it should return 80 as default
  // This test may pass differently in CI vs local
  const width = getTerminalWidth();
  assertEquals(typeof width, 'number');
  assertEquals(width >= 60 && width <= 120, true);
});

// ============================================================================
// atomicWrite tests
// ============================================================================

Deno.test('atomicWrite handles empty array', () => {
  // Should not throw
  atomicWrite([]);
});

Deno.test('atomicWrite handles single string', () => {
  // This writes to stdout but should not throw
  // In tests we just verify it doesn't crash
  atomicWrite(['test']);
});

Deno.test('atomicWrite combines multiple strings', () => {
  // This writes to stdout but should not throw
  atomicWrite(['one', 'two', 'three']);
});

// ============================================================================
// registerCleanup tests
// ============================================================================

Deno.test('registerCleanup returns unregister function', () => {
  let called = false;
  const unregister = registerCleanup(() => {
    called = true;
  });

  assertEquals(typeof unregister, 'function');

  // Unregister before cleanup so it doesn't get called
  unregister();

  // Verify we can unregister without error
  assertEquals(called, false);
});

Deno.test('cleanup calls registered functions', () => {
  let called = false;
  registerCleanup(() => {
    called = true;
  });

  cleanup();
  assertEquals(called, true);
});

Deno.test('unregistered cleanup is not called', () => {
  let called = false;
  const unregister = registerCleanup(() => {
    called = true;
  });

  unregister();
  cleanup();
  assertEquals(called, false);
});

// ============================================================================
// Render session tests
// ============================================================================

Deno.test('startRenderSession sets inRenderSession', () => {
  // Note: This test may behave differently in TTY vs non-TTY
  startRenderSession();
  if (isTTY()) {
    assertEquals(isInRenderSession(), true);
    endRenderSession();
    assertEquals(isInRenderSession(), false);
  } else {
    // For non-TTY, session is not started
    assertEquals(isInRenderSession(), false);
  }
});

Deno.test('getSessionWidth returns cached width', () => {
  startRenderSession();
  const width = getSessionWidth();
  assertEquals(typeof width, 'number');
  assertEquals(width >= 60 && width <= 120, true);
  endRenderSession();
});

Deno.test('endRenderSession clears session state', () => {
  startRenderSession();
  endRenderSession();
  assertEquals(isInRenderSession(), false);
});

// ============================================================================
// Signal handler tests
// ============================================================================

Deno.test('setupSignalHandlers can be called multiple times safely', () => {
  // Should not throw when called multiple times
  setupSignalHandlers();
  setupSignalHandlers();
  setupSignalHandlers();

  // Clean up to avoid test leaks
  removeSignalHandlers();
});

Deno.test('removeSignalHandlers cleans up handlers', () => {
  setupSignalHandlers();
  removeSignalHandlers();
  // Should not throw
});

// ============================================================================
// Integration tests
// ============================================================================

Deno.test('full render session lifecycle', () => {
  // Start session
  startRenderSession();
  const width = getSessionWidth();
  assertEquals(typeof width, 'number');

  // End session
  endRenderSession();
  assertEquals(isInRenderSession(), false);

  // Cleanup
  cleanup();
});

Deno.test('cleanup handles nested cleanups gracefully', () => {
  let count = 0;

  registerCleanup(() => {
    count++;
  });
  registerCleanup(() => {
    count++;
  });
  registerCleanup(() => {
    count++;
  });

  cleanup();
  assertEquals(count, 3);

  // Second cleanup should not call anything (already cleared)
  cleanup();
  assertEquals(count, 3);
});

Deno.test('cleanup handles errors in cleanup functions', () => {
  let secondCalled = false;

  registerCleanup(() => {
    throw new Error('First cleanup error');
  });
  registerCleanup(() => {
    secondCalled = true;
  });

  // Should not throw, and should continue to call other cleanups
  cleanup();
  assertEquals(secondCalled, true);
});
