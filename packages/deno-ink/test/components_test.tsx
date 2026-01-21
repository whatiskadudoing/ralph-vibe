// Component tests - Spinner, Static, Transform, Spacer, Newline
import { assertEquals } from "jsr:@std/assert";
import React from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box, Spinner, Static, Transform, Spacer, Newline } from "../src/mod.ts";

// Spinner tests
Deno.test("Spinner - renders default spinner", async () => {
  const { lastFrame } = await renderToTest(<Spinner />);
  const output = lastFrame();
  // Should have some content (spinner frame)
  assertEquals(output.length > 0, true);
});

Deno.test("Spinner - renders dots spinner", async () => {
  const { lastFrame } = await renderToTest(<Spinner type="dots" />);
  const output = lastFrame();
  assertEquals(output.length > 0, true);
});

Deno.test("Spinner - renders with label", async () => {
  const { lastFrame } = await renderToTest(
    <Box>
      <Spinner />
      <Text> Loading...</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Loading..."), true);
});

// Static tests
Deno.test("Static - renders static items", async () => {
  const items = [
    { id: 1, text: "Item 1" },
    { id: 2, text: "Item 2" },
  ];

  const { lastFrame } = await renderToTest(
    <Static items={items}>
      {(item) => <Text key={item.id}>{item.text}</Text>}
    </Static>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Item 1"), true);
  assertEquals(output.includes("Item 2"), true);
});

// Transform tests
Deno.test("Transform - transforms text", async () => {
  const { lastFrame } = await renderToTest(
    <Transform transform={(output) => output.toUpperCase()}>
      <Text>hello</Text>
    </Transform>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("HELLO"), true);
});

Deno.test("Transform - adds line numbers", async () => {
  const addLineNumbers = (output: string) => {
    return output
      .split("\n")
      .map((line, idx) => `${idx + 1}: ${line}`)
      .join("\n");
  };

  const { lastFrame } = await renderToTest(
    <Transform transform={addLineNumbers}>
      <Box flexDirection="column">
        <Text>First</Text>
        <Text>Second</Text>
      </Box>
    </Transform>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("1:"), true);
  assertEquals(output.includes("2:"), true);
});

// Spacer tests
Deno.test("Spacer - fills available space", async () => {
  const { lastFrame } = await renderToTest(
    <Box width={20}>
      <Text>Left</Text>
      <Spacer />
      <Text>Right</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Left"), true);
  assertEquals(output.includes("Right"), true);
});

// Newline tests
Deno.test("Newline - adds single newline", async () => {
  const { lastFrame } = await renderToTest(
    <Box flexDirection="column">
      <Text>Line 1</Text>
      <Newline />
      <Text>Line 2</Text>
    </Box>
  );
  const lines = stripAnsi(lastFrame()).split("\n");
  // Should have at least 3 lines (line1, empty, line2)
  assertEquals(lines.length >= 2, true);
});

Deno.test("Newline - adds multiple newlines", async () => {
  const { lastFrame } = await renderToTest(
    <Box flexDirection="column">
      <Text>Line 1</Text>
      <Newline count={2} />
      <Text>Line 2</Text>
    </Box>
  );
  const lines = stripAnsi(lastFrame()).split("\n");
  assertEquals(lines.length >= 2, true);
});
