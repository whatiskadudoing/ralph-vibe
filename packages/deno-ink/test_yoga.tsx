import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga } from "./test/helpers.ts";
import { createNode } from "./src/dom.ts";
import { loadYoga } from "./src/yoga.ts";
import { applyStyles } from "./src/styles.ts";

await initYoga();

const yoga = await loadYoga();
const node = yoga.Node.create();
const childNode = yoga.Node.create();

applyStyles(childNode, { display: "none" }, yoga);
node.insertChild(childNode, 0);

node.calculateLayout(100, undefined);

console.log("Parent width:", node.getComputedWidth());
console.log("Parent height:", node.getComputedHeight());
console.log("Child width:", childNode.getComputedWidth());
console.log("Child height:", childNode.getComputedHeight());
console.log("Child layout:", childNode.getComputedLeft(), childNode.getComputedTop());
