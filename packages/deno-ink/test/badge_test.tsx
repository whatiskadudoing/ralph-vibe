// Tests for Badge component
// This component displays a status indicator with color variants
import React from "react";
import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Badge } from "../src/mod.ts";
import { renderToString, initYoga, stripAnsi } from "./helpers.ts";

await initYoga();

Deno.test("badge: renders text content", () => {
  const output = renderToString(<Badge>SUCCESS</Badge>);

  assertStringIncludes(stripAnsi(output), "SUCCESS");
});

Deno.test("badge: applies default blue color", () => {
  const output = renderToString(<Badge>INFO</Badge>);

  // Verify blue background ANSI code
  assertStringIncludes(output, "\x1b[44m"); // Blue background
});

Deno.test("badge: applies green color", () => {
  const output = renderToString(<Badge color="green">SUCCESS</Badge>);

  // Verify green background ANSI code
  assertStringIncludes(output, "\x1b[42m"); // Green background
});

Deno.test("badge: applies red color", () => {
  const output = renderToString(<Badge color="red">ERROR</Badge>);

  // Verify red background ANSI code
  assertStringIncludes(output, "\x1b[41m"); // Red background
});

Deno.test("badge: applies yellow color", () => {
  const output = renderToString(<Badge color="yellow">WARNING</Badge>);

  // Verify yellow background ANSI code
  assertStringIncludes(output, "\x1b[43m"); // Yellow background
});

Deno.test("badge: adds padding around text", () => {
  const output = stripAnsi(renderToString(<Badge>X</Badge>));

  // Badge should have space padding
  assertStringIncludes(output, " X ");
});

Deno.test("badge: renders with bold text", () => {
  const output = renderToString(<Badge>TEST</Badge>);

  // Verify bold ANSI code is applied
  assertStringIncludes(output, "\x1b[1m"); // Bold
});
