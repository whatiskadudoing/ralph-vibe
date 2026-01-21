// deno-lint-ignore-file no-explicit-any
import React from "react";
import type { ReactNode } from "react";
import ansiEscapes from "ansi-escapes";
import { createNode, type DOMElement, type DOMNode, isTextNode } from "./dom.ts";
import { createReconciler } from "./reconciler.ts";
import { applyStyles, type Styles } from "./styles.ts";
import { renderToString } from "./render-node.ts";
import { loadYoga, type Yoga, type Node as YogaNode } from "./yoga.ts";
import stringWidth from "string-width";
import { createFocusManager } from "./focus-manager.ts";
import { createInputManager, parseKey } from "./hooks/use-input.ts";

/**
 * Clear to end of line escape sequence.
 * This clears from cursor to end of line without affecting scrollback.
 */
const CLEAR_TO_EOL = "\x1b[K";

/**
 * Erase entire line.
 */
const ERASE_LINE = "\x1b[2K";

/**
 * Move cursor up one line.
 */
const CURSOR_UP = "\x1b[1A";

/**
 * Move cursor to beginning of line.
 */
const CURSOR_TO_START = "\r";

/**
 * Enter alternate screen buffer (like vim/less).
 */
const ENTER_ALT_SCREEN = "\x1b[?1049h";

/**
 * Exit alternate screen buffer and restore original screen.
 */
const EXIT_ALT_SCREEN = "\x1b[?1049l";

/**
 * Move cursor to home position (top-left).
 */
const CURSOR_HOME = "\x1b[H";

/**
 * Clear entire screen.
 */
const CLEAR_SCREEN = "\x1b[2J";

/**
 * Erase lines from current position upward.
 * This mimics log-update/ansi-escapes eraseLines behavior.
 * After erasing, cursor is at the beginning of the topmost erased line.
 */
function eraseLines(count: number): string {
  if (count <= 0) return "";

  let result = "";
  for (let i = 0; i < count; i++) {
    result += ERASE_LINE; // Erase current line
    if (i < count - 1) {
      result += CURSOR_UP; // Move up (except on last iteration)
    }
  }
  result += CURSOR_TO_START; // Return to start of line
  return result;
}
import { InkProvider } from "./components/InkProvider.tsx";
import type { AppContextValue } from "./contexts/app-context.ts";
import type { StdoutContextValue, StderrContextValue, StdinContextValue } from "./contexts/std-context.ts";
import type { AccessibilityContextValue } from "./contexts/accessibility-context.ts";
import { isCI, isInteractive } from "./ci.ts";
import { patchConsole, type PatchedConsole } from "./console-patch.ts";

export interface InkOptions {
  stdout?: typeof Deno.stdout;
  stdin?: typeof Deno.stdin;
  /**
   * Custom stderr stream.
   */
  stderr?: typeof Deno.stderr;
  exitOnCtrlC?: boolean;
  debug?: boolean;
  /**
   * Maximum frames per second for rendering.
   * @default 60
   */
  maxFps?: number;
  /**
   * Patch console methods (log, warn, error) to prevent output mixing.
   * When enabled, console output is buffered and flushed on unmount.
   * @default true
   */
  patchConsole?: boolean;
  /**
   * Enable screen reader support mode.
   * Can also be enabled via INK_SCREEN_READER=1 environment variable.
   * @default false
   */
  isScreenReaderEnabled?: boolean;
  /**
   * Callback called after each render with timing information.
   */
  onRender?: (info: { renderTime: number }) => void;
  /**
   * Use alternate screen buffer for full-screen apps.
   * When enabled, the app renders in a separate buffer (like vim/less).
   * On exit, the original screen is restored.
   * @default false
   */
  fullScreen?: boolean;
}

export interface InkInstance {
  rerender: (node: ReactNode) => void;
  unmount: () => void;
  waitUntilExit: () => Promise<void>;
  clear: () => void;
}

export class Ink {
  private readonly options: Required<Omit<InkOptions, "onRender">> & Pick<InkOptions, "onRender">;
  private readonly rootNode: DOMElement;
  private readonly reconciler: ReturnType<typeof createReconciler>;
  private container: any;
  private yoga: Yoga | null = null;
  private lastOutput: string = "";
  private lastHeight: number = 0;
  private lastWidth: number = 0;
  private maxHeight: number = 0; // Track max height for proper clearing
  private firstRender: boolean = true;
  private exitPromise: Promise<void>;
  private resolveExit!: () => void;
  private rejectExit!: (error: Error) => void;
  private isUnmounted: boolean = false;
  private frameTimer: number | null = null;
  private needsRender: boolean = false;
  private inputAbortController: AbortController | null = null;
  private resizeCheckInterval: number | null = null;
  private forceFullClear: boolean = false;
  private focusManager: ReturnType<typeof createFocusManager>;
  private inputManager: ReturnType<typeof createInputManager>;
  private exitError: Error | undefined = undefined;
  private patchedConsole: PatchedConsole | null = null;
  private readonly inCI: boolean;
  private readonly isScreenReaderEnabled: boolean;

  constructor(options: InkOptions = {}) {
    // Detect CI environment
    this.inCI = isCI();

    // Determine screen reader mode from option or environment variable
    let screenReaderEnabled = options.isScreenReaderEnabled ?? false;
    try {
      if (Deno.env.get("INK_SCREEN_READER") === "1") {
        screenReaderEnabled = true;
      }
    } catch {
      // Ignore env access errors
    }
    this.isScreenReaderEnabled = screenReaderEnabled;

    this.options = {
      stdout: options.stdout ?? Deno.stdout,
      stdin: options.stdin ?? Deno.stdin,
      stderr: options.stderr ?? Deno.stderr,
      exitOnCtrlC: options.exitOnCtrlC ?? true,
      debug: options.debug ?? false,
      maxFps: options.maxFps ?? 60,
      patchConsole: options.patchConsole ?? true,
      isScreenReaderEnabled: this.isScreenReaderEnabled,
      fullScreen: options.fullScreen ?? false,
      onRender: options.onRender,
    };

    this.rootNode = createNode("ink-root");

    this.exitPromise = new Promise((resolve, reject) => {
      this.resolveExit = resolve;
      this.rejectExit = reject;
    });

    this.reconciler = createReconciler({
      onRender: () => this.scheduleRender(),
    });

    // Initialize focus and input managers
    this.focusManager = createFocusManager();
    this.inputManager = createInputManager(this.options.debug);

    this.container = this.reconciler.createContainer(
      this.rootNode,
      0, // LegacyRoot
      null,
      false,
      null,
      "",
      () => {},
      null
    );

    // Set up console patching if enabled and not in CI
    if (this.options.patchConsole && !this.inCI) {
      const encoder = new TextEncoder();
      this.patchedConsole = patchConsole(
        (data) => this.options.stdout.writeSync(encoder.encode(data)),
        (data) => this.options.stderr.writeSync(encoder.encode(data))
      );
    }
  }

  async init(): Promise<void> {
    this.yoga = await loadYoga();
    this.attachYogaNodes(this.rootNode);

    // In CI mode, skip interactive features
    if (!this.inCI) {
      this.setupInput();
      this.setupResizeHandler();

      // Enter alternate screen buffer for full-screen mode
      if (this.options.fullScreen) {
        this.writeSync(ENTER_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME);
      }

      // Hide cursor during rendering (not in CI)
      this.writeSync(ansiEscapes.cursorHide);
    }
  }

  private setupResizeHandler(): void {
    // Poll for terminal size changes
    try {
      const initialSize = Deno.consoleSize();
      this.lastWidth = initialSize.columns;
    } catch {
      this.lastWidth = 80;
    }

    this.resizeCheckInterval = setInterval(() => {
      try {
        const size = Deno.consoleSize();
        if (size.columns !== this.lastWidth) {
          const widthDecreased = size.columns < this.lastWidth;

          // Width changed - need to do a full clear because layout will change
          this.forceFullClear = true;
          this.lastWidth = size.columns;

          // On resize, we need to erase the maximum height we've ever used
          // Don't reset lastHeight - we need it to properly erase on next render
          this.lastOutput = ""; // Force re-render even if content is same

          this.scheduleRender();
        }
      } catch {
        // Ignore
      }
    }, 50) as unknown as number; // Check more frequently
  }

  private fullClear(): void {
    // Clear the maximum area we've ever used
    const clearHeight = Math.max(this.lastHeight, this.maxHeight);
    if (clearHeight > 0) {
      // Move up and erase each line
      let buffer = moveCursorUp(clearHeight);
      for (let i = 0; i < clearHeight; i++) {
        buffer += ERASE_LINE;
        if (i < clearHeight - 1) {
          buffer += "\n";
        }
      }
      buffer += "\r"; // Return to column 0
      this.writeSync(buffer);
    }
    this.lastHeight = 0;
    this.maxHeight = 0; // Reset max height on full clear
    this.lastOutput = "";
  }

  private setupInput(): void {
    // Check if stdin is a TTY
    if (!Deno.stdin.isTerminal()) {
      return;
    }

    // Enable raw mode for character-by-character input
    try {
      Deno.stdin.setRaw(true);
    } catch {
      return;
    }

    this.inputAbortController = new AbortController();
    const signal = this.inputAbortController.signal;

    // Read input in background
    (async () => {
      const buffer = new Uint8Array(1024);
      const decoder = new TextDecoder();

      while (!signal.aborted && !this.isUnmounted) {
        try {
          const n = await Deno.stdin.read(buffer);
          if (n === null) break;

          const input = decoder.decode(buffer.subarray(0, n));

          // Check for Ctrl+C (ASCII 3)
          if (this.options.exitOnCtrlC && input.includes("\x03")) {
            this.unmount();
            Deno.exit(0);
          }

          // Emit to input manager for useInput hook
          this.inputManager.emit(input);
        } catch {
          break;
        }
      }
    })();
  }

  private cleanupInput(): void {
    if (this.inputAbortController) {
      this.inputAbortController.abort();
      this.inputAbortController = null;
    }

    // Restore normal mode
    try {
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(false);
      }
    } catch {
      // Ignore errors
    }
  }

  private attachYogaNodes(node: DOMElement): void {
    if (!this.yoga) return;

    node.yogaNode = this.yoga.Node.create();

    for (const child of node.childNodes) {
      if (!isTextNode(child)) {
        this.attachYogaNodes(child);
      }
    }
  }

  private scheduleRender(): void {
    if (this.isUnmounted) return;

    this.needsRender = true;

    if (this.frameTimer === null) {
      // Calculate frame interval from maxFps
      const frameInterval = Math.floor(1000 / this.options.maxFps);
      this.frameTimer = setTimeout(() => {
        this.frameTimer = null;
        if (this.needsRender) {
          this.needsRender = false;
          this.render();
        }
      }, frameInterval) as unknown as number;
    }
  }

  private render(): void {
    if (this.isUnmounted || !this.yoga) return;

    const renderStart = performance.now();

    // Rebuild yoga tree to match DOM
    this.rebuildYogaTree(this.rootNode, null);

    // Get terminal width
    let width = 80;
    try {
      const size = Deno.consoleSize();
      width = size.columns;
    } catch {
      // Default to 80 if can't get terminal size
    }

    // Render to string
    const { output, height } = renderToString(this.rootNode, width);

    // Skip render if output hasn't changed (optimization)
    if (!this.forceFullClear && output === this.lastOutput) {
      return;
    }

    // Build the complete frame in a single buffer to minimize writes
    let frameBuffer = "";

    // In full-screen mode, use simpler approach: move to home and redraw
    if (this.options.fullScreen) {
      frameBuffer += CURSOR_HOME;
      const lines = output.split("\n");
      for (let i = 0; i < lines.length; i++) {
        frameBuffer += lines[i] + CLEAR_TO_EOL;
        if (i < lines.length - 1) {
          frameBuffer += "\n";
        }
      }
      // Clear any remaining lines from previous render
      if (this.lastHeight > lines.length) {
        for (let i = lines.length; i < this.lastHeight; i++) {
          frameBuffer += "\n" + ERASE_LINE;
        }
      }
      this.writeSync(frameBuffer);
      this.lastOutput = output;
      this.lastHeight = lines.length;
      this.forceFullClear = false;

      // Call onRender callback with timing info
      if (this.options.onRender) {
        const renderTime = performance.now() - renderStart;
        try {
          this.options.onRender({ renderTime });
        } catch {
          // Ignore errors in callback
        }
      }
      return;
    }

    // Regular mode: erase previous output and redraw
    // On subsequent renders, erase previous output first
    // This uses the eraseLines approach (like log-update) which erases from
    // current position upward, handling terminal reflow correctly
    if (!this.firstRender && this.lastHeight > 0) {
      const eraseCount = this.forceFullClear
        ? Math.max(this.lastHeight, this.maxHeight)
        : this.lastHeight;
      frameBuffer += eraseLines(eraseCount);
    }
    this.firstRender = false;

    // Split output into lines and write each with clear-to-end-of-line
    const lines = output.split("\n");
    const newHeight = lines.length;

    for (let i = 0; i < lines.length; i++) {
      frameBuffer += lines[i] + CLEAR_TO_EOL;
      if (i < lines.length - 1) {
        frameBuffer += "\n";
      }
    }

    // DON'T add trailing newline - cursor must stay at end of last content line
    // so that eraseLines(lastHeight) erases all content lines correctly.
    // eraseLines erases current line then moves up, so we need to be ON the last
    // content line, not below it.

    // Write everything at once
    this.writeSync(frameBuffer);

    // Track state for next render
    this.lastOutput = output;
    this.lastHeight = newHeight;
    this.maxHeight = Math.max(this.maxHeight, this.lastHeight);
    this.forceFullClear = false;

    // Call onRender callback with timing info
    if (this.options.onRender) {
      const renderTime = performance.now() - renderStart;
      try {
        this.options.onRender({ renderTime });
      } catch {
        // Ignore errors in callback
      }
    }
  }

  private rebuildYogaTree(node: DOMElement, parentYogaNode: YogaNode | null): void {
    if (!this.yoga) return;

    // Create yoga node if needed
    if (!node.yogaNode) {
      node.yogaNode = this.yoga.Node.create();
    }

    const yogaNode = node.yogaNode;

    // Apply styles
    applyStyles(yogaNode, node.style as Styles, this.yoga);

    // Set up text measurement for text nodes
    if (node.nodeName === "ink-text") {
      const text = this.getTextContent(node);
      const lines = text.split("\n");
      const maxWidth = Math.max(...lines.map((line) => stringWidth(line)));
      const height = lines.length;

      yogaNode.setWidth(maxWidth);
      yogaNode.setHeight(height);
    }

    // Rebuild children
    // First, remove all children from yoga node
    while (yogaNode.getChildCount() > 0) {
      yogaNode.removeChild(yogaNode.getChild(0));
    }

    // Add children
    let childIndex = 0;
    for (const child of node.childNodes) {
      if (!isTextNode(child)) {
        this.rebuildYogaTree(child, yogaNode);
        if (child.yogaNode) {
          yogaNode.insertChild(child.yogaNode, childIndex++);
        }
      }
    }

    // Add to parent
    if (parentYogaNode && yogaNode) {
      // Parent will handle insertion
    }
  }

  private getTextContent(node: DOMNode): string {
    if (isTextNode(node)) {
      return node.nodeValue;
    }

    let text = "";
    for (const child of node.childNodes) {
      text += this.getTextContent(child);
    }
    return text;
  }

  private writeSync(data: string): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    Deno.stdout.writeSync(bytes);
  }

  renderReact(node: ReactNode): void {
    // Create context values
    const appContext: AppContextValue = {
      exit: (error?: Error) => {
        this.exitError = error;
        this.unmount();
      },
    };

    const stdoutContext: StdoutContextValue = {
      stdout: this.options.stdout,
      write: (data: string) => {
        const encoder = new TextEncoder();
        this.options.stdout.writeSync(encoder.encode(data));
      },
    };

    const stderrContext: StderrContextValue = {
      stderr: this.options.stderr,
      write: (data: string) => {
        const encoder = new TextEncoder();
        this.options.stderr.writeSync(encoder.encode(data));
      },
    };

    const stdinContext: StdinContextValue = {
      stdin: this.options.stdin,
      isRawModeSupported: this.inputManager.isRawModeSupported,
      setRawMode: (value: boolean) => {
        try {
          if (this.options.stdin.isTerminal()) {
            this.options.stdin.setRaw(value);
          }
        } catch {
          // Ignore
        }
      },
    };

    const inputContext = {
      subscribe: this.inputManager.subscribe,
      isRawModeSupported: this.inputManager.isRawModeSupported,
    };

    const accessibilityContext: AccessibilityContextValue = {
      isScreenReaderEnabled: this.isScreenReaderEnabled,
    };

    // Wrap the node with InkProvider
    const wrappedNode = React.createElement(InkProvider, {
      app: appContext,
      focusManager: this.focusManager,
      stdout: stdoutContext,
      stderr: stderrContext,
      stdin: stdinContext,
      input: inputContext,
      accessibility: accessibilityContext,
    }, node);

    this.reconciler.updateContainer(wrappedNode, this.container, null, () => {});
  }

  rerender(node: ReactNode): void {
    this.renderReact(node);
  }

  unmount(): void {
    if (this.isUnmounted) return;

    this.isUnmounted = true;

    if (this.frameTimer !== null) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }

    if (this.resizeCheckInterval !== null) {
      clearInterval(this.resizeCheckInterval);
      this.resizeCheckInterval = null;
    }

    this.cleanupInput();

    // Show cursor again (not in CI)
    if (!this.inCI) {
      this.writeSync(ansiEscapes.cursorShow);

      // Exit alternate screen buffer if we were in full-screen mode
      if (this.options.fullScreen) {
        this.writeSync(EXIT_ALT_SCREEN);
      }
    }

    // Restore console methods and flush buffered output
    if (this.patchedConsole) {
      this.patchedConsole.restore();
      this.patchedConsole = null;
    }

    this.reconciler.updateContainer(null, this.container, null, () => {});

    if (this.exitError) {
      this.rejectExit(this.exitError);
    } else {
      this.resolveExit();
    }
  }

  waitUntilExit(): Promise<void> {
    return this.exitPromise;
  }

  clear(): void {
    const clearHeight = Math.max(this.lastHeight, this.maxHeight);
    if (clearHeight > 0) {
      // Move up and erase each line
      let buffer = moveCursorUp(clearHeight);
      for (let i = 0; i < clearHeight; i++) {
        buffer += ERASE_LINE;
        if (i < clearHeight - 1) {
          buffer += "\n";
        }
      }
      buffer += "\r"; // Return to column 0
      this.writeSync(buffer);
      this.lastHeight = 0;
      this.maxHeight = 0;
      this.lastOutput = "";
    }
  }
}

// Main render function
export async function render(
  node: ReactNode,
  options?: InkOptions
): Promise<InkInstance> {
  const ink = new Ink(options);
  await ink.init();
  ink.renderReact(node);

  return {
    rerender: (newNode: ReactNode) => ink.rerender(newNode),
    unmount: () => ink.unmount(),
    waitUntilExit: () => ink.waitUntilExit(),
    clear: () => ink.clear(),
  };
}
