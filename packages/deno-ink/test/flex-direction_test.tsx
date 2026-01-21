// Port of ink/test/flex-direction.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("flex-direction: row", () => {
  const output = renderToString(
    <Box flexDirection="row">
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "AB");
});

Deno.test("flex-direction: row reverse", () => {
  const output = renderToString(
    <Box flexDirection="row-reverse" width={4}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "  BA");
});

Deno.test("flex-direction: column", () => {
  const output = renderToString(
    <Box flexDirection="column">
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A\nB");
});

Deno.test("flex-direction: column reverse", () => {
  const output = renderToString(
    <Box flexDirection="column-reverse" height={4}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "\n\nB\nA");
});

Deno.test("flex-direction: don't squash text nodes when column direction is applied", () => {
  const output = renderToString(
    <Box flexDirection="column">
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A\nB");
});
