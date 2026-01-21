/**
 * @module components/TitleBox
 *
 * Box with title in border using deno-ink.
 * Creates a box with a title integrated into the top border.
 */

import { Box, Text, type Styles } from "@ink/mod.ts";
import type { ReactNode } from "react";

export type BorderStyle = "single" | "round" | "double" | "bold";

export interface TitleBoxProps {
  /** Box title (appears in top border) */
  title?: string;
  /** Title icon (appears before title) */
  titleIcon?: string;
  /** Title color */
  titleColor?: string;
  /** Footer text (appears in bottom border) */
  footer?: string;
  /** Footer color */
  footerColor?: string;
  /** Border style */
  borderStyle?: BorderStyle;
  /** Border color */
  borderColor?: string;
  /** Box width */
  width?: number | string;
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Children content */
  children?: ReactNode;
}

// Border characters for different styles
const BORDERS: Record<BorderStyle, {
  topLeft: string;
  top: string;
  topRight: string;
  left: string;
  right: string;
  bottomLeft: string;
  bottom: string;
  bottomRight: string;
}> = {
  single: {
    topLeft: "┌",
    top: "─",
    topRight: "┐",
    left: "│",
    right: "│",
    bottomLeft: "└",
    bottom: "─",
    bottomRight: "┘",
  },
  round: {
    topLeft: "╭",
    top: "─",
    topRight: "╮",
    left: "│",
    right: "│",
    bottomLeft: "╰",
    bottom: "─",
    bottomRight: "╯",
  },
  double: {
    topLeft: "╔",
    top: "═",
    topRight: "╗",
    left: "║",
    right: "║",
    bottomLeft: "╚",
    bottom: "═",
    bottomRight: "╝",
  },
  bold: {
    topLeft: "┏",
    top: "━",
    topRight: "┓",
    left: "┃",
    right: "┃",
    bottomLeft: "┗",
    bottom: "━",
    bottomRight: "┛",
  },
};

export function TitleBox({
  title,
  titleIcon,
  titleColor,
  footer,
  footerColor,
  borderStyle = "round",
  borderColor,
  width,
  padding = 0,
  paddingX,
  paddingY,
  children,
}: TitleBoxProps): React.ReactElement {
  const border = BORDERS[borderStyle];
  const px = paddingX ?? padding;
  const py = paddingY ?? padding;

  // For now, use Box's built-in border with title shown inside
  // A full title-in-border implementation would require custom rendering
  const boxStyle: Styles = {
    borderStyle: borderStyle === "round" ? "round" : borderStyle,
    borderColor,
    paddingX: px,
    paddingY: py,
    width: width as number | undefined,
    flexDirection: "column",
  };

  return (
    <Box {...boxStyle}>
      {title && (
        <Box marginBottom={py > 0 ? 0 : 1}>
          {titleIcon && <Text color={titleColor ?? borderColor}>{titleIcon} </Text>}
          <Text bold color={titleColor ?? borderColor}>
            {title}
          </Text>
        </Box>
      )}
      {children}
      {footer && (
        <Box marginTop={py > 0 ? 0 : 1}>
          <Text dimColor color={footerColor}>
            {footer}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Simple bordered box (no title)
export function BorderedBox({
  borderStyle = "round",
  borderColor,
  padding = 1,
  paddingX,
  paddingY,
  width,
  children,
}: Omit<TitleBoxProps, "title" | "titleIcon" | "titleColor" | "footer" | "footerColor">): React.ReactElement {
  const px = paddingX ?? padding;
  const py = paddingY ?? padding;

  const boxStyle: Styles = {
    borderStyle: borderStyle === "round" ? "round" : borderStyle,
    borderColor,
    paddingX: px,
    paddingY: py,
    width: width as number | undefined,
  };

  return <Box {...boxStyle}>{children}</Box>;
}
