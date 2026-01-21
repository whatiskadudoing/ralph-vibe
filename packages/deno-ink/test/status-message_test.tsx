// Tests for StatusMessage component
// This component displays a status message with variant styling
import React from "react";
import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { StatusMessage, Text } from "../src/mod.ts";
import { renderToString, initYoga, stripAnsi } from "./helpers.ts";

await initYoga();

Deno.test("status-message: renders success variant", () => {
  const output = renderToString(
    <StatusMessage variant="success">Operation completed</StatusMessage>
  );

  assertStringIncludes(stripAnsi(output), "✔");
  assertStringIncludes(stripAnsi(output), "Operation completed");
  // Verify green color
  assertStringIncludes(output, "\x1b[32m"); // Green
});

Deno.test("status-message: renders error variant", () => {
  const output = renderToString(
    <StatusMessage variant="error">Something went wrong</StatusMessage>
  );

  assertStringIncludes(stripAnsi(output), "✖");
  assertStringIncludes(stripAnsi(output), "Something went wrong");
  // Verify red color
  assertStringIncludes(output, "\x1b[31m"); // Red
});

Deno.test("status-message: renders warning variant", () => {
  const output = renderToString(
    <StatusMessage variant="warning">Proceed with caution</StatusMessage>
  );

  assertStringIncludes(stripAnsi(output), "⚠");
  assertStringIncludes(stripAnsi(output), "Proceed with caution");
  // Verify yellow color
  assertStringIncludes(output, "\x1b[33m"); // Yellow
});

Deno.test("status-message: renders info variant", () => {
  const output = renderToString(
    <StatusMessage variant="info">For your information</StatusMessage>
  );

  assertStringIncludes(stripAnsi(output), "ℹ");
  assertStringIncludes(stripAnsi(output), "For your information");
  // Verify blue color
  assertStringIncludes(output, "\x1b[34m"); // Blue
});

Deno.test("status-message: symbol and text are separated", () => {
  const output = stripAnsi(
    renderToString(<StatusMessage variant="success">Done</StatusMessage>)
  );

  // There should be a space between symbol and text
  assertStringIncludes(output, "✔ Done");
});

Deno.test("status-message: supports nested content", () => {
  const output = renderToString(
    <StatusMessage variant="info">
      <Text bold>Important:</Text> Read this carefully
    </StatusMessage>
  );

  assertStringIncludes(stripAnsi(output), "Important:");
  assertStringIncludes(stripAnsi(output), "Read this carefully");
});
