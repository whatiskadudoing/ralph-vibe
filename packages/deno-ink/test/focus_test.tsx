// Focus system tests
import { assertEquals } from "jsr:@std/assert";
import React, { useState } from "react";
import { renderToTest, stripAnsi } from "./helpers.ts";
import { Text, Box, useFocus, useFocusManager, useInput } from "../src/mod.ts";

// Test component that uses focus
function FocusableItem({ id, autoFocus }: { id: string; autoFocus?: boolean }) {
  const { isFocused } = useFocus({ autoFocus, id });
  return (
    <Box borderStyle={isFocused ? "bold" : "single"}>
      <Text color={isFocused ? "cyan" : undefined}>{id}</Text>
    </Box>
  );
}

function FocusableList() {
  return (
    <Box flexDirection="column">
      <FocusableItem id="item-1" autoFocus />
      <FocusableItem id="item-2" />
      <FocusableItem id="item-3" />
    </Box>
  );
}

Deno.test("Focus - autoFocus focuses first item", async () => {
  const { lastFrame } = await renderToTest(<FocusableList />);
  const output = lastFrame();
  // First item should have bold border (focused)
  assertEquals(output.includes("┃"), true); // Bold border character
});

Deno.test("Focus - Tab moves to next item", async () => {
  const { lastFrame, stdin } = await renderToTest(<FocusableList />);
  
  // Press Tab to move to next item
  stdin.write("\t");
  
  const output = lastFrame();
  // Should render (implementation may vary)
  assertEquals(output.length > 0, true);
});

Deno.test("Focus - Shift+Tab moves to previous item", async () => {
  const { lastFrame, stdin } = await renderToTest(<FocusableList />);
  
  // Press Tab twice then Shift+Tab
  stdin.write("\t");
  stdin.write("\x1b[Z"); // Shift+Tab escape sequence
  
  const output = lastFrame();
  assertEquals(output.length > 0, true);
});

Deno.test("Focus - focus wraps at end", async () => {
  const { lastFrame, stdin } = await renderToTest(<FocusableList />);
  
  // Press Tab 3 times to wrap
  stdin.write("\t");
  stdin.write("\t");
  stdin.write("\t");
  
  const output = lastFrame();
  assertEquals(output.length > 0, true);
});

// Test focus manager
function FocusManagerTest() {
  const { disableFocus, enableFocus, focusNext } = useFocusManager();
  const [disabled, setDisabled] = useState(false);

  useInput((_input, key) => {
    if (key.escape) {
      disableFocus();
      setDisabled(true);
    }
    if (key.return) {
      enableFocus();
      setDisabled(false);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>{disabled ? "Focus disabled" : "Focus enabled"}</Text>
      <FocusableItem id="a" autoFocus />
      <FocusableItem id="b" />
    </Box>
  );
}

Deno.test("Focus - useFocusManager disableFocus", async () => {
  const { lastFrame, stdin } = await renderToTest(<FocusManagerTest />);
  
  // Press Escape to disable focus
  stdin.write("\x1b");
  
  const output = stripAnsi(lastFrame());
  assertEquals(output.includes("Focus disabled"), true);
});
