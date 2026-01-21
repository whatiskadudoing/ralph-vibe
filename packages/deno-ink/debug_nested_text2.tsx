import React from "react";
import { Text } from "./src/mod.ts";
import { createNode, squashTextNodes } from "./src/dom.ts";
import { renderToString as renderNodeToString } from "./src/render-node.ts";
import { createReconciler } from "./src/reconciler.ts";
import { applyStyles, type Styles } from "./src/styles.ts";
import { loadYoga } from "./src/yoga.ts";
import stringWidth from "string-width";
import { InkProvider } from "./src/components/InkProvider.tsx";
import { createFocusManager } from "./src/focus-manager.ts";
import { createInputManager } from "./src/hooks/use-input.ts";
import { isTextNode } from "./src/dom.ts";
import wrapAnsi from "wrap-ansi";

const yoga = await loadYoga();

function rebuildYogaTree(node, parentYogaNode, y) {
  if (!node.yogaNode) {
    node.yogaNode = y.Node.create();
  }

  const yogaNode = node.yogaNode;
  applyStyles(yogaNode, node.style, y);

  // Check if this text node has any non-text child elements
  const hasElementChildren = node.nodeName === "ink-text" &&
    node.childNodes.some(child => !isTextNode(child));

  if (node.nodeName === "ink-text" && !hasElementChildren) {
    yogaNode.setMeasureFunc((
      width,
      _widthMode,
      _height,
      _heightMode
    ) => {
      const text = squashTextNodes(node);
      if (text === "") {
        return { width: 0, height: 0 };
      }
      let wrappedText = text;
      if (width !== undefined && isFinite(width) && width > 0) {
        wrappedText = wrapAnsi(text, Math.floor(width), { hard: true, trim: false });
      }
      const lines = wrappedText.split("\n");
      const textWidth = Math.max(...lines.map((line) => stringWidth(line)), 0);
      const textHeight = lines.length;
      console.log(`  Measure leaf ink-text: text="${text}", width=${width} -> wrapped="${wrappedText.replace(/\n/g, '\\n')}", result: ${textWidth}x${textHeight}`);
      return { width: textWidth, height: textHeight };
    });
    yogaNode.setFlexShrink(1);
  } else if (node.nodeName === "ink-text") {
    yogaNode.setFlexShrink(1);
    console.log(`  ink-text with children, no measure function`);
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

const rootNode = createNode("ink-root");
const reconciler = createReconciler({
  onRender: () => {},
  isPrimaryRenderer: false,
});

const container = reconciler.createContainer(rootNode, 0, null, false, null, "", () => {}, null);
const focusManager = createFocusManager();
const inputManager = createInputManager();

const element = (
  <Text>
    Hello <Text color="green">World</Text>
  </Text>
);

const wrappedElement = React.createElement(
  InkProvider,
  {
    app: { exit: () => {} },
    focusManager,
    stdout: { stdout: { writeSync: () => 0 }, write: () => {} },
    stderr: { stderr: { writeSync: () => 0 }, write: () => {} },
    stdin: { stdin: Deno.stdin, isRawModeSupported: false, setRawMode: () => {} },
    input: { subscribe: inputManager.subscribe, isRawModeSupported: false },
  },
  element
);

reconciler.updateContainer(wrappedElement, container, null, () => {});

console.log("Building yoga tree...");
rebuildYogaTree(rootNode, null, yoga);

const yogaRoot = rootNode.yogaNode;
yogaRoot.calculateLayout(100, undefined);

console.log("\nDOM structure:");
function printDom(node, indent = "") {
  if (isTextNode(node)) {
    console.log(indent + "#text: " + JSON.stringify(node.nodeValue));
  } else {
    const yn = node.yogaNode;
    const dims = yn ? `${yn.getComputedWidth()}x${yn.getComputedHeight()} at (${yn.getComputedLeft()},${yn.getComputedTop()})` : "no yoga";
    console.log(indent + node.nodeName + " [" + dims + "]");
    for (const child of node.childNodes) {
      printDom(child, indent + "  ");
    }
  }
}
printDom(rootNode);

console.log("\nRendering...");
const result = renderNodeToString(rootNode, 100);
console.log("Output:", JSON.stringify(result.output));
