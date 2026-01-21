// useInput hook tests
import { assertEquals } from "jsr:@std/assert";
import React, { useState } from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box, useInput } from "../src/mod.ts";

function InputTest() {
  const [lastKey, setLastKey] = useState("none");

  useInput((input, key) => {
    if (key.upArrow) setLastKey("up");
    else if (key.downArrow) setLastKey("down");
    else if (key.leftArrow) setLastKey("left");
    else if (key.rightArrow) setLastKey("right");
    else if (key.return) setLastKey("return");
    else if (key.escape) setLastKey("escape");
    else if (key.tab) setLastKey("tab");
    else if (key.backspace) setLastKey("backspace");
    else if (key.delete) setLastKey("delete");
    else if (key.pageUp) setLastKey("pageUp");
    else if (key.pageDown) setLastKey("pageDown");
    else if (key.home) setLastKey("home");
    else if (key.end) setLastKey("end");
    else if (key.ctrl) setLastKey(`ctrl+${input}`);
    else if (input) setLastKey(`char:${input}`);
  });

  return <Text>Key: {lastKey}</Text>;
}

Deno.test("Input - detects regular characters", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("a");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("char:a"), true);
});

Deno.test("Input - detects uppercase characters", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("A");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("char:A"), true);
});

Deno.test("Input - detects up arrow", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[A");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: up"), true);
});

Deno.test("Input - detects down arrow", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[B");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: down"), true);
});

Deno.test("Input - detects left arrow", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[D");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: left"), true);
});

Deno.test("Input - detects right arrow", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[C");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: right"), true);
});

Deno.test("Input - detects return/enter", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\r");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: return"), true);
});

Deno.test("Input - detects escape", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: escape"), true);
});

Deno.test("Input - detects tab", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\t");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: tab"), true);
});

Deno.test("Input - detects backspace", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x7f");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: backspace"), true);
});

Deno.test("Input - detects delete", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[3~");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: delete"), true);
});

Deno.test("Input - detects page up", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[5~");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: pageUp"), true);
});

Deno.test("Input - detects page down", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[6~");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: pageDown"), true);
});

Deno.test("Input - detects home", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[H");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: home"), true);
});

Deno.test("Input - detects end", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x1b[F");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Key: end"), true);
});

Deno.test("Input - detects ctrl+c", async () => {
  const { lastFrame, stdin } = await renderToTest(<InputTest />);
  
  stdin.write("\x03"); // Ctrl+C
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("ctrl+"), true);
});

// Test isActive option
function ConditionalInputTest() {
  const [active, setActive] = useState(true);
  const [lastKey, setLastKey] = useState("none");

  useInput(
    (input) => {
      setLastKey(`active:${input}`);
    },
    { isActive: active }
  );

  return (
    <Box flexDirection="column">
      <Text>Active: {active ? "yes" : "no"}</Text>
      <Text>Key: {lastKey}</Text>
    </Box>
  );
}

Deno.test("Input - isActive controls input handling", async () => {
  const { lastFrame, stdin } = await renderToTest(<ConditionalInputTest />);
  
  stdin.write("x");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("active:x"), true);
});
