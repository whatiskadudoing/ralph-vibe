// Port of ink/test/flex-align-items.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("flex-align-items: row - align text to center", () => {
  const output = renderToString(
    <Box alignItems="center" height={3}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "\nTest\n");
});

Deno.test("flex-align-items: row - align multiple text nodes to center", () => {
  const output = renderToString(
    <Box alignItems="center" height={3}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "\nAB\n");
});

Deno.test("flex-align-items: row - align text to bottom", () => {
  const output = renderToString(
    <Box alignItems="flex-end" height={3}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "\n\nTest");
});

Deno.test("flex-align-items: row - align multiple text nodes to bottom", () => {
  const output = renderToString(
    <Box alignItems="flex-end" height={3}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "\n\nAB");
});

Deno.test("flex-align-items: column - align text to center", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="center" width={10}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "   Test");
});

Deno.test("flex-align-items: column - align text to right", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-end" width={10}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "      Test");
});
