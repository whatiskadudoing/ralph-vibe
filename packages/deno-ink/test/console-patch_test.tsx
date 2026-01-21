// Tests for console patching feature
// This feature intercepts console.log/warn/error during rendering
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { patchConsole } from "../src/console-patch.ts";

Deno.test("console-patch: intercepts console.log", () => {
  const originalLog = console.log;
  let stdoutOutput = "";
  let stderrOutput = "";

  const patched = patchConsole(
    (data) => { stdoutOutput += data; },
    (data) => { stderrOutput += data; }
  );

  // Log should be intercepted
  console.log("test message");
  assertEquals(stdoutOutput, ""); // Not written yet

  // Flush should write the output
  patched.flush();
  assertStringIncludes(stdoutOutput, "test message");

  // Restore
  patched.restore();
  assertEquals(console.log, originalLog);
});

Deno.test("console-patch: intercepts console.warn", () => {
  const originalWarn = console.warn;
  let stderrOutput = "";

  const patched = patchConsole(
    () => {},
    (data) => { stderrOutput += data; }
  );

  console.warn("warning message");
  patched.flush();

  assertStringIncludes(stderrOutput, "warning message");
  patched.restore();
  assertEquals(console.warn, originalWarn);
});

Deno.test("console-patch: intercepts console.error", () => {
  const originalError = console.error;
  let stderrOutput = "";

  const patched = patchConsole(
    () => {},
    (data) => { stderrOutput += data; }
  );

  console.error("error message");
  patched.flush();

  assertStringIncludes(stderrOutput, "error message");
  patched.restore();
  assertEquals(console.error, originalError);
});

Deno.test("console-patch: restores original console on restore", () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const patched = patchConsole(() => {}, () => {});

  // Console methods should be patched
  assertEquals(console.log !== originalLog, true);
  assertEquals(console.warn !== originalWarn, true);
  assertEquals(console.error !== originalError, true);

  patched.restore();

  // Console methods should be restored
  assertEquals(console.log, originalLog);
  assertEquals(console.warn, originalWarn);
  assertEquals(console.error, originalError);
});

Deno.test("console-patch: handles multiple console calls", () => {
  let output = "";

  const patched = patchConsole(
    (data) => { output += data; },
    () => {}
  );

  console.log("first");
  console.log("second");
  console.log("third");

  patched.flush();

  assertStringIncludes(output, "first");
  assertStringIncludes(output, "second");
  assertStringIncludes(output, "third");

  patched.restore();
});

Deno.test("console-patch: preserves argument types in output", () => {
  let output = "";

  const patched = patchConsole(
    (data) => { output += data; },
    () => {}
  );

  console.log("string", 123, { key: "value" });
  patched.flush();

  assertStringIncludes(output, "string");
  assertStringIncludes(output, "123");
  assertStringIncludes(output, "key");
  assertStringIncludes(output, "value");

  patched.restore();
});

Deno.test("console-patch: handles Error objects", () => {
  let output = "";

  const patched = patchConsole(
    () => {},
    (data) => { output += data; }
  );

  const error = new Error("test error");
  console.error(error);
  patched.flush();

  assertStringIncludes(output, "test error");

  patched.restore();
});

Deno.test("console-patch: flush clears buffer", () => {
  let output = "";

  const patched = patchConsole(
    (data) => { output += data; },
    () => {}
  );

  console.log("message");
  patched.flush();
  output = ""; // Reset

  // Second flush should not write anything
  patched.flush();
  assertEquals(output, "");

  patched.restore();
});
