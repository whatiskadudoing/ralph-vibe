// Port of ink/test/gap.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("gap: all directions", () => {
  const output = renderToString(
    <Box gap={1} width={3} flexWrap="wrap">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );

  assertEquals(output, "A B\n\nC");
});

Deno.test("gap: column gap", () => {
  const output = renderToString(
    <Box gap={1}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A B");
});

Deno.test("gap: row gap", () => {
  const output = renderToString(
    <Box flexDirection="column" gap={1}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );

  assertEquals(output, "A\n\nB");
});
