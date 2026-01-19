/**
 * @module ui/terminal
 *
 * Centralized terminal state management for preventing output corruption.
 * Handles TTY detection, signal handling, atomic writes, and cleanup.
 */

// ============================================================================
// Types
// ============================================================================

/** Callback for cleanup functions */
type CleanupFn = () => void;

/** Terminal state tracking */
interface TerminalState {
  /** Whether we've saved the cursor position */
  cursorSaved: boolean;
  /** Whether the cursor is currently hidden */
  cursorHidden: boolean;
  /** Whether we're currently in a render session */
  inRenderSession: boolean;
  /** Cached terminal width for consistent rendering */
  sessionWidth: number;
  /** Active cleanup functions */
  cleanupFns: Set<CleanupFn>;
  /** Whether signal handlers have been set up */
  signalsSetup: boolean;
  /** Whether we're on Windows (limited signal support) */
  isWindows: boolean;
}

// ============================================================================
// State
// ============================================================================

const encoder = new TextEncoder();

const state: TerminalState = {
  cursorSaved: false,
  cursorHidden: false,
  inRenderSession: false,
  sessionWidth: 80,
  cleanupFns: new Set(),
  signalsSetup: false,
  isWindows: Deno.build.os === 'windows',
};

// ============================================================================
// ANSI Escape Sequences
// ============================================================================

const ANSI = {
  /** Save cursor position */
  saveCursor: '\x1b[s',
  /** Restore cursor position */
  restoreCursor: '\x1b[u',
  /** Hide cursor */
  hideCursor: '\x1b[?25l',
  /** Show cursor */
  showCursor: '\x1b[?25h',
  /** Clear line */
  clearLine: '\x1b[2K',
  /** Move cursor up N lines */
  cursorUp: (n: number) => `\x1b[${n}A`,
  /** Move cursor to column N */
  cursorColumn: (n: number) => `\x1b[${n}G`,
  /** Move cursor to beginning of line */
  cursorBeginning: '\r',
} as const;

// ============================================================================
// TTY Detection
// ============================================================================

/**
 * Checks if stdout is a TTY (terminal).
 * Returns false for piped output or redirected output.
 */
export function isTTY(): boolean {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/**
 * Gets the current terminal width.
 * Returns fallback value for non-TTY or on error.
 */
export function getTerminalWidth(): number {
  try {
    const { columns } = Deno.consoleSize();
    return Math.max(60, Math.min(columns, 120)); // Clamp between 60-120
  } catch {
    return 80; // Default fallback
  }
}

/**
 * Gets the cached session width for consistent rendering.
 * Call startRenderSession() to cache the width.
 */
export function getSessionWidth(): number {
  return state.sessionWidth;
}

// ============================================================================
// Atomic Writes
// ============================================================================

/**
 * Writes multiple strings to stdout in a single syscall.
 * This prevents visual artifacts from interrupted writes.
 */
export function atomicWrite(parts: string[]): void {
  if (parts.length === 0) return;
  const combined = parts.join('');
  Deno.stdout.writeSync(encoder.encode(combined));
}

/**
 * Writes a single string to stdout.
 */
export function write(text: string): void {
  Deno.stdout.writeSync(encoder.encode(text));
}

// ============================================================================
// Cursor Control
// ============================================================================

/**
 * Saves the current cursor position.
 * Use restoreCursor() to return to this position.
 */
export function saveCursor(): void {
  if (!isTTY()) return;
  write(ANSI.saveCursor);
  state.cursorSaved = true;
}

/**
 * Restores the cursor to the previously saved position.
 */
export function restoreCursor(): void {
  if (!isTTY()) return;
  write(ANSI.restoreCursor);
}

/**
 * Hides the cursor.
 * Automatically shown on cleanup.
 */
export function hideCursor(): void {
  if (!isTTY()) return;
  write(ANSI.hideCursor);
  state.cursorHidden = true;
}

/**
 * Shows the cursor.
 */
export function showCursor(): void {
  if (!isTTY()) return;
  write(ANSI.showCursor);
  state.cursorHidden = false;
}

/**
 * Moves cursor up N lines.
 */
export function cursorUp(lines: number): void {
  if (!isTTY() || lines <= 0) return;
  write(ANSI.cursorUp(lines));
}

/**
 * Clears the current line.
 */
export function clearLine(): void {
  if (!isTTY()) return;
  write(ANSI.clearLine);
}

/**
 * Clears N lines starting from current position.
 */
export function clearLines(count: number): void {
  if (!isTTY() || count <= 0) return;
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    lines.push(ANSI.clearLine + '\n');
  }
  atomicWrite(lines);
}

// ============================================================================
// Render Session Management
// ============================================================================

/**
 * Starts a render session.
 * Caches terminal width and saves cursor position.
 * Call endRenderSession() when done.
 */
export function startRenderSession(): void {
  if (!isTTY()) {
    state.inRenderSession = false;
    return;
  }

  state.sessionWidth = getTerminalWidth();
  state.inRenderSession = true;
  saveCursor();
}

/**
 * Ends the current render session.
 * Restores cursor and cleans up.
 */
export function endRenderSession(): void {
  if (!state.inRenderSession) return;

  if (state.cursorSaved) {
    restoreCursor();
  }
  if (state.cursorHidden) {
    showCursor();
  }

  state.inRenderSession = false;
  state.cursorSaved = false;
}

/**
 * Checks if we're currently in a render session.
 */
export function isInRenderSession(): boolean {
  return state.inRenderSession;
}

// ============================================================================
// Cleanup Registration
// ============================================================================

/**
 * Registers a cleanup function to be called on process exit or signal.
 * Returns a function to unregister.
 */
export function registerCleanup(fn: CleanupFn): () => void {
  state.cleanupFns.add(fn);
  return () => {
    state.cleanupFns.delete(fn);
  };
}

/**
 * Runs all registered cleanup functions.
 */
function runCleanups(): void {
  for (const fn of state.cleanupFns) {
    try {
      fn();
    } catch {
      // Ignore cleanup errors
    }
  }
  state.cleanupFns.clear();
}

/**
 * Performs terminal cleanup - shows cursor, clears render area.
 * Called automatically on signals and process exit.
 */
export function cleanup(): void {
  // Run registered cleanups first
  runCleanups();

  if (!isTTY()) return;

  // End any active render session
  if (state.inRenderSession) {
    endRenderSession();
  }

  // Ensure cursor is visible
  if (state.cursorHidden) {
    showCursor();
  }

  // Reset state
  state.cursorSaved = false;
  state.cursorHidden = false;
  state.inRenderSession = false;
}

// ============================================================================
// Signal Handlers
// ============================================================================

/**
 * Handles SIGWINCH (terminal resize).
 * Updates cached terminal width if in a render session.
 */
function handleResize(): void {
  if (state.inRenderSession) {
    // Don't update sessionWidth mid-session to avoid layout jumps
    // The next render session will pick up the new size
  }
}

/**
 * Handles SIGCONT (resume from suspend).
 * Re-establishes terminal state after Ctrl+Z -> fg.
 */
function handleResume(): void {
  if (!isTTY()) return;

  // Terminal state may be corrupted after suspend
  // Force show cursor in case it was hidden
  showCursor();

  // If we were in a render session, we need to handle it
  // The render area may have scrolled or been overwritten
  if (state.inRenderSession) {
    // Re-save cursor at current position
    // The next render() call will work from here
    saveCursor();
  }
}

/**
 * Handles SIGINT (Ctrl+C) and SIGTERM.
 * Cleans up and exits gracefully.
 */
function handleTerminate(): void {
  cleanup();
  // Don't call Deno.exit() here - let the process handle it naturally
}

/**
 * Sets up signal handlers for proper terminal cleanup.
 * Safe to call multiple times - only sets up once.
 */
export function setupSignalHandlers(): void {
  if (state.signalsSetup) return;
  state.signalsSetup = true;

  // Windows has limited signal support
  if (state.isWindows) {
    // Only SIGINT is supported on Windows
    try {
      Deno.addSignalListener('SIGINT', handleTerminate);
    } catch {
      // Ignore - signals may not be available
    }
    return;
  }

  // Unix signals
  try {
    Deno.addSignalListener('SIGINT', handleTerminate);
  } catch {
    // Ignore
  }

  try {
    Deno.addSignalListener('SIGTERM', handleTerminate);
  } catch {
    // Ignore
  }

  try {
    Deno.addSignalListener('SIGWINCH', handleResize);
  } catch {
    // Ignore
  }

  try {
    Deno.addSignalListener('SIGCONT', handleResume);
  } catch {
    // Ignore
  }
}

/**
 * Removes signal handlers.
 * Call this when the application is done with terminal operations.
 */
export function removeSignalHandlers(): void {
  if (!state.signalsSetup) return;

  if (state.isWindows) {
    try {
      Deno.removeSignalListener('SIGINT', handleTerminate);
    } catch {
      // Ignore
    }
    state.signalsSetup = false;
    return;
  }

  try {
    Deno.removeSignalListener('SIGINT', handleTerminate);
  } catch {
    // Ignore
  }

  try {
    Deno.removeSignalListener('SIGTERM', handleTerminate);
  } catch {
    // Ignore
  }

  try {
    Deno.removeSignalListener('SIGWINCH', handleResize);
  } catch {
    // Ignore
  }

  try {
    Deno.removeSignalListener('SIGCONT', handleResume);
  } catch {
    // Ignore
  }

  state.signalsSetup = false;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes terminal management.
 * Sets up signal handlers and registers exit cleanup.
 * Safe to call multiple times.
 */
export function initTerminal(): void {
  setupSignalHandlers();

  // Register global unload handler for cleanup
  globalThis.addEventListener('unload', () => {
    cleanup();
  });
}
