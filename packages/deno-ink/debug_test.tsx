import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga } from "./test/helpers.ts";

await initYoga();

// Test 1: text with fragment
const output1 = renderToString(
  <Text>
    Hello <>World</>
  </Text>
);
console.log("Test 1 - text with fragment:");
console.log("  Expected: 'Hello World'");
console.log("  Actual:   '" + output1 + "'");
console.log("  Match:", output1 === "Hello World");
console.log();

// Test 2: number
const output2 = renderToString(<Text>{1}</Text>);
console.log("Test 2 - number:");
console.log("  Expected: '1'");
console.log("  Actual:   '" + output2 + "'");
console.log("  Match:", output2 === "1");
console.log();

// Test 3: fragment
const output3 = renderToString(
  <>
    <Text>Hello World</Text>
  </>
);
console.log("Test 3 - fragment:");
console.log("  Expected: 'Hello World'");
console.log("  Actual:   '" + output3 + "'");
console.log("  Match:", output3 === "Hello World");
console.log();

// Test 4: ignore empty text node
const output4 = renderToString(
  <Box flexDirection="column">
    <Box>
      <Text>Hello World</Text>
    </Box>
    <Text>{""}</Text>
  </Box>
);
console.log("Test 4 - ignore empty text node:");
console.log("  Expected: 'Hello World'");
console.log("  Actual:   '" + output4 + "'");
console.log("  Match:", output4 === "Hello World");
console.log();

// Test 5: margin left
const output5 = renderToString(
  <Box marginLeft={2}>
    <Text>X</Text>
  </Box>
);
console.log("Test 5 - margin left:");
console.log("  Expected: '  X'");
console.log("  Actual:   '" + output5 + "'");
console.log("  Match:", output5 === "  X");
console.log();

// Test 6: multiple text nodes
const output6 = renderToString(
  <Text>
    {"Hello"}
    {" World"}
  </Text>
);
console.log("Test 6 - multiple text nodes:");
console.log("  Expected: 'Hello World'");
console.log("  Actual:   '" + output6 + "'");
console.log("  Match:", output6 === "Hello World");
