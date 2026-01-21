import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga } from "./test/helpers.ts";

await initYoga();

const output = renderToString(
  <Box margin={1} width={6}>
    <Text>Hello World</Text>
  </Box>
);

console.log("Output:", JSON.stringify(output));
console.log("Expected:", JSON.stringify("\n Hello\n World\n"));
console.log("Output lines:", output.split("\n").map(l => JSON.stringify(l)));
