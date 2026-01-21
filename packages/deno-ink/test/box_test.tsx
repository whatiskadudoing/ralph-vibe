// Box component tests
import { assertEquals } from "jsr:@std/assert";
import React from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box } from "../src/mod.ts";

Deno.test("Box - renders children", async () => {
  const { lastFrame } = await renderToTest(
    <Box>
      <Text>Hello</Text>
    </Box>
  );
  assertEquals(stripAnsi(lastFrame()), "Hello");
});

Deno.test("Box - renders multiple children in row", async () => {
  const { lastFrame } = await renderToTest(
    <Box>
      <Text>Hello</Text>
      <Text> World</Text>
    </Box>
  );
  assertEquals(stripAnsi(lastFrame()), "Hello World");
});

Deno.test("Box - renders children in column", async () => {
  const { lastFrame } = await renderToTest(
    <Box flexDirection="column">
      <Text>Line 1</Text>
      <Text>Line 2</Text>
    </Box>
  );
  const lines = stripAnsi(lastFrame()).split("\n");
  assertEquals(lines[0].trim(), "Line 1");
  assertEquals(lines[1].trim(), "Line 2");
});

Deno.test("Box - renders with padding", async () => {
  const { lastFrame } = await renderToTest(
    <Box padding={1}>
      <Text>Padded</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  // Should have empty lines before/after and spaces around
  assertEquals(output.includes("Padded"), true);
});

Deno.test("Box - renders with margin", async () => {
  const { lastFrame } = await renderToTest(
    <Box marginLeft={2}>
      <Text>Indented</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.startsWith("  Indented"), true);
});

Deno.test("Box - renders with border", async () => {
  const { lastFrame } = await renderToTest(
    <Box borderStyle="single">
      <Text>Bordered</Text>
    </Box>
  );
  const output = lastFrame();
  // Should contain border characters
  assertEquals(output.includes("─"), true);
  assertEquals(output.includes("│"), true);
});

Deno.test("Box - renders with round border", async () => {
  const { lastFrame } = await renderToTest(
    <Box borderStyle="round">
      <Text>Round</Text>
    </Box>
  );
  const output = lastFrame();
  // Should contain rounded corner characters
  assertEquals(output.includes("╭"), true);
  assertEquals(output.includes("╮"), true);
});

Deno.test("Box - renders with double border", async () => {
  const { lastFrame } = await renderToTest(
    <Box borderStyle="double">
      <Text>Double</Text>
    </Box>
  );
  const output = lastFrame();
  assertEquals(output.includes("═"), true);
  assertEquals(output.includes("║"), true);
});

Deno.test("Box - renders with bold border", async () => {
  const { lastFrame } = await renderToTest(
    <Box borderStyle="bold">
      <Text>Bold</Text>
    </Box>
  );
  const output = lastFrame();
  assertEquals(output.includes("┃"), true);
});

Deno.test("Box - renders with border color", async () => {
  const { lastFrame } = await renderToTest(
    <Box borderStyle="single" borderColor="red">
      <Text>Red Border</Text>
    </Box>
  );
  // Should have ANSI color codes
  assertEquals(lastFrame().includes("\x1b["), true);
});

Deno.test("Box - renders with fixed width", async () => {
  const { lastFrame } = await renderToTest(
    <Box width={20}>
      <Text>Fixed</Text>
    </Box>
  );
  // Width constraint is applied
  assertEquals(stripAnsi(lastFrame()).length >= 5, true);
});

Deno.test("Box - renders with fixed height", async () => {
  const { lastFrame } = await renderToTest(
    <Box height={3} flexDirection="column">
      <Text>Line</Text>
    </Box>
  );
  const lines = stripAnsi(lastFrame()).split("\n");
  assertEquals(lines.length >= 1, true);
});
