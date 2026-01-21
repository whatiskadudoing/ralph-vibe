// deno-lint-ignore-file no-explicit-any
import cliBoxes from "cli-boxes";
import stringWidth from "string-width";
import type { DOMElement, DOMNode } from "./dom.ts";
import { isTextNode, squashTextNodes } from "./dom.ts";
import { Output, wrapText } from "./output.ts";
import {
  colorize,
  bold,
  dim,
  italic,
  underline,
  inverse,
  strikethrough,
} from "./colors.ts";

interface RenderContext {
  output: Output;
  offsetX: number;
  offsetY: number;
}

// Apply text styles
function applyTextStyles(
  text: string,
  style: Record<string, any>
): string {
  let result = text;

  if (style.dimColor) {
    result = dim(result);
  }

  if (style.color) {
    result = colorize(result, style.color, "foreground");
  }

  if (style.backgroundColor) {
    result = colorize(result, style.backgroundColor, "background");
  }

  if (style.bold) {
    result = bold(result);
  }

  if (style.italic) {
    result = italic(result);
  }

  if (style.underline) {
    result = underline(result);
  }

  if (style.strikethrough) {
    result = strikethrough(result);
  }

  if (style.inverse) {
    result = inverse(result);
  }

  return result;
}

// Render a border around content
function renderBorder(
  output: Output,
  x: number,
  y: number,
  width: number,
  height: number,
  style: Record<string, any>
): void {
  const borderStyle = style.borderStyle || "single";
  const boxStyle = cliBoxes[borderStyle as keyof typeof cliBoxes];
  const box = (boxStyle && "topLeft" in boxStyle) ? boxStyle : cliBoxes.single;

  const showTop = style.borderTop !== false;
  const showBottom = style.borderBottom !== false;
  const showLeft = style.borderLeft !== false;
  const showRight = style.borderRight !== false;

  const topColor = style.borderTopColor || style.borderColor;
  const bottomColor = style.borderBottomColor || style.borderColor;
  const leftColor = style.borderLeftColor || style.borderColor;
  const rightColor = style.borderRightColor || style.borderColor;

  // Top border
  if (showTop && height > 0) {
    let topBorder = box.topLeft + box.top.repeat(Math.max(0, width - 2)) + box.topRight;
    if (topColor) {
      topBorder = colorize(topBorder, topColor, "foreground");
    }
    output.write(x, y, topBorder);
  }

  // Left and right borders
  for (let row = 1; row < height - 1; row++) {
    if (showLeft) {
      let leftChar = box.left;
      if (leftColor) {
        leftChar = colorize(leftChar, leftColor, "foreground");
      }
      output.write(x, y + row, leftChar);
    }
    if (showRight) {
      let rightChar = box.right;
      if (rightColor) {
        rightChar = colorize(rightChar, rightColor, "foreground");
      }
      output.write(x + width - 1, y + row, rightChar);
    }
  }

  // Bottom border
  if (showBottom && height > 1) {
    let bottomBorder =
      box.bottomLeft + box.bottom.repeat(Math.max(0, width - 2)) + box.bottomRight;
    if (bottomColor) {
      bottomBorder = colorize(bottomBorder, bottomColor, "foreground");
    }
    output.write(x, y + height - 1, bottomBorder);
  }
}

// Main render function
export function renderNode(
  node: DOMNode,
  context: RenderContext
): void {
  if (isTextNode(node)) {
    return; // Text nodes are handled by their parent
  }

  const yogaNode = node.yogaNode;
  if (!yogaNode) return;

  const x = context.offsetX + yogaNode.getComputedLeft();
  const y = context.offsetY + yogaNode.getComputedTop();
  const width = yogaNode.getComputedWidth();
  const height = yogaNode.getComputedHeight();

  const style = node.style || {};

  // Render background
  if (style.backgroundColor) {
    for (let row = 0; row < height; row++) {
      const bgLine = colorize(" ".repeat(width), style.backgroundColor, "background");
      context.output.write(x, y + row, bgLine);
    }
  }

  // Render border
  if (style.borderStyle) {
    renderBorder(context.output, x, y, width, height, style);
  }

  // Handle text nodes
  if (node.nodeName === "ink-text") {
    const text = squashTextNodes(node);
    const paddingLeft = yogaNode.getComputedPadding(1 as any) || 0; // EDGE_LEFT
    const paddingTop = yogaNode.getComputedPadding(0 as any) || 0; // EDGE_TOP

    const borderLeft = style.borderStyle && style.borderLeft !== false ? 1 : 0;
    const borderTop = style.borderStyle && style.borderTop !== false ? 1 : 0;

    const innerX = x + paddingLeft + borderLeft;
    const innerY = y + paddingTop + borderTop;

    // Calculate available width for text
    const borderRight = style.borderStyle && style.borderRight !== false ? 1 : 0;
    const paddingRight = yogaNode.getComputedPadding(3 as any) || 0; // EDGE_RIGHT
    const availableWidth = width - paddingLeft - paddingRight - borderLeft - borderRight;

    // Wrap text if needed
    let processedText = text;
    if (style.wrap !== "truncate" && style.wrap !== "truncate-middle" && style.wrap !== "truncate-start") {
      processedText = wrapText(text, availableWidth);
    }

    // Apply text styles
    const styledText = applyTextStyles(processedText, style);

    // Write each line
    const lines = styledText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      context.output.write(innerX, innerY + i, lines[i]);
    }

    return;
  }

  // Render children
  const childContext: RenderContext = {
    output: context.output,
    offsetX: x,
    offsetY: y,
  };

  for (const child of node.childNodes) {
    renderNode(child, childContext);
  }
}

// Calculate dimensions and render to string
export function renderToString(
  node: DOMElement,
  terminalWidth: number
): { output: string; height: number } {
  // Calculate layout
  const yogaNode = node.yogaNode;
  if (!yogaNode) {
    return { output: "", height: 0 };
  }

  yogaNode.calculateLayout(terminalWidth, undefined);

  const height = Math.ceil(yogaNode.getComputedHeight());
  const output = new Output({ width: terminalWidth, height: Math.max(height, 1) });

  renderNode(node, {
    output,
    offsetX: 0,
    offsetY: 0,
  });

  return {
    output: output.get(),
    height: output.getHeight(),
  };
}
