// Tests for ConfirmInput component
// This component provides a Y/n confirmation prompt
import React from "react";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ConfirmInput } from "../src/mod.ts";
import { render, initYoga, stripAnsi } from "./helpers.ts";

await initYoga();

Deno.test("confirm-input: renders Y/n prompt by default", async () => {
  const { lastFrame, unmount } = await render(
    <ConfirmInput onConfirm={() => {}} onCancel={() => {}} />
  );

  assertStringIncludes(stripAnsi(lastFrame()), "(Y/n)");
  unmount();
});

Deno.test("confirm-input: renders y/N when defaultValue is false", async () => {
  const { lastFrame, unmount } = await render(
    <ConfirmInput onConfirm={() => {}} onCancel={() => {}} defaultValue={false} />
  );

  assertStringIncludes(stripAnsi(lastFrame()), "(y/N)");
  unmount();
});

Deno.test("confirm-input: calls onConfirm when Y is pressed", async () => {
  let confirmed = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => { confirmed = true; }} onCancel={() => {}} />
  );

  stdin.write("Y");
  assertEquals(confirmed, true);
  unmount();
});

Deno.test("confirm-input: calls onConfirm when y is pressed", async () => {
  let confirmed = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => { confirmed = true; }} onCancel={() => {}} />
  );

  stdin.write("y");
  assertEquals(confirmed, true);
  unmount();
});

Deno.test("confirm-input: calls onCancel when N is pressed", async () => {
  let cancelled = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => {}} onCancel={() => { cancelled = true; }} />
  );

  stdin.write("N");
  assertEquals(cancelled, true);
  unmount();
});

Deno.test("confirm-input: calls onCancel when n is pressed", async () => {
  let cancelled = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => {}} onCancel={() => { cancelled = true; }} />
  );

  stdin.write("n");
  assertEquals(cancelled, true);
  unmount();
});

Deno.test("confirm-input: Enter uses defaultValue (true)", async () => {
  let confirmed = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => { confirmed = true; }} onCancel={() => {}} defaultValue={true} />
  );

  stdin.write("\r"); // Enter key
  assertEquals(confirmed, true);
  unmount();
});

Deno.test("confirm-input: Enter uses defaultValue (false)", async () => {
  let cancelled = false;

  const { stdin, unmount } = await render(
    <ConfirmInput onConfirm={() => {}} onCancel={() => { cancelled = true; }} defaultValue={false} />
  );

  stdin.write("\r"); // Enter key
  assertEquals(cancelled, true);
  unmount();
});
