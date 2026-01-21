// Text component tests
import { assertEquals } from "jsr:@std/assert";
import React from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box } from "../src/mod.ts";

Deno.test("Text - renders basic text", async () => {
  const { lastFrame } = await renderToTest(<Text>Hello World</Text>);
  assertEquals(stripAnsi(lastFrame()), "Hello World");
});

Deno.test("Text - renders text with variable", async () => {
  const name = "World";
  const { lastFrame } = await renderToTest(<Text>Hello {name}</Text>);
  assertEquals(stripAnsi(lastFrame()), "Hello World");
});

Deno.test("Text - renders multiple text nodes", async () => {
  const { lastFrame } = await renderToTest(
    <Text>
      {"Hello "}
      {"World"}
    </Text>
  );
  assertEquals(stripAnsi(lastFrame()), "Hello World");
});

Deno.test("Text - renders undefined as empty", async () => {
  const { lastFrame } = await renderToTest(<Text>{undefined}</Text>);
  assertEquals(stripAnsi(lastFrame()), "");
});

Deno.test("Text - renders null as empty", async () => {
  const { lastFrame } = await renderToTest(<Text>{null}</Text>);
  assertEquals(stripAnsi(lastFrame()), "");
});

Deno.test("Text - renders with bold", async () => {
  const { lastFrame } = await renderToTest(<Text bold>Bold</Text>);
  // Bold text should have ANSI codes
  assertEquals(lastFrame().includes("\x1b[1m"), true);
  assertEquals(stripAnsi(lastFrame()), "Bold");
});

Deno.test("Text - renders with color", async () => {
  const { lastFrame } = await renderToTest(<Text color="red">Red</Text>);
  assertEquals(stripAnsi(lastFrame()), "Red");
});

Deno.test("Text - renders with dim", async () => {
  const { lastFrame } = await renderToTest(<Text dimColor>Dim</Text>);
  assertEquals(stripAnsi(lastFrame()), "Dim");
});

Deno.test("Text - renders with italic", async () => {
  const { lastFrame } = await renderToTest(<Text italic>Italic</Text>);
  assertEquals(stripAnsi(lastFrame()), "Italic");
});

Deno.test("Text - renders with underline", async () => {
  const { lastFrame } = await renderToTest(<Text underline>Underline</Text>);
  assertEquals(stripAnsi(lastFrame()), "Underline");
});

Deno.test("Text - renders with strikethrough", async () => {
  const { lastFrame } = await renderToTest(<Text strikethrough>Strike</Text>);
  assertEquals(stripAnsi(lastFrame()), "Strike");
});

Deno.test("Text - renders with inverse", async () => {
  const { lastFrame } = await renderToTest(<Text inverse>Inverse</Text>);
  assertEquals(stripAnsi(lastFrame()), "Inverse");
});

Deno.test("Text - renders nested text", async () => {
  const { lastFrame } = await renderToTest(
    <Text>
      Hello <Text color="green">World</Text>
    </Text>
  );
  assertEquals(stripAnsi(lastFrame()), "Hello World");
});
