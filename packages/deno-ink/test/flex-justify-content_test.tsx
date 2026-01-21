// Port of ink/test/flex-justify-content.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("flex-justify-content: row - center (single node)", () => {
  const output = renderToString(
    <Box justifyContent="center" width={10}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "   Test");
});

Deno.test("flex-justify-content: row - center (multiple nodes)", () => {
  const output = renderToString(
    <Box justifyContent="center" width={12}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "     AB");
});

Deno.test("flex-justify-content: row - right (single node)", () => {
  const output = renderToString(
    <Box justifyContent="flex-end" width={10}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "      Test");
});

Deno.test("flex-justify-content: row - right (multiple nodes)", () => {
  const output = renderToString(
    <Box justifyContent="flex-end" width={12}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "          AB");
});

Deno.test("flex-justify-content: row - space between", () => {
  const output = renderToString(
    <Box justifyContent="space-between" width={10}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A        B");
});

Deno.test("flex-justify-content: row - space evenly", () => {
  const output = renderToString(
    <Box justifyContent="space-evenly" width={12}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "    A   B");
});

Deno.test("flex-justify-content: column - center", () => {
  const output = renderToString(
    <Box flexDirection="column" justifyContent="center" height={3}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "\nTest\n");
});

Deno.test("flex-justify-content: column - bottom", () => {
  const output = renderToString(
    <Box flexDirection="column" justifyContent="flex-end" height={3}>
      <Text>Test</Text>
    </Box>
  );

  assertEquals(output, "\n\nTest");
});

Deno.test("flex-justify-content: column - space between", () => {
  const output = renderToString(
    <Box flexDirection="column" justifyContent="space-between" height={5}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A\n\n\n\nB");
});
