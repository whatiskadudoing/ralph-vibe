// Port of ink/test/borders.tsx
import React from "react";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, render, initYoga, stripAnsi } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

Deno.test("borders: single node - fit-content box", () => {
  const output = renderToString(
    <Box borderStyle="round" alignSelf="flex-start">
      <Text>Hello World</Text>
    </Box>
  );

  // Should have border characters
  assertStringIncludes(output, "Hello World");
  assertStringIncludes(output, "╭"); // top-left corner
  assertStringIncludes(output, "╯"); // bottom-right corner
});

Deno.test("borders: single node - fixed width box", () => {
  const output = renderToString(
    <Box borderStyle="round" width={20}>
      <Text>Hello World</Text>
    </Box>
  );

  assertStringIncludes(output, "Hello World");
  assertStringIncludes(output, "╭");
  assertStringIncludes(output, "╯");
});

Deno.test("borders: single node - box with padding", () => {
  const output = renderToString(
    <Box borderStyle="round" padding={1} alignSelf="flex-start">
      <Text>Hello World</Text>
    </Box>
  );

  assertStringIncludes(output, "Hello World");
  assertStringIncludes(output, "╭");
});

Deno.test("borders: hide top border", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-start">
      <Text>Above</Text>
      <Box borderStyle="round" borderTop={false}>
        <Text>Content</Text>
      </Box>
      <Text>Below</Text>
    </Box>
  );

  assertStringIncludes(output, "Above");
  assertStringIncludes(output, "Content");
  assertStringIncludes(output, "Below");
  // Should have left/right borders but not top
  assertStringIncludes(output, "│");
  assertStringIncludes(output, "╰"); // bottom-left
});

Deno.test("borders: hide bottom border", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-start">
      <Text>Above</Text>
      <Box borderStyle="round" borderBottom={false}>
        <Text>Content</Text>
      </Box>
      <Text>Below</Text>
    </Box>
  );

  assertStringIncludes(output, "Above");
  assertStringIncludes(output, "Content");
  assertStringIncludes(output, "Below");
  assertStringIncludes(output, "╭"); // top-left
});

Deno.test("borders: hide left border", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-start">
      <Text>Above</Text>
      <Box borderStyle="round" borderLeft={false}>
        <Text>Content</Text>
      </Box>
      <Text>Below</Text>
    </Box>
  );

  assertStringIncludes(output, "Content");
  assertStringIncludes(output, "╮"); // top-right
});

Deno.test("borders: hide right border", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-start">
      <Text>Above</Text>
      <Box borderStyle="round" borderRight={false}>
        <Text>Content</Text>
      </Box>
      <Text>Below</Text>
    </Box>
  );

  assertStringIncludes(output, "Content");
  assertStringIncludes(output, "╭"); // top-left
});

Deno.test("borders: hide all borders", () => {
  const output = renderToString(
    <Box flexDirection="column" alignItems="flex-start">
      <Text>Above</Text>
      <Box
        borderStyle="round"
        borderTop={false}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text>Content</Text>
      </Box>
      <Text>Below</Text>
    </Box>
  );

  assertEquals(output, "Above\nContent\nBelow");
});

Deno.test("borders: border color", () => {
  const output = renderToString(
    <Box borderStyle="round" borderColor="green" alignSelf="flex-start">
      <Text>Hello</Text>
    </Box>
  );

  // Should contain ANSI color codes for green
  assertStringIncludes(output, "Hello");
  assertStringIncludes(output, "\x1b["); // ANSI escape sequence
});

Deno.test("borders: different border styles", () => {
  const styles = ["single", "double", "round", "bold", "singleDouble", "doubleSingle", "classic"] as const;

  for (const style of styles) {
    const output = renderToString(
      <Box borderStyle={style} alignSelf="flex-start">
        <Text>Test</Text>
      </Box>
    );

    assertStringIncludes(output, "Test");
  }
});

Deno.test("borders: render border after update", async () => {
  function Test({ borderColor }: { borderColor?: string }) {
    return (
      <Box borderStyle="round" borderColor={borderColor} alignSelf="flex-start">
        <Text>Hello World</Text>
      </Box>
    );
  }

  const { lastFrame, rerender } = await render(<Test />);

  assertStringIncludes(lastFrame(), "Hello World");
  assertStringIncludes(lastFrame(), "╭");

  rerender(<Test borderColor="green" />);
  assertStringIncludes(lastFrame(), "Hello World");
  assertStringIncludes(lastFrame(), "\x1b["); // ANSI escape for color

  rerender(<Test />);
  assertStringIncludes(lastFrame(), "Hello World");
});

Deno.test("borders: dim border color", () => {
  const output = renderToString(
    <Box borderDimColor borderStyle="round" alignSelf="flex-start">
      <Text>Content</Text>
    </Box>
  );

  assertStringIncludes(output, "Content");
  // Should have dim ANSI code
  assertStringIncludes(output, "\x1b[2m");
});

Deno.test("borders: custom border style", () => {
  const output = renderToString(
    <Box
      borderStyle={{
        topLeft: "↘",
        top: "↓",
        topRight: "↙",
        left: "→",
        bottomLeft: "↗",
        bottom: "↑",
        bottomRight: "↖",
        right: "←",
      }}
      alignSelf="flex-start"
    >
      <Text>Content</Text>
    </Box>
  );

  assertStringIncludes(output, "Content");
  assertStringIncludes(output, "↘");
  assertStringIncludes(output, "↙");
  assertStringIncludes(output, "↗");
  assertStringIncludes(output, "↖");
});
