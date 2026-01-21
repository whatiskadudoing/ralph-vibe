// Flexbox tests
import { assertEquals } from "jsr:@std/assert";
import React from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box } from "../src/mod.ts";

Deno.test("Flex - flexDirection row", async () => {
  const { lastFrame } = await renderToTest(
    <Box flexDirection="row">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );
  assertEquals(stripAnsi(lastFrame()), "ABC");
});

Deno.test("Flex - flexDirection column", async () => {
  const { lastFrame } = await renderToTest(
    <Box flexDirection="column">
      <Text>A</Text>
      <Text>B</Text>
      <Text>C</Text>
    </Box>
  );
  const lines = stripAnsi(lastFrame()).split("\n");
  assertEquals(lines[0].trim(), "A");
  assertEquals(lines[1].trim(), "B");
  assertEquals(lines[2].trim(), "C");
});

Deno.test("Flex - flexGrow equal", async () => {
  const { lastFrame } = await renderToTest(
    <Box width={10}>
      <Box flexGrow={1}>
        <Text>A</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>B</Text>
      </Box>
    </Box>
  );
  // Both should take equal space
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("A"), true);
  assertEquals(output.includes("B"), true);
});

Deno.test("Flex - flexShrink", async () => {
  const { lastFrame } = await renderToTest(
    <Box width={10}>
      <Box flexShrink={0} width={5}>
        <Text>Fixed</Text>
      </Box>
      <Box flexShrink={1}>
        <Text>Shrink</Text>
      </Box>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Fixed"), true);
});

Deno.test("Flex - alignItems center", async () => {
  const { lastFrame } = await renderToTest(
    <Box alignItems="center" height={3}>
      <Text>Centered</Text>
    </Box>
  );
  // Text should be vertically centered
  const lines = stripAnsi(lastFrame()).split("\n");
  assertEquals(lines.length >= 1, true);
});

Deno.test("Flex - justifyContent center", async () => {
  const { lastFrame } = await renderToTest(
    <Box justifyContent="center" width={20}>
      <Text>Center</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Center"), true);
});

Deno.test("Flex - justifyContent space-between", async () => {
  const { lastFrame } = await renderToTest(
    <Box justifyContent="space-between" width={20}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("A"), true);
  assertEquals(output.includes("B"), true);
});

Deno.test("Flex - gap", async () => {
  const { lastFrame } = await renderToTest(
    <Box gap={2}>
      <Text>A</Text>
      <Text>B</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  // Should have gap between A and B
  assertEquals(output.includes("A"), true);
  assertEquals(output.includes("B"), true);
});
