import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga, stripAnsi } from "./test/helpers.ts";

await initYoga();

const output = renderToString(
  <Text>
    Hello <Text color="green">World</Text>
  </Text>
);

console.log("Raw output:", JSON.stringify(output));
console.log("Stripped:", JSON.stringify(stripAnsi(output)));
console.log("Expected:", JSON.stringify("Hello World"));
console.log("Lines:");
output.split("\n").forEach((line, i) => {
  console.log(`  Line ${i}: ${JSON.stringify(line)} (len: ${line.length})`);
});
