// Tests for per-side border dim styling
// This feature allows dimming individual border sides
import React from "react";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

await initYoga();

Deno.test("border-dim-sides: dimTopBorder only dims top border", () => {
  // TODO: Implement when per-side border dim is added
  // const output = renderToString(
  //   <Box borderStyle="single" dimTopBorder>
  //     <Text>Content</Text>
  //   </Box>
  // );
  //
  // // Verify top border has dim escape code
  // // Verify other borders don't have dim code
});

Deno.test("border-dim-sides: dimBottomBorder only dims bottom border", () => {
  // TODO: Implement when per-side border dim is added
});

Deno.test("border-dim-sides: dimLeftBorder only dims left border", () => {
  // TODO: Implement when per-side border dim is added
});

Deno.test("border-dim-sides: dimRightBorder only dims right border", () => {
  // TODO: Implement when per-side border dim is added
});

Deno.test("border-dim-sides: multiple sides can be dimmed", () => {
  // TODO: Implement when per-side border dim is added
  // const output = renderToString(
  //   <Box borderStyle="single" dimTopBorder dimBottomBorder>
  //     <Text>Content</Text>
  //   </Box>
  // );
  //
  // // Verify top and bottom borders are dimmed
  // // Verify left and right borders are not dimmed
});

Deno.test("border-dim-sides: dim border combines with border color", () => {
  // TODO: Implement when per-side border dim is added
  // Verify dim and color can be used together
});

Deno.test("border-dim-sides: borderDimColor dims all borders", () => {
  // This should already work - verify existing behavior
  const output = renderToString(
    <Box borderStyle="single" borderDimColor width={10} height={3}>
      <Text>Hi</Text>
    </Box>
  );

  // Verify all borders have dim escape code
  assertStringIncludes(output, "\x1b[2m");
});
