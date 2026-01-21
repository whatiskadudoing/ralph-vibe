import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga } from "./test/helpers.ts";

await initYoga();

const output = renderToString(
  <Box width={7}>
    <Text wrap="truncate">Hello World</Text>
  </Box>
);

console.log("Output:", JSON.stringify(output));
console.log("Length:", output.length);
console.log("Expected:", JSON.stringify("Hello …"));
console.log("Expected length:", "Hello …".length);
