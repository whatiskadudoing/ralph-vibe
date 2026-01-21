// deno-lint-ignore-file no-explicit-any
// Transform component - transforms text output
import React, { useState, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface TransformProps {
  /**
   * Children to transform. Can be a string or React elements.
   */
  children: ReactNode;

  /**
   * Transform function that receives each line of output and returns transformed text.
   * The function receives the line content and the line index (0-based).
   */
  transform: (line: string, index: number) => string;
}

/**
 * Transform component that applies a transformation function to its children.
 * Useful for effects like gradient text, line numbering, etc.
 *
 * @example
 * ```tsx
 * // Add line numbers
 * <Transform transform={(line, index) => `${index + 1}: ${line}`}>
 *   <Text>First line</Text>
 *   <Text>Second line</Text>
 * </Transform>
 *
 * // Make text uppercase
 * <Transform transform={(line) => line.toUpperCase()}>
 *   <Text>hello world</Text>
 * </Transform>
 * ```
 */
export function Transform({ children, transform }: TransformProps) {
  const [transformedChildren, setTransformedChildren] = useState<ReactNode>(children);
  const childrenRef = useRef<ReactNode>(children);

  useLayoutEffect(() => {
    // Store the original children
    childrenRef.current = children;

    // Track the global line index
    let lineIndex = 0;

    // Transform the children
    const transformChildren = (node: ReactNode): ReactNode => {
      if (typeof node === "string") {
        const lines = node.split("\n");
        const transformedLines = lines.map((line) => {
          const result = transform(line, lineIndex);
          lineIndex++;
          return result;
        });
        return transformedLines.join("\n");
      }

      if (typeof node === "number") {
        const result = transform(String(node), lineIndex);
        lineIndex++;
        return result;
      }

      if (Array.isArray(node)) {
        return node.map((child, idx) => {
          const result = transformChildren(child);
          // Add key if it's a valid element
          if (React.isValidElement(result)) {
            return React.cloneElement(result, { key: result.key ?? idx } as any);
          }
          return result;
        });
      }

      if (React.isValidElement(node)) {
        const elementChildren = (node.props as any).children;
        if (elementChildren !== undefined) {
          return React.cloneElement(node, {
            ...(node.props as any),
            children: transformChildren(elementChildren),
          } as any);
        }
      }

      return node;
    };

    setTransformedChildren(transformChildren(children));
  }, [children, transform]);

  return <>{transformedChildren}</>;
}
