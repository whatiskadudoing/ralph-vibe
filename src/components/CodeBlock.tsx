/**
 * @module components/CodeBlock
 *
 * Code display components using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";

export interface CodeBlockProps {
  /** Code content */
  code: string;
  /** Language for syntax highlighting hints */
  language?: string;
  /** Show line numbers */
  lineNumbers?: boolean;
  /** Starting line number */
  startLine?: number;
  /** Title/filename */
  title?: string;
  /** Border color */
  borderColor?: string;
  /** Highlight specific lines */
  highlightLines?: number[];
}

export function CodeBlock({
  code,
  language,
  lineNumbers = false,
  startLine = 1,
  title,
  borderColor,
  highlightLines = [],
}: CodeBlockProps): React.ReactElement {
  const lines = code.split("\n");
  const maxLineNum = startLine + lines.length - 1;
  const lineNumWidth = String(maxLineNum).length;

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
    >
      {title && (
        <Box marginBottom={1}>
          <Text dimColor>─ </Text>
          <Text bold>{title}</Text>
          {language && <Text dimColor> ({language})</Text>}
          <Text dimColor> ─</Text>
        </Box>
      )}
      {lines.map((line, index) => {
        const lineNum = startLine + index;
        const isHighlighted = highlightLines.includes(lineNum);

        return (
          <Box key={index}>
            {lineNumbers && (
              <Text dimColor>
                {String(lineNum).padStart(lineNumWidth)}
                {" │ "}
              </Text>
            )}
            <Text color={isHighlighted ? "yellow" : undefined}>
              {line || " "}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// Inline code
export function InlineCode({ children }: { children: string }): React.ReactElement {
  return (
    <Text>
      <Text dimColor>`</Text>
      <Text color="cyan">{children}</Text>
      <Text dimColor>`</Text>
    </Text>
  );
}

// Command display (for showing terminal commands)
export interface CommandProps {
  command: string;
  prompt?: string;
  output?: string;
}

export function Command({
  command,
  prompt = "$",
  output,
}: CommandProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green">{prompt}</Text>
        <Text> </Text>
        <Text>{command}</Text>
      </Box>
      {output && (
        <Box marginLeft={2}>
          <Text dimColor>{output}</Text>
        </Box>
      )}
    </Box>
  );
}

// Diff display
export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber?: number;
}

export interface DiffProps {
  lines: DiffLine[];
  title?: string;
}

export function Diff({ lines, title }: DiffProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold dimColor>diff: </Text>
          <Text>{title}</Text>
        </Box>
      )}
      {lines.map((line, index) => {
        const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
        const color = line.type === "add" ? "green" : line.type === "remove" ? "red" : undefined;

        return (
          <Box key={index}>
            <Text color={color}>{prefix} {line.content}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// JSON display with formatting
export function JsonDisplay({
  data,
  indent = 2,
}: {
  data: unknown;
  indent?: number;
}): React.ReactElement {
  const json = JSON.stringify(data, null, indent);
  return <CodeBlock code={json} language="json" />;
}

// Log output with timestamps
export interface LogEntry {
  timestamp?: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export function LogOutput({ entries }: { entries: LogEntry[] }): React.ReactElement {
  const levelColors: Record<string, string> = {
    info: "blue",
    warn: "yellow",
    error: "red",
    debug: "gray",
  };

  return (
    <Box flexDirection="column">
      {entries.map((entry, index) => (
        <Box key={index}>
          {entry.timestamp && <Text dimColor>[{entry.timestamp}] </Text>}
          <Text color={levelColors[entry.level]}>[{entry.level.toUpperCase()}]</Text>
          <Text> {entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
}
