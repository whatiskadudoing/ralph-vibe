import React from "react";
import { Box, Text } from "./src/mod.ts";
import { render, initYoga, stripAnsi } from "./test/helpers.ts";

await initYoga();

function Dynamic({ remove }: { remove?: boolean }) {
  return (
    <Box
      flexDirection="column"
      justifyContent="flex-end"
      height={remove ? undefined : 4}
    >
      <Text>x</Text>
    </Box>
  );
}

const { lastFrame, rerender, frames } = await render(<Dynamic />);

console.log("Initial render:");
console.log("Number of frames:", frames.length);
console.log("Last frame:", JSON.stringify(lastFrame()));
console.log("Expected: '\\n\\n\\nx'");
console.log("Match:", lastFrame() === "\n\n\nx");
console.log();

rerender(<Dynamic remove />);
console.log("After rerender (remove=true):");
console.log("Last frame:", JSON.stringify(lastFrame()));
console.log("Expected: 'x'");
console.log("Match:", lastFrame() === "x");
