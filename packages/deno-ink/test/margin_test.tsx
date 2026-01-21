// Port of ink/test/margin.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("margin: all sides", () => {
  const output = renderToString(
    <Box margin={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\n  X\n\n");
});

Deno.test("margin: X (horizontal)", () => {
  const output = renderToString(
    <Box>
      <Box marginX={2}>
        <Text>X</Text>
      </Box>
      <Text>Y</Text>
    </Box>
  );

  assertEquals(output, "  X  Y");
});

Deno.test("margin: Y (vertical)", () => {
  const output = renderToString(
    <Box marginY={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\nX\n\n");
});

Deno.test("margin: top", () => {
  const output = renderToString(
    <Box marginTop={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\nX");
});

Deno.test("margin: bottom", () => {
  const output = renderToString(
    <Box marginBottom={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "X\n\n");
});

Deno.test("margin: left", () => {
  const output = renderToString(
    <Box marginLeft={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "  X");
});

Deno.test("margin: right", () => {
  const output = renderToString(
    <Box>
      <Box marginRight={2}>
        <Text>X</Text>
      </Box>
      <Text>Y</Text>
    </Box>
  );

  assertEquals(output, "X  Y");
});

Deno.test("margin: nested", () => {
  const output = renderToString(
    <Box margin={2}>
      <Box margin={2}>
        <Text>X</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\n\n\n\n    X\n\n\n\n");
});

Deno.test("margin: with multiline string", () => {
  const output = renderToString(
    <Box margin={2}>
      <Text>{"A\nB"}</Text>
    </Box>
  );

  assertEquals(output, "\n\n  A\n  B\n\n");
});

Deno.test("margin: apply to text with newlines", () => {
  const output = renderToString(
    <Box margin={1}>
      <Text>Hello{"\n"}World</Text>
    </Box>
  );

  assertEquals(output, "\n Hello\n World\n");
});

Deno.test("margin: apply to wrapped text", () => {
  const output = renderToString(
    <Box margin={1} width={6}>
      <Text>Hello World</Text>
    </Box>
  );

  assertEquals(output, "\n Hello\n World\n");
});
