import React from "react";
import { Box, Text } from "./src/mod.ts";
import { renderToString, initYoga } from "./test/helpers.ts";

await initYoga();

Deno.test("display: none - debug", () => {
  const output = renderToString(
    <Box flexDirection="column">
      <Box display="none">
        <Text>Kitty!</Text>
      </Box>
      <Text>Doggo</Text>
    </Box>
  );

  console.log("Output length:", output.length);
  console.log("Output repr:", JSON.stringify(output));
  console.log("Expected repr:", JSON.stringify("Doggo"));
});
