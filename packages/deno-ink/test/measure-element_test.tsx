// Tests for measureElement utility
// This utility provides DOM-like measurement of rendered elements
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { measureElement } from "../src/mod.ts";
import { initYoga } from "./helpers.ts";

await initYoga();

Deno.test("measureElement: returns zero for null ref", () => {
  const ref = { current: null };
  const dims = measureElement(ref);
  assertEquals(dims, { width: 0, height: 0 });
});

Deno.test("measureElement: returns zero for ref without yoga node", () => {
  // Create a mock DOM element without yoga node
  const ref = {
    current: {
      nodeName: "ink-box",
      yogaNode: null,
      style: {},
      childNodes: [],
    } as any,
  };
  const dims = measureElement(ref);
  assertEquals(dims, { width: 0, height: 0 });
});

Deno.test("measureElement: returns dimensions from yoga node", () => {
  // Create a mock DOM element with a yoga node
  const mockYogaNode = {
    getComputedWidth: () => 100,
    getComputedHeight: () => 50,
  };

  const ref = {
    current: {
      nodeName: "ink-box",
      yogaNode: mockYogaNode,
      style: {},
      childNodes: [],
    } as any,
  };

  const dims = measureElement(ref);
  assertEquals(dims.width, 100);
  assertEquals(dims.height, 50);
});

Deno.test("measureElement: handles different dimension values", () => {
  // Test with various dimension values
  const mockYogaNode = {
    getComputedWidth: () => 0,
    getComputedHeight: () => 0,
  };

  const ref = {
    current: {
      nodeName: "ink-box",
      yogaNode: mockYogaNode,
      style: {},
      childNodes: [],
    } as any,
  };

  const dims = measureElement(ref);
  assertEquals(dims.width, 0);
  assertEquals(dims.height, 0);
});

Deno.test("measureElement: returns correct type", () => {
  const ref = { current: null };
  const dims = measureElement(ref);

  // Verify the return type has both width and height
  assertEquals(typeof dims.width, "number");
  assertEquals(typeof dims.height, "number");
});
