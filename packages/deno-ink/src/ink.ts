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
 * Move cursor up N lines and to column 0.
 * Used to position cursor at the start of previous output for overwriting.
 */
function moveCursorUp(count: number): string {
  if (count <= 0) return "";
  return `\x1b[${count}A\r`; // Move up N lines + move to column 0
}

/**
 * Clear to end of line escape sequence.
 * This clears from cursor to end of line without affecting scrollback.
 */
const CLEAR_TO_EOL = "\x1b[K";

/**
 * Erase entire line (for clearing extra lines when content shrinks).
 */
const ERASE_LINE = "\x1b[2K";
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

    // On subsequent renders, move cursor up to start of previous content
    if (!this.firstRender) {
      const moveUpCount = this.forceFullClear
        ? Math.max(this.lastHeight, this.maxHeight)
        : this.lastHeight;
      if (moveUpCount > 0) {
        frameBuffer += moveCursorUp(moveUpCount);
      }
    }
    this.firstRender = false;

    // Split output into lines and write each with clear-to-end-of-line
    // This overwrites the previous content in place
    const lines = output.split("\n");
    const newHeight = lines.length; // Number of content lines

    for (let i = 0; i < lines.length; i++) {
      frameBuffer += lines[i] + CLEAR_TO_EOL + "\n";
    }

    // If new content has fewer lines than old, clear the extra lines
    const oldHeight = this.forceFullClear
      ? Math.max(this.lastHeight, this.maxHeight)
      : this.lastHeight;
    if (oldHeight > newHeight) {
      const extraLines = oldHeight - newHeight;
      for (let i = 0; i < extraLines; i++) {
        frameBuffer += ERASE_LINE + "\n";
      }
    }

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
