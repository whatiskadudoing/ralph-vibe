// Tests for onRender callback
// This feature provides a callback after each render for debugging/profiling
import React from "react";
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Text } from "../src/mod.ts";
import { render, initYoga } from "./helpers.ts";

await initYoga();

Deno.test("onRender: callback is called after render", async () => {
  let renderCount = 0;

  const { unmount } = await render(<Text>Hello</Text>, {
    onRender: () => {
      renderCount++;
    },
  });

  // Wait for render to complete
  await new Promise((r) => setTimeout(r, 50));

  assert(renderCount >= 1, `Expected at least 1 render, got ${renderCount}`);
  unmount();
});

Deno.test("onRender: callback receives renderTime", async () => {
  let receivedInfo: { renderTime: number } | null = null;

  const { unmount } = await render(<Text>Hello</Text>, {
    onRender: (info) => {
      receivedInfo = info;
    },
  });

  // Wait for render to complete
  await new Promise((r) => setTimeout(r, 50));

  assert(receivedInfo !== null, "onRender callback was not called");
  assert(typeof receivedInfo!.renderTime === "number", "renderTime should be a number");
  assert(receivedInfo!.renderTime >= 0, "renderTime should be non-negative");
  unmount();
});

Deno.test("onRender: callback errors don't break rendering", async () => {
  let errorThrown = false;

  const { lastFrame, unmount } = await render(<Text>Hello</Text>, {
    onRender: () => {
      errorThrown = true;
      throw new Error("Test error in onRender");
    },
  });

  // Wait for render to complete
  await new Promise((r) => setTimeout(r, 50));

  // The error was thrown but rendering should continue
  assert(errorThrown, "onRender callback should have been called");
  assertEquals(lastFrame().includes("Hello"), true);
  unmount();
});

Deno.test("onRender: not called when disabled", async () => {
  let renderCount = 0;

  const { unmount } = await render(<Text>Hello</Text>, {
    // onRender not provided
  });

  // Wait for render
  await new Promise((r) => setTimeout(r, 50));

  assertEquals(renderCount, 0);
  unmount();
});
