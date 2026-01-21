// deno-lint-ignore-file no-explicit-any
import React, { type ReactNode } from "react";
import type { Styles } from "../styles.ts";

export interface BoxProps extends Styles {
  children?: ReactNode;
}

export function Box({ children, ...props }: BoxProps): React.ReactElement {
  const style: Styles = { ...props };

  return React.createElement(
    "ink-box" as any,
    { style },
    children
  );
}
