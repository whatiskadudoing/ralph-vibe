// Tests for stderr output option
// This feature allows rendering to stderr instead of stdout
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { render, initYoga } from "./helpers.ts";

await initYoga();

Deno.test("stderr: renders to stdout by default", async () => {
  // TODO: Implement when stderr option is added
  // Verify default output goes to stdout
});

Deno.test("stderr: renders to stderr when option enabled", async () => {
  // TODO: Implement when stderr option is added
  // let stderrOutput = "";
  // const mockStderr = {
  //   write: (data: Uint8Array) => {
  //     stderrOutput += new TextDecoder().decode(data);
  //   },
  //   rid: 2,
  // };
  //
  // const { lastFrame, unmount } = await render(<Text>Hello</Text>, {
  //   stderr: mockStderr,
  // });
  //
  // assertStringIncludes(stderrOutput, "Hello");
  // unmount();
});

Deno.test("stderr: useStderr hook returns correct stream", async () => {
  // TODO: Implement when stderr option is added
  // function TestComponent() {
  //   const { write } = useStderr();
  //   useEffect(() => {
  //     write("stderr message");
  //   }, []);
  //   return <Text>Content</Text>;
  // }
});

Deno.test("stderr: stdout and stderr can be used together", async () => {
  // TODO: Implement when stderr option is added
  // Verify both streams work independently
});

Deno.test("stderr: preserves ANSI codes in stderr", async () => {
  // TODO: Implement when stderr option is added
  // Verify colors work in stderr output
});
