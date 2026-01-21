import React from "react";
import { loadYoga } from "./src/yoga.ts";
import { applyStyles } from "./src/styles.ts";

const yoga = await loadYoga();

const node1 = yoga.Node.create();
applyStyles(node1, { display: "flex" }, yoga);
console.log("display:flex -> getDisplay():", node1.getDisplay());
console.log("yoga.DISPLAY_FLEX:", yoga.DISPLAY_FLEX);
console.log("yoga.DISPLAY_NONE:", yoga.DISPLAY_NONE);

const node2 = yoga.Node.create();
applyStyles(node2, { display: "none" }, yoga);
console.log("display:none -> getDisplay():", node2.getDisplay());
