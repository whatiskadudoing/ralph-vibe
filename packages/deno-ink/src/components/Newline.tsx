import React from "react";
import { Text } from "./Text.tsx";

export interface NewlineProps {
  count?: number;
}

export function Newline({ count = 1 }: NewlineProps): React.ReactElement {
  return React.createElement(Text, null, "\n".repeat(count));
}
