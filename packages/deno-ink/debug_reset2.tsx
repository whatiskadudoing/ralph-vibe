import React from "react";
import { Box, Text } from "./src/mod.ts";
import { render, initYoga } from "./test/helpers.ts";

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

console.log("After initial render:");
console.log("Frames count:", frames.length);
frames.forEach((f, i) => console.log("Frame", i, ":", JSON.stringify(f)));
console.log();

rerender(<Dynamic remove />);
console.log("After rerender:");
console.log("Frames count:", frames.length);
frames.forEach((f, i) => console.log("Frame", i, ":", JSON.stringify(f)));
