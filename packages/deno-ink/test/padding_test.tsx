// Port of ink/test/padding.tsx
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("padding: all sides", () => {
  const output = renderToString(
    <Box padding={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\n  X\n\n");
});

Deno.test("padding: X (horizontal)", () => {
  const output = renderToString(
    <Box>
      <Box paddingX={2}>
        <Text>X</Text>
      </Box>
      <Text>Y</Text>
    </Box>
  );

  assertEquals(output, "  X  Y");
});

Deno.test("padding: Y (vertical)", () => {
  const output = renderToString(
    <Box paddingY={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\nX\n\n");
});

Deno.test("padding: top", () => {
  const output = renderToString(
    <Box paddingTop={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "\n\nX");
});

Deno.test("padding: bottom", () => {
  const output = renderToString(
    <Box paddingBottom={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "X\n\n");
});

Deno.test("padding: left", () => {
  const output = renderToString(
    <Box paddingLeft={2}>
      <Text>X</Text>
    </Box>
  );

  assertEquals(output, "  X");
});

Deno.test("padding: right", () => {
  const output = renderToString(
    <Box>
      <Box paddingRight={2}>
        <Text>X</Text>
      </Box>
      <Text>Y</Text>
    </Box>
  );

  assertEquals(output, "X  Y");
});

Deno.test("padding: nested", () => {
  const output = renderToString(
    <Box padding={2}>
      <Box padding={2}>
        <Text>X</Text>
      </Box>
    </Box>
  );

  assertEquals(output, "\n\n\n\n    X\n\n\n\n");
});

Deno.test("padding: with multiline string", () => {
  const output = renderToString(
    <Box padding={2}>
      <Text>{"A\nB"}</Text>
    </Box>
  );

  assertEquals(output, "\n\n  A\n  B\n\n");
});

Deno.test("padding: apply to text with newlines", () => {
  const output = renderToString(
    <Box padding={1}>
      <Text>Hello{"\n"}World</Text>
    </Box>
  );

  assertEquals(output, "\n Hello\n World\n");
});

Deno.test("padding: apply to wrapped text", () => {
  const output = renderToString(
    <Box padding={1} width={5}>
      <Text>Hello World</Text>
    </Box>
  );

  assertEquals(output, "\n Hel\n lo\n Wor\n ld\n");
});
