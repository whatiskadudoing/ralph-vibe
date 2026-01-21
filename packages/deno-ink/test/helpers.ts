// Test helpers for deno-ink
import React from "react";
import type { ReactElement } from "react";
import { createReconciler } from "../src/reconciler.ts";
import { createNode, type DOMElement, isTextNode } from "../src/dom.ts";
import { renderToString as renderNodeToString } from "../src/render-node.ts";
import { loadYoga, type Yoga, type Node as YogaNode } from "../src/yoga.ts";
import { applyStyles, type Styles } from "../src/styles.ts";
import stringWidth from "string-width";
import { createFocusManager } from "../src/focus-manager.ts";
import { createInputManager } from "../src/hooks/use-input.ts";
import { InkProvider } from "../src/components/InkProvider.tsx";
import type { AppContextValue } from "../src/contexts/app-context.ts";
import type {
  StdoutContextValue,
  StderrContextValue,
  StdinContextValue,
} from "../src/contexts/std-context.ts";

export interface RenderOptions {
  columns?: number;
  debug?: boolean;
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
  if (!node.yogaNode) {
    node.yogaNode = y.Node.create();
  }

  const yogaNode = node.yogaNode;
  applyStyles(yogaNode, node.style as Styles, y);

  if (node.nodeName === "ink-text") {
    const text = getTextContent(node);
    const lines = text.split("\n");
    const maxWidth = Math.max(...lines.map((line) => stringWidth(line)), 0);
    const height = lines.length || 1;

    yogaNode.setWidth(maxWidth);
    yogaNode.setHeight(height);
  }

  while (yogaNode.getChildCount() > 0) {
    yogaNode.removeChild(yogaNode.getChild(0));
  }

  let childIndex = 0;
  for (const child of node.childNodes) {
    if (!isTextNode(child)) {
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

  const { columns = 100 } = options;
  const y = yoga;
  const rootNode = createNode("ink-root");
  let output = "";

  const reconciler = createReconciler({
    onRender: () => {
      rebuildYogaTree(rootNode, null, y);
      const result = renderNodeToString(rootNode, columns);
      output = result.output;
    },
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

  const wrappedElement = React.createElement(
    InkProvider,
    {
      app: appContext,
      focusManager,
      stdout: stdoutContext,
      stderr: stderrContext,
      stdin: stdinContext,
      input: inputContext,
    },
    element
  );

  reconciler.updateContainer(wrappedElement, container, null, () => {});
  rebuildYogaTree(rootNode, null, y);
  const result = renderNodeToString(rootNode, columns);
  output = result.output;

  return output;
}

/**
 * Render a component for testing (async version)
 */
export async function render(
  element: ReactElement,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const { columns = 100 } = options;

  const y = await getYoga();
  const rootNode = createNode("ink-root");
  const frames: string[] = [];

  const reconciler = createReconciler({
    onRender: () => {
      rebuildYogaTree(rootNode, null, y);
      const { output } = renderNodeToString(rootNode, columns);
      frames.push(output);
    },
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

  const doRender = (el: ReactElement) => {
    const wrappedElement = React.createElement(
      InkProvider,
      {
        app: appContext,
        focusManager,
        stdout: stdoutContext,
        stderr: stderrContext,
        stdin: stdinContext,
        input: inputContext,
      },
      el
    );

    reconciler.updateContainer(wrappedElement, container, null, () => {});
    rebuildYogaTree(rootNode, null, y);
    const { output } = renderNodeToString(rootNode, columns);
    frames.push(output);
  };

  doRender(element);

  return {
    lastFrame: () => frames[frames.length - 1] ?? "",
    frames,
    rerender: (el: ReactElement) => {
      doRender(el);
    },
    unmount: () => {
      reconciler.updateContainer(null, container, null, () => {});
    },
    stdin: {
      write: (data: string) => {
        inputManager.emit(data);
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
