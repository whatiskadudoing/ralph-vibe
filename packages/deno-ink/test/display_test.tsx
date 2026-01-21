// Port of ink/test/display.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("display: flex", () => {
  const output = renderToString(
    <Box display="flex">
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "X");
});

Deno.test("display: none", () => {
  const output = renderToString(
    <Box flexDirection="column">
      <Box display="none">
        <Text>Kitty!</Text>
      </Box>
      <Text>Doggo</Text>
    </Box>
  );

  assertEquals(output, "Doggo");
});
