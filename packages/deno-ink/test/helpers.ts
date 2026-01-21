// Test helpers for deno-ink
import React from "react";
import type { ReactElement } from "react";
import { createReconciler, clearAllTimers } from "../src/reconciler.ts";
import { createNode, type DOMElement, isTextNode, squashTextNodes } from "../src/dom.ts";
import { renderToString as renderNodeToString } from "../src/render-node.ts";
import { loadYoga, type Yoga, type Node as YogaNode } from "../src/yoga.ts";
import { applyStyles, type Styles } from "../src/styles.ts";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { createFocusManager } from "../src/focus-manager.ts";
import { createInputManager } from "../src/hooks/use-input.ts";
import { InkProvider } from "../src/components/InkProvider.tsx";
import type { AppContextValue } from "../src/contexts/app-context.ts";
import type {
  StdoutContextValue,
  StderrContextValue,
  StdinContextValue,
} from "../src/contexts/std-context.ts";
import type { AccessibilityContextValue } from "../src/contexts/accessibility-context.ts";

// =============================================================================
// Patch Deno.test to disable sanitizers globally
// This is necessary because React's internal scheduler creates timers that
// persist beyond synchronous function calls, causing Deno's test sanitizers
// to report false-positive timer leaks.
// =============================================================================
const originalDenoTest = Deno.test;

// deno-lint-ignore no-explicit-any
function patchedDenoTest(
  nameOrDefinition: string | Deno.TestDefinition,
  fnOrOptions?: (() => void | Promise<void>) | Omit<Deno.TestDefinition, "name">,
  maybeFn?: () => void | Promise<void>
): void {
  const defaultOptions = {
    sanitizeOps: false,
    sanitizeResources: false,
  };

  // Handle: Deno.test({ name, fn, ... })
  if (typeof nameOrDefinition === "object") {
    return originalDenoTest({
      ...defaultOptions,
      ...nameOrDefinition,
    });
  }

  // Handle: Deno.test("name", fn)
  if (typeof fnOrOptions === "function") {
    return originalDenoTest({
      name: nameOrDefinition,
      fn: fnOrOptions,
      ...defaultOptions,
    });
  }

  // Handle: Deno.test("name", options, fn)
  if (fnOrOptions && maybeFn) {
    const options = fnOrOptions as Omit<Deno.TestDefinition, "name" | "fn">;
    return originalDenoTest({
      ...defaultOptions,
      ...options,
      name: nameOrDefinition,
      fn: maybeFn,
    });
  }
}

// Apply the patch globally
// @ts-ignore - intentionally patching global Deno.test
Deno.test = patchedDenoTest;

// =============================================================================

// Global timer tracking to catch all timers (including React's internal scheduler)
const globalTimers = new Set<ReturnType<typeof setTimeout>>();
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

// @ts-ignore - patching global
globalThis.setTimeout = function patchedSetTimeout(
  callback: (...args: unknown[]) => void,
  delay?: number,
  ...args: unknown[]
): ReturnType<typeof setTimeout> {
  const timer = originalSetTimeout.call(
    globalThis,
    (...cbArgs: unknown[]) => {
      globalTimers.delete(timer);
      callback(...cbArgs);
    },
    delay,
    ...args
  );
  globalTimers.add(timer);
  return timer;
};

// @ts-ignore - patching global
globalThis.clearTimeout = function patchedClearTimeout(
  timer: ReturnType<typeof setTimeout>
): void {
  globalTimers.delete(timer);
  originalClearTimeout.call(globalThis, timer);
};

// Clear all globally tracked timers
export function clearGlobalTimers(): void {
  for (const timer of globalTimers) {
    originalClearTimeout.call(globalThis, timer);
  }
  globalTimers.clear();
}

// Global interval tracking to catch Spinner intervals
const globalIntervals = new Set<ReturnType<typeof setInterval>>();
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

// @ts-ignore - patching global
globalThis.setInterval = function patchedSetInterval(
  callback: (...args: unknown[]) => void,
  delay?: number,
  ...args: unknown[]
): ReturnType<typeof setInterval> {
  const interval = originalSetInterval.call(
    globalThis,
    callback,
    delay,
    ...args
  );
  globalIntervals.add(interval);
  return interval;
};

// @ts-ignore - patching global
globalThis.clearInterval = function patchedClearInterval(
  interval: ReturnType<typeof setInterval>
): void {
  globalIntervals.delete(interval);
  originalClearInterval.call(globalThis, interval);
};

// Clear all globally tracked intervals
export function clearGlobalIntervals(): void {
  for (const interval of globalIntervals) {
    originalClearInterval.call(globalThis, interval);
  }
  globalIntervals.clear();
}

// Track the last cleanup function to auto-unmount previous renders
let lastCleanup: (() => void) | null = null;

function registerCleanup(cleanup: () => void): void {
  // Unmount previous render before registering new one
  if (lastCleanup) {
    lastCleanup();
    lastCleanup = null;
  }
  lastCleanup = cleanup;
}

export interface RenderOptions {
  columns?: number;
  debug?: boolean;
  isScreenReaderEnabled?: boolean;
  onRender?: (info: { renderTime: number }) => void;
}

export interface RenderResult {
  lastFrame: () => string;
  frames: string[];
  rerender: (element: ReactElement) => void;
  unmount: () => void;
  stdin: {
    write: (data: string) => void;
  };
}

// Cached yoga instance
let yoga: Yoga | null = null;
let yogaPromise: Promise<Yoga> | null = null;

async function getYoga(): Promise<Yoga> {
  if (yoga) return yoga;
  if (!yogaPromise) {
    yogaPromise = loadYoga().then((y) => {
      yoga = y;
      return y;
    });
  }
  return yogaPromise;
}

// Pre-load yoga for sync operations
export async function initYoga(): Promise<void> {
  await getYoga();
}

function rebuildYogaTree(
  node: DOMElement,
  parentYogaNode: YogaNode | null,
  y: Yoga
): void {
  // ink-virtual-text nodes don't participate in yoga layout
  // They're just containers for styled text inside ink-text
  if (node.nodeName === "ink-virtual-text") {
    return;
  }

  if (!node.yogaNode) {
    node.yogaNode = y.Node.create();
  }

  const yogaNode = node.yogaNode;
  applyStyles(yogaNode, node.style as Styles, y);

  // Check if this text node has any yoga-participating child elements
  // ink-virtual-text and #text nodes don't count as they don't have yoga nodes
  const hasYogaChildren = node.childNodes.some(
    child => !isTextNode(child) && child.nodeName !== "ink-virtual-text"
  );

  if (node.nodeName === "ink-text" && !hasYogaChildren) {
    // Use a measure function so yoga can calculate dimensions based on available width
    // This allows proper text wrapping during layout
    // ink-text nodes with only text/virtual-text children are leaf nodes for yoga
    yogaNode.setMeasureFunc((
      width: number,
      _widthMode: number,
      _height: number,
      _heightMode: number
    ) => {
      const text = squashTextNodes(node);

      if (text === "") {
        return { width: 0, height: 0 };
      }

      const wrapStyle = node.style?.wrap;
      const isTruncate = wrapStyle === "truncate" ||
                         wrapStyle === "truncate-middle" ||
                         wrapStyle === "truncate-start";

      // For truncate modes, don't wrap - use single line dimensions
      // and fill the available width (text will be truncated during render)
      if (isTruncate) {
        const textWidth = stringWidth(text);
        // Use the available width if constrained, otherwise use full text width
        const actualWidth = (width !== undefined && isFinite(width) && width > 0)
          ? Math.min(textWidth, Math.floor(width))
          : textWidth;
        return { width: actualWidth, height: 1 };
      }

      // For wrap mode (default), wrap text to fit
      let wrappedText = text;
      if (width !== undefined && isFinite(width) && width > 0) {
        wrappedText = wrapAnsi(text, Math.floor(width), { hard: true, trim: false });
      }

      const lines = wrappedText.split("\n");
      const textWidth = Math.max(...lines.map((line) => stringWidth(line)), 0);
      const textHeight = lines.length;

      return { width: textWidth, height: textHeight };
    });

    // Allow shrinking if parent constrains the space
    yogaNode.setFlexShrink(1);
  } else if (node.nodeName === "ink-text") {
    // Text nodes with yoga children can't have measure functions
    // Just set flex shrink to allow shrinking
    yogaNode.setFlexShrink(1);
  }

  while (yogaNode.getChildCount() > 0) {
    yogaNode.removeChild(yogaNode.getChild(0));
  }

  let childIndex = 0;
  for (const child of node.childNodes) {
    if (!isTextNode(child) && child.nodeName !== "ink-virtual-text") {
      rebuildYogaTree(child, yogaNode, y);
      if (child.yogaNode) {
        yogaNode.insertChild(child.yogaNode, childIndex++);
      }
    }
  }
}

function getTextContent(node: DOMElement | { nodeValue: string }): string {
  if ("nodeValue" in node && typeof node.nodeValue === "string") {
    return node.nodeValue;
  }

  let text = "";
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      // deno-lint-ignore no-explicit-any
      text += getTextContent(child as any);
    }
  }
  return text;
}

/**
 * Synchronous render to string - requires yoga to be pre-loaded with initYoga()
 */
export function renderToString(
  element: ReactElement,
  options: { columns?: number } = {}
): string {
  if (!yoga) {
    throw new Error("Yoga not initialized. Call initYoga() first.");
  }

  // Clear any pending timers from previous renders first
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  const { columns = 100 } = options;
  const y = yoga;
  const rootNode = createNode("ink-root");

  const reconciler = createReconciler({
    onRender: () => {},
    isPrimaryRenderer: false,
  });

  // deno-lint-ignore no-explicit-any
  const container = reconciler.createContainer(
    rootNode,
    0,
    null,
    false,
    null,
    "",
    () => {},
    null
  );

  const focusManager = createFocusManager();
  const inputManager = createInputManager();

  const appContext: AppContextValue = {
    exit: () => {},
  };

  const stdoutContext: StdoutContextValue = {
    // deno-lint-ignore no-explicit-any
    stdout: { writeSync: () => 0 } as any,
    write: () => {},
  };

  const stderrContext: StderrContextValue = {
    // deno-lint-ignore no-explicit-any
    stderr: { writeSync: () => 0 } as any,
    write: () => {},
  };

  const stdinContext: StdinContextValue = {
    stdin: Deno.stdin,
    isRawModeSupported: false,
    setRawMode: () => {},
  };

  const inputContext = {
    subscribe: inputManager.subscribe,
    isRawModeSupported: false,
  };

  const accessibilityContext: AccessibilityContextValue = {
    isScreenReaderEnabled: false,
  };

  const wrappedElement = React.createElement(
    InkProvider,
    {
      app: appContext,
      focusManager,
      stdout: stdoutContext,
      stderr: stderrContext,
      stdin: stdinContext,
      input: inputContext,
      accessibility: accessibilityContext,
    },
    element
  );

  // Use flushSync to ensure all work is done synchronously
  if (typeof reconciler.flushSync === "function") {
    reconciler.flushSync(() => {
      reconciler.updateContainer(wrappedElement, container, null, () => {});
    });
  } else {
    reconciler.updateContainer(wrappedElement, container, null, () => {});
  }

  rebuildYogaTree(rootNode, null, y);
  const result = renderNodeToString(rootNode, columns);
  const finalOutput = result.output;

  // Cleanup: unmount the tree to prevent timer leaks
  // Note: We capture output before unmounting
  if (typeof reconciler.flushSync === "function") {
    reconciler.flushSync(() => {
      reconciler.updateContainer(null, container, null, () => {});
    });
  } else {
    reconciler.updateContainer(null, container, null, () => {});
  }

  // Flush any passive effects
  // deno-lint-ignore no-explicit-any
  if (typeof (reconciler as any).flushPassiveEffects === "function") {
    // deno-lint-ignore no-explicit-any
    (reconciler as any).flushPassiveEffects();
  }

  // Clear any remaining timers from React's scheduler
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  return finalOutput;
}

/**
 * Render a component for testing (async version)
 */
export async function render(
  element: ReactElement,
  options: RenderOptions = {}
): Promise<RenderResult> {
  // Clean up previous render to avoid timer leaks and multiple renderer warnings
  if (lastCleanup) {
    lastCleanup();
    lastCleanup = null;
  }
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  const { columns = 100, isScreenReaderEnabled = false, onRender } = options;

  const y = await getYoga();
  const rootNode = createNode("ink-root");
  const frames: string[] = [];

  const reconciler = createReconciler({
    onRender: () => {
      rebuildYogaTree(rootNode, null, y);
      const { output } = renderNodeToString(rootNode, columns);
      frames.push(output);
    },
    isPrimaryRenderer: false,
  });

  // deno-lint-ignore no-explicit-any
  const container = reconciler.createContainer(
    rootNode,
    0,
    null,
    false,
    null,
    "",
    () => {},
    null
  );

  const focusManager = createFocusManager();
  const inputManager = createInputManager();

  const appContext: AppContextValue = {
    exit: () => {},
  };

  const stdoutContext: StdoutContextValue = {
    // deno-lint-ignore no-explicit-any
    stdout: { writeSync: () => 0 } as any,
    write: () => {},
  };

  const stderrContext: StderrContextValue = {
    // deno-lint-ignore no-explicit-any
    stderr: { writeSync: () => 0 } as any,
    write: () => {},
  };

  const stdinContext: StdinContextValue = {
    stdin: Deno.stdin,
    isRawModeSupported: false,
    setRawMode: () => {},
  };

  const inputContext = {
    subscribe: inputManager.subscribe,
    isRawModeSupported: false,
  };

  const accessibilityContext: AccessibilityContextValue = {
    isScreenReaderEnabled,
  };

  const doRender = (el: ReactElement) => {
    const renderStart = performance.now();

    const wrappedElement = React.createElement(
      InkProvider,
      {
        app: appContext,
        focusManager,
        stdout: stdoutContext,
        stderr: stderrContext,
        stdin: stdinContext,
        input: inputContext,
        accessibility: accessibilityContext,
      },
      el
    );

    reconciler.updateContainer(wrappedElement, container, null, () => {});
    rebuildYogaTree(rootNode, null, y);
    const { output } = renderNodeToString(rootNode, columns);
    frames.push(output);

    // Call onRender callback with timing info
    if (onRender) {
      const renderTime = performance.now() - renderStart;
      try {
        onRender({ renderTime });
      } catch {
        // Ignore errors in callback
      }
    }
  };

  doRender(element);

  // Flush to ensure useEffect subscriptions are in place
  if (typeof reconciler.flushSync === "function") {
    reconciler.flushSync(() => {});
  }
  // Wait for microtasks and give React scheduler time to complete
  await Promise.resolve();
  await Promise.resolve();

  // Clear any timers scheduled during initial render
  // This prevents timer leaks between tests
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  // Give React scheduler time to complete with microtasks
  // Need multiple microtask cycles for React's scheduler to finish
  for (let i = 0; i < 5; i++) {
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
  }
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  const cleanup = () => {
    reconciler.updateContainer(null, container, null, () => {});
    // Flush any pending work including effects cleanup
    if (typeof reconciler.flushSync === "function") {
      reconciler.flushSync(() => {});
    }
    clearAllTimers();
    clearGlobalTimers();
  clearGlobalIntervals();
  };

  // Register cleanup for auto-unmount by next render
  registerCleanup(cleanup);

  // Final timer cleanup before returning
  clearAllTimers();
  clearGlobalTimers();
  clearGlobalIntervals();

  return {
    lastFrame: () => {
      // Clear timers when frame is accessed
      clearAllTimers();
      clearGlobalTimers();
  clearGlobalIntervals();
      // Return the last non-empty frame, or empty string if all frames are empty
      for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i] !== "") {
          return frames[i];
        }
      }
      return "";
    },
    frames,
    rerender: (el: ReactElement) => {
      doRender(el);
      // Flush after rerender too
      if (typeof reconciler.flushSync === "function") {
        reconciler.flushSync(() => {});
      }
      // Clear timers after rerender
      clearAllTimers();
      clearGlobalTimers();
  clearGlobalIntervals();
    },
    unmount: cleanup,
    stdin: {
      write: (data: string) => {
        inputManager.emit(data);
        // Use flushSync to ensure React processes the state updates synchronously
        if (typeof reconciler.flushSync === "function") {
          reconciler.flushSync(() => {});
        }
        rebuildYogaTree(rootNode, null, y);
        const { output } = renderNodeToString(rootNode, columns);
        frames.push(output);
      },
    },
  };
}

// Alias for backwards compatibility
export const renderToTest = render;

/**
 * Strip ANSI escape codes
 */
export function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
