import React from "react";
import { Static, Text } from "./src/mod.ts";
import { render, initYoga, stripAnsi } from "./test/helpers.ts";

await initYoga();

const items = ["A", "B", "C"];

const { lastFrame, frames } = await render(
  <Static items={items}>
    {(item: string) => <Text key={item}>{item}</Text>}
  </Static>
);

console.log("Number of frames:", frames.length);
console.log("Frames:");
frames.forEach((f, i) => {
  console.log(`Frame ${i}:`, JSON.stringify(f));
});

const output = stripAnsi(lastFrame());
console.log("Last frame output:", JSON.stringify(output));
console.log("Includes A:", output.includes("A"));
console.log("Includes B:", output.includes("B"));
console.log("Includes C:", output.includes("C"));
