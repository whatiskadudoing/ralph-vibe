// Tests for text truncation with different positions
// This feature extends truncate to support start/middle/end truncation
import React from "react";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

await initYoga();

Deno.test("truncate: end truncation (default)", () => {
  const output = renderToString(
    <Box width={10}>
      <Text wrap="truncate">Hello World!</Text>
    </Box>
  );

  // Current behavior - truncates at end
  assertEquals(output, "Hello Wor…");
});

Deno.test("truncate: truncate-start truncates from beginning", () => {
  // TODO: Implement when truncate-start is added
  // const output = renderToString(
  //   <Box width={10}>
  //     <Text wrap="truncate-start">Hello World!</Text>
  //   </Box>
  // );
  //
  // assertEquals(output, "…lo World!");
});

Deno.test("truncate: truncate-middle truncates from middle", () => {
  // TODO: Implement when truncate-middle is added
  // const output = renderToString(
  //   <Box width={10}>
  //     <Text wrap="truncate-middle">Hello World!</Text>
  //   </Box>
  // );
  //
  // assertEquals(output, "Hell…orld!");
});

Deno.test("truncate: truncate-end explicit", () => {
  // TODO: Implement when truncate-end is added
  // const output = renderToString(
  //   <Box width={10}>
  //     <Text wrap="truncate-end">Hello World!</Text>
  //   </Box>
  // );
  //
  // assertEquals(output, "Hello Wor…");
});

Deno.test("truncate: preserves ANSI codes", () => {
  // TODO: Verify truncation preserves color codes
});

Deno.test("truncate: handles emoji correctly", () => {
  // TODO: Verify truncation handles wide characters
});

Deno.test("truncate: no ellipsis when content fits", () => {
  const output = renderToString(
    <Box width={20}>
      <Text wrap="truncate">Hello</Text>
    </Box>
  );

  assertEquals(output, "Hello");
});

Deno.test("truncate: custom truncation character", () => {
  // TODO: Implement when custom truncation character is added
  // const output = renderToString(
  //   <Box width={10}>
  //     <Text wrap="truncate" truncateChar="...">Hello World!</Text>
  //   </Box>
  // );
  //
  // assertEquals(output, "Hello W...");
});
