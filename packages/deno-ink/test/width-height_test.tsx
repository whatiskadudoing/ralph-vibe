// Port of ink/test/width-height.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("width-height: set width", () => {
  const output = renderToString(
    <Box>
      <Box width={5}>
        <Text>A</Text>
      </Box>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A    B");
});

Deno.test("width-height: set width in percent", () => {
  const output = renderToString(
    <Box width={10}>
      <Box width="50%">
        <Text>A</Text>
      </Box>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A    B");
});

Deno.test("width-height: set min width", () => {
  const smallerOutput = renderToString(
    <Box>
      <Box minWidth={5}>
        <Text>A</Text>
      </Box>
      <Text>B</Text>
    </Box>
  );

  assertEquals(smallerOutput, "A    B");

  const largerOutput = renderToString(
    <Box>
      <Box minWidth={2}>
        <Text>AAAAA</Text>
      </Box>
      <Text>B</Text>
    </Box>
  );

  assertEquals(largerOutput, "AAAAAB");
});

Deno.test("width-height: set height", () => {
  const output = renderToString(
    <Box height={4}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "AB\n\n\n");
});

Deno.test("width-height: set height in percent", () => {
  const output = renderToString(
    <Box height={6} flexDirection="column">
      <Box height="50%">
        <Text>A</Text>
      </Box>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A\n\n\nB\n\n");
});

Deno.test("width-height: cut text over the set height", () => {
  const output = renderToString(
    <Box height={2}>
      <Text>AAAABBBBCCCC</Text>
    </Box>,
    { columns: 4 }
  );

  assertEquals(output, "AAAA\nBBBB");
});

Deno.test("width-height: set min height", () => {
  const smallerOutput = renderToString(
    <Box minHeight={4}>
      <Text>A</Text>
    </Box>
  );

  assertEquals(smallerOutput, "A\n\n\n");

  const largerOutput = renderToString(
    <Box minHeight={2}>
      <Box height={4}>
        <Text>A</Text>
      </Box>
    </Box>
  );

  assertEquals(largerOutput, "A\n\n\n");
});
