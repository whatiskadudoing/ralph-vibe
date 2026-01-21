// Tests for ProgressBar component
// This component displays a progress bar with customizable appearance
import React from "react";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ProgressBar } from "../src/mod.ts";
import { renderToString, initYoga, stripAnsi } from "./helpers.ts";

await initYoga();

Deno.test("progress-bar: renders with default settings", () => {
  const output = renderToString(<ProgressBar value={50} />);

  // Should show 50% filled (default width is 20)
  assertStringIncludes(output, "█");
  assertStringIncludes(output, "░");
});

Deno.test("progress-bar: renders at 0%", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={0} width={10} />));

  assertEquals(output, "░░░░░░░░░░");
});

Deno.test("progress-bar: renders at 100%", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={100} width={10} />));

  assertEquals(output, "██████████");
});

Deno.test("progress-bar: respects custom width", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={50} width={20} />));

  // 10 filled, 10 empty
  assertEquals(output.length, 20);
});

Deno.test("progress-bar: uses custom characters", () => {
  const output = stripAnsi(
    renderToString(<ProgressBar value={50} width={10} character="=" backgroundCharacter="-" />)
  );

  assertEquals(output, "=====-----");
});

Deno.test("progress-bar: applies color to filled portion", () => {
  const output = renderToString(<ProgressBar value={50} width={10} color="cyan" />);

  // Verify color ANSI codes are applied (cyan is \x1b[36m)
  assertStringIncludes(output, "\x1b[36m");
});

Deno.test("progress-bar: handles values over 100", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={150} width={10} />));

  // Should cap at 100%
  assertEquals(output, "██████████");
});

Deno.test("progress-bar: handles negative values", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={-10} width={10} />));

  // Should treat as 0%
  assertEquals(output, "░░░░░░░░░░");
});

Deno.test("progress-bar: supports custom maxValue", () => {
  const output = stripAnsi(renderToString(<ProgressBar value={5} maxValue={10} width={10} />));

  // 50% of 10 = 5
  assertEquals(output, "█████░░░░░");
});
