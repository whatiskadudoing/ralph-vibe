// Port of ink/test/flex-align-self.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("flex-align-self: row - align text to center", () => {
  const output = renderToString(
    <Box height={3}>
      <Box alignSelf="center">
        <Text>Test</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\nTest\n");
});

Deno.test("flex-align-self: row - align multiple text nodes to center", () => {
  const output = renderToString(
    <Box height={3}>
      <Box alignSelf="center">
        <Text>A</Text>
        <Text>B</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\nAB\n");
});

Deno.test("flex-align-self: row - align text to bottom", () => {
  const output = renderToString(
    <Box height={3}>
      <Box alignSelf="flex-end">
        <Text>Test</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\n\nTest");
});

Deno.test("flex-align-self: row - align multiple text nodes to bottom", () => {
  const output = renderToString(
    <Box height={3}>
      <Box alignSelf="flex-end">
        <Text>A</Text>
        <Text>B</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\n\nAB");
});

Deno.test("flex-align-self: column - align text to center", () => {
  const output = renderToString(
    <Box flexDirection="column" width={10}>
      <Box alignSelf="center">
        <Text>Test</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "   Test");
});

Deno.test("flex-align-self: column - align text to right", () => {
  const output = renderToString(
    <Box flexDirection="column" width={10}>
      <Box alignSelf="flex-end">
        <Text>Test</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "      Test");
});
