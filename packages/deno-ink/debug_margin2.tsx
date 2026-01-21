import React from "react";
import { Box, Text } from "./src/mod.ts";
import { initYoga } from "./test/helpers.ts";
import { createNode, squashTextNodes } from "./src/dom.ts";
import { renderToString as renderNodeToString } from "./src/render-node.ts";
import { createReconciler } from "./src/reconciler.ts";
import { applyStyles, type Styles } from "./src/styles.ts";
import { loadYoga } from "./src/yoga.ts";
import stringWidth from "string-width";
import { InkProvider } from "./src/components/InkProvider.tsx";
import { createFocusManager } from "./src/focus-manager.ts";
import { createInputManager } from "./src/hooks/use-input.ts";

const yoga = await loadYoga();

function rebuildYogaTree(node, parentYogaNode, y) {
  if (!node.yogaNode) {
    node.yogaNode = y.Node.create();
  }

  const yogaNode = node.yogaNode;
  applyStyles(yogaNode, node.style, y);

  if (node.nodeName === "ink-text") {
    const text = squashTextNodes(node);
    if (text === "") {
      yogaNode.setWidth(0);
      yogaNode.setHeight(0);
    } else {
      const lines = text.split("\n");
      const maxWidth = Math.max(...lines.map((line) => stringWidth(line)), 0);
      const textHeight = lines.length;
      yogaNode.setWidth(maxWidth);
      yogaNode.setHeight(textHeight);
    }
    yogaNode.setFlexShrink(1);
  }

  while (yogaNode.getChildCount() > 0) {
    yogaNode.removeChild(yogaNode.getChild(0));
  }

  let childIndex = 0;
  for (const child of node.childNodes) {
    if (child.nodeName !== "#text") {
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
  <Box margin={1} width={6}>
    <Text>Hello World</Text>
  </Box>
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
rebuildYogaTree(rootNode, null, yoga);

const yogaNode = rootNode.yogaNode;
yogaNode.calculateLayout(100, undefined);

console.log("Root node computed dimensions:");
console.log("  width:", yogaNode.getComputedWidth());
console.log("  height:", yogaNode.getComputedHeight());

// Check the Box child
for (const child of rootNode.childNodes) {
  if (child.yogaNode) {
    const cn = child.yogaNode;
    console.log("Box computed dimensions:");
    console.log("  width:", cn.getComputedWidth());
    console.log("  height:", cn.getComputedHeight());
    console.log("  margin top:", cn.getComputedMargin(0));
    console.log("  margin right:", cn.getComputedMargin(1));
    console.log("  margin bottom:", cn.getComputedMargin(2));
    console.log("  margin left:", cn.getComputedMargin(3));
  }
}

const result = renderNodeToString(rootNode, 100);
console.log("Output:", JSON.stringify(result.output));
console.log("Output height:", result.height);
