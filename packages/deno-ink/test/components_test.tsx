// Component tests - Spinner, Static, Transform, Spacer, Newline
// Port of ink/test/components.tsx
import React, { useState } from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text, Newline, Spacer, Transform, Spinner, Static } from "../src/mod.ts";
import { renderToString, render, initYoga, stripAnsi } from "./helpers.ts";

// Initialize yoga before tests
await initYoga();

// Basic text tests
Deno.test("components: text", () => {
  const output = renderToString(<Text>Hello World</Text>);
  assertEquals(output, "Hello World");
});

Deno.test("components: text with variable", () => {
  const output = renderToString(<Text>Count: {1}</Text>);
  assertEquals(output, "Count: 1");
});

Deno.test("components: multiple text nodes", () => {
  const output = renderToString(
    <Text>
      {"Hello"}
      {" World"}
    </Text>
  );
  assertEquals(output, "Hello World");
});

Deno.test("components: text with component", () => {
  function World() {
    return <Text>World</Text>;
  }

  const output = renderToString(
    <Text>
      Hello <World />
    </Text>
  );

  assertEquals(output, "Hello World");
});

Deno.test("components: text with fragment", () => {
  const output = renderToString(
    <Text>
      Hello <>World</>
    </Text>
  );

  assertEquals(output, "Hello World");
});

Deno.test("components: wrap text", () => {
  const output = renderToString(
    <Box width={7}>
      <Text wrap="wrap">Hello World</Text>
    </Box>
  );

  assertEquals(output, "Hello\nWorld");
});

Deno.test("components: don't wrap text if there is enough space", () => {
  const output = renderToString(
    <Box width={20}>
      <Text wrap="wrap">Hello World</Text>
    </Box>
  );

  assertEquals(output, "Hello World");
});

Deno.test("components: truncate text in the end", () => {
  const output = renderToString(
    <Box width={7}>
      <Text wrap="truncate">Hello World</Text>
    </Box>
  );

  assertEquals(output, "Hello …");
});

Deno.test("components: truncate text in the middle", () => {
  const output = renderToString(
    <Box width={7}>
      <Text wrap="truncate-middle">Hello World</Text>
    </Box>
  );

  assertEquals(output, "Hel…rld");
});

Deno.test("components: truncate text in the beginning", () => {
  const output = renderToString(
    <Box width={7}>
      <Text wrap="truncate-start">Hello World</Text>
    </Box>
  );

  assertEquals(output, "… World");
});

Deno.test("components: ignore empty text node", () => {
  const output = renderToString(
    <Box flexDirection="column">
      <Box>
        <Text>Hello World</Text>
      </Box>
      <Text>{""}</Text>
    </Box>
  );

  assertEquals(output, "Hello World");
});

Deno.test("components: render a single empty text node", () => {
  const output = renderToString(<Text>{""}</Text>);
  assertEquals(output, "");
});

Deno.test("components: number", () => {
  const output = renderToString(<Text>{1}</Text>);
  assertEquals(output, "1");
});

Deno.test("components: fragment", () => {
  const output = renderToString(
    <>
      <Text>Hello World</Text>
    </>
  );

  assertEquals(output, "Hello World");
});

// Transform tests
Deno.test("components: transform children", () => {
  const output = renderToString(
    <Transform transform={(s: string, i: number) => `[${i}: ${s}]`}>
      <Text>
        <Transform transform={(s: string, i: number) => `{${i}: ${s}}`}>
          <Text>test</Text>
        </Transform>
      </Text>
    </Transform>
  );

  assertEquals(output, "[0: {0: test}]");
});

Deno.test("components: squash multiple text nodes", () => {
  const output = renderToString(
    <Transform transform={(s: string, i: number) => `[${i}: ${s}]`}>
      <Text>
        <Transform transform={(s: string, i: number) => `{${i}: ${s}}`}>
          <Text>hello{" "}world</Text>
        </Transform>
      </Text>
    </Transform>
  );

  assertEquals(output, "[0: {0: hello world}]");
});

Deno.test("components: transform with multiple lines", () => {
  const output = renderToString(
    <Transform transform={(s: string, i: number) => `[${i}: ${s}]`}>
      <Text>hello{" "}world{"\n"}goodbye{" "}world</Text>
    </Transform>
  );

  assertEquals(output, "[0: hello world]\n[1: goodbye world]");
});

Deno.test("components: squash multiple nested text nodes", () => {
  const output = renderToString(
    <Transform transform={(s: string, i: number) => `[${i}: ${s}]`}>
      <Text>
        <Transform transform={(s: string, i: number) => `{${i}: ${s}}`}>
          hello
          <Text> world</Text>
        </Transform>
      </Text>
    </Transform>
  );

  assertEquals(output, "[0: {0: hello world}]");
});

// Hooks test
Deno.test("components: hooks", () => {
  function WithHooks() {
    const [value] = useState("Hello");
    return <Text>{value}</Text>;
  }

  const output = renderToString(<WithHooks />);
  assertEquals(output, "Hello");
});

// Newline tests
Deno.test("components: newline", () => {
  const output = renderToString(
    <Text>
      Hello
      <Newline />
      World
    </Text>
  );
  assertEquals(output, "Hello\nWorld");
});

Deno.test("components: multiple newlines", () => {
  const output = renderToString(
    <Text>
      Hello
      <Newline count={2} />
      World
    </Text>
  );
  assertEquals(output, "Hello\n\nWorld");
});

// Spacer tests
Deno.test("components: horizontal spacer", () => {
  const output = renderToString(
    <Box width={20}>
      <Text>Left</Text>
      <Spacer />
      <Text>Right</Text>
    </Box>
  );

  assertEquals(output, "Left           Right");
});

Deno.test("components: vertical spacer", () => {
  const output = renderToString(
    <Box flexDirection="column" height={6}>
      <Text>Top</Text>
      <Spacer />
      <Text>Bottom</Text>
    </Box>
  );

  assertEquals(output, "Top\n\n\n\n\nBottom");
});

// Spinner tests
Deno.test("components: spinner renders", async () => {
  const { lastFrame } = await render(<Spinner />);
  const output = lastFrame();
  // Should have some content (spinner frame)
  assertEquals(output.length > 0, true);
});

Deno.test("components: spinner with label", async () => {
  const { lastFrame } = await render(
    <Box>
      <Spinner />
      <Text> Loading...</Text>
    </Box>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Loading..."), true);
});

// Static tests
Deno.test("components: static renders items", async () => {
  const items = ["A", "B", "C"];

  const { lastFrame } = await render(
    <Static items={items}>
      {(item: string) => <Text key={item}>{item}</Text>}
    </Static>
  );
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("A"), true);
  assertEquals(output.includes("B"), true);
  assertEquals(output.includes("C"), true);
});

// Rerender tests
Deno.test("components: remeasure text dimensions on text change", async () => {
  const { lastFrame, rerender } = await render(
    <Box>
      <Text>Hello</Text>
    </Box>
  );

  assertEquals(lastFrame(), "Hello");

  rerender(
    <Box>
      <Text>Hello World</Text>
    </Box>
  );

  assertEquals(lastFrame(), "Hello World");
});

Deno.test("components: reset prop when it's removed from the element", async () => {
  function Dynamic({ remove }: { remove?: boolean }) {
    return (
      <Box
        flexDirection="column"
        justifyContent="flex-end"
        height={remove ? undefined : 4}
      >
        <Text>x</Text>
      </Box>
    );
  }

  const { lastFrame, rerender } = await render(<Dynamic />);

  assertEquals(lastFrame(), "\n\n\nx");

  rerender(<Dynamic remove />);
  assertEquals(lastFrame(), "x");
});
