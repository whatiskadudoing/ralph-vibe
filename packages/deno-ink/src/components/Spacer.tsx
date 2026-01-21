import React from "react";
import { Box } from "./Box.tsx";

export function Spacer(): React.ReactElement {
  return React.createElement(Box, { flexGrow: 1 });
}
