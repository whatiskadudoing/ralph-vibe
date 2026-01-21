// Port of ink/test/flex-wrap.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("flex-wrap: row - no wrap", () => {
  const output = renderToString(
    <Box width={2}>
      <Text>A</Text>
      <Text>BC</Text>
    </Box>
  );

  assertEquals(output, "BC\n");
});

Deno.test("flex-wrap: column - no wrap", () => {
  const output = renderToString(
    <Box flexDirection="column" height={2}>
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );

  assertEquals(output, "B\nC");
});

Deno.test("flex-wrap: row - wrap content", () => {
  const output = renderToString(
    <Box width={2} flexWrap="wrap">
      <Text>A</Text>
      <Text>BC</Text>
    </Box>
  );

  assertEquals(output, "A\nBC");
});

Deno.test("flex-wrap: column - wrap content", () => {
  const output = renderToString(
    <Box flexDirection="column" height={2} flexWrap="wrap">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );

  assertEquals(output, "AC\nB");
});

Deno.test("flex-wrap: column - wrap content reverse", () => {
  const output = renderToString(
    <Box flexDirection="column" height={2} width={3} flexWrap="wrap-reverse">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );

  assertEquals(output, " CA\n  B");
});

Deno.test("flex-wrap: row - wrap content reverse", () => {
  const output = renderToString(
    <Box height={3} width={2} flexWrap="wrap-reverse">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );

  assertEquals(output, "\nC\nAB");
});
