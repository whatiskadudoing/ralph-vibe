/**
 * @module components/ui/DiffView
 *
 * Displays colorized file diffs with additions/deletions.
 * Can be used for streaming diffs during Edit operations.
 *
 * Inspired by:
 * - Cline: Green/red highlighting, auto-scroll during streaming
 * - Cursor: Color-coded diff with accept/reject buttons
 * - Aider: Rich diff display with context
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "../../../packages/deno-ink/src/mod.ts";
import { colors } from "./theme.ts";

// ============================================================================
// Types
// ============================================================================

export type DiffLineType = "add" | "remove" | "context";

export interface DiffLine {
  /** Type of line change */
  type: DiffLineType;
  /** Line content (without +/- prefix) */
  content: string;
  /** Original line number (for context/remove) */
  oldLineNumber?: number;
  /** New line number (for context/add) */
  newLineNumber?: number;
}

export interface DiffViewProps {
  /** File path being diffed */
  file: string;
  /** Diff lines to display */
  lines: DiffLine[];
  /** Maximum visible lines (default: 10) */
  maxHeight?: number;
  /** Whether diff is collapsed */
  collapsed?: boolean;
  /** Toggle collapse callback */
  onToggle?: () => void;
  /** Whether diff is still streaming */
  isStreaming?: boolean;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Auto-collapse after streaming completes (default: true) */
  autoCollapse?: boolean;
  /** Border style */
  showBorder?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats a line number with padding.
 */
function formatLineNumber(num: number | undefined, width: number = 4): string {
  if (num === undefined) return " ".repeat(width);
  return String(num).padStart(width);
}

/**
 * Gets the diff statistics.
 */
function getDiffStats(lines: DiffLine[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.type === "add") additions++;
    if (line.type === "remove") deletions++;
  }

  return { additions, deletions };
}

/**
 * Truncates a line if too long.
 */
function truncateLine(content: string, maxWidth: number): string {
  if (content.length <= maxWidth) return content;
  return content.slice(0, maxWidth - 1) + "…";
}

// ============================================================================
// Components
// ============================================================================

interface DiffLineRowProps {
  line: DiffLine;
  showLineNumbers: boolean;
  maxWidth: number;
}

/**
 * Single diff line row.
 */
function DiffLineRow({
  line,
  showLineNumbers,
  maxWidth,
}: DiffLineRowProps): React.ReactElement {
  const lineNumWidth = 4;
  const prefixWidth = 2; // "+ " or "- " or "  "
  const contentWidth = maxWidth - (showLineNumbers ? lineNumWidth + 1 : 0) - prefixWidth;

  const lineColor = line.type === "add"
    ? colors.success
    : line.type === "remove"
    ? colors.error
    : colors.dim;

  const prefix = line.type === "add"
    ? "+"
    : line.type === "remove"
    ? "-"
    : " ";

  const bgStyle = line.type === "add"
    ? { backgroundColor: "#1a3d1a" } // dark green background
    : line.type === "remove"
    ? { backgroundColor: "#3d1a1a" } // dark red background
    : {};

  const lineNum = line.type === "remove"
    ? line.oldLineNumber
    : line.newLineNumber;

  return (
    <Box flexDirection="row">
      {showLineNumbers && (
        <Text color={colors.dim}>
          {formatLineNumber(lineNum, lineNumWidth)}
        </Text>
      )}
      {showLineNumbers && <Text color={colors.dim}> </Text>}
      <Text color={lineColor} bold={line.type !== "context"}>
        {prefix}
      </Text>
      <Text color={lineColor}>
        {truncateLine(line.content, contentWidth)}
      </Text>
    </Box>
  );
}

/**
 * Collapsed diff header showing just file and stats.
 */
function CollapsedDiffHeader({
  file,
  additions,
  deletions,
  onToggle,
}: {
  file: string;
  additions: number;
  deletions: number;
  onToggle?: () => void;
}): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={colors.dim}>▶</Text>
      <Text color={colors.muted}>{file}</Text>
      {additions > 0 && <Text color={colors.success}>+{additions}</Text>}
      {deletions > 0 && <Text color={colors.error}>-{deletions}</Text>}
    </Box>
  );
}

/**
 * Expanded diff header.
 */
function ExpandedDiffHeader({
  file,
  additions,
  deletions,
  isStreaming,
}: {
  file: string;
  additions: number;
  deletions: number;
  isStreaming?: boolean;
}): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1} paddingX={1}>
      <Text color={colors.dim}>▼</Text>
      <Text color={colors.muted}>{file}</Text>
      {additions > 0 && <Text color={colors.success}>+{additions}</Text>}
      {deletions > 0 && <Text color={colors.error}>-{deletions}</Text>}
      {isStreaming && <Text color={colors.accent}>●</Text>}
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * File diff display with colorized additions and deletions.
 *
 * Example usage:
 * ```tsx
 * <DiffView
 *   file="src/auth/login.ts"
 *   lines={[
 *     { type: "context", content: "export function login() {", newLineNumber: 1 },
 *     { type: "remove", content: "  // TODO: implement", oldLineNumber: 2 },
 *     { type: "add", content: "  const token = await authenticate()", newLineNumber: 2 },
 *   ]}
 *   isStreaming={true}
 * />
 * ```
 */
export function DiffView({
  file,
  lines,
  maxHeight = 10,
  collapsed = false,
  onToggle,
  isStreaming = false,
  showLineNumbers = true,
  autoCollapse = true,
  showBorder = true,
}: DiffViewProps): React.ReactElement {
  const { additions, deletions } = getDiffStats(lines);
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);
  const prevStreamingRef = useRef(isStreaming);

  // Auto-collapse when streaming stops
  useEffect(() => {
    if (autoCollapse && prevStreamingRef.current && !isStreaming) {
      setLocalCollapsed(true);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, autoCollapse]);

  // Sync with external collapsed state
  useEffect(() => {
    setLocalCollapsed(collapsed);
  }, [collapsed]);

  const handleToggle = () => {
    setLocalCollapsed(!localCollapsed);
    onToggle?.();
  };

  // Collapsed view
  if (localCollapsed) {
    return (
      <CollapsedDiffHeader
        file={file}
        additions={additions}
        deletions={deletions}
        onToggle={handleToggle}
      />
    );
  }

  // Calculate max content width (approximate)
  const maxWidth = 80;

  // Visible lines (tail if more than maxHeight)
  const visibleLines = lines.slice(-maxHeight);
  const hiddenCount = lines.length - visibleLines.length;

  return (
    <Box
      flexDirection="column"
      borderStyle={showBorder ? "single" : undefined}
      borderColor={colors.dim}
    >
      <ExpandedDiffHeader
        file={file}
        additions={additions}
        deletions={deletions}
        isStreaming={isStreaming}
      />

      {hiddenCount > 0 && (
        <Box paddingX={1}>
          <Text color={colors.dim}>... {hiddenCount} more lines above</Text>
        </Box>
      )}

      {visibleLines.map((line, i) => (
        <Box key={i} paddingX={1}>
          <DiffLineRow
            line={line}
            showLineNumbers={showLineNumbers}
            maxWidth={maxWidth}
          />
        </Box>
      ))}

      {isStreaming && (
        <Box paddingX={1}>
          <Text color={colors.accent}>▌</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Multi-File Diff View
// ============================================================================

export interface FileDiff {
  file: string;
  lines: DiffLine[];
  isStreaming?: boolean;
}

export interface MultiDiffViewProps {
  /** Array of file diffs */
  diffs: FileDiff[];
  /** Maximum height per diff (default: 8) */
  maxHeightPerDiff?: number;
  /** Start all collapsed (default: false) */
  startCollapsed?: boolean;
}

/**
 * Multiple file diffs in a single view.
 */
export function MultiDiffView({
  diffs,
  maxHeightPerDiff = 8,
  startCollapsed = false,
}: MultiDiffViewProps): React.ReactElement {
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(
    () => {
      const state: Record<string, boolean> = {};
      for (const diff of diffs) {
        state[diff.file] = startCollapsed;
      }
      return state;
    }
  );

  const toggleFile = (file: string) => {
    setCollapsedState((prev: Record<string, boolean>) => ({
      ...prev,
      [file]: !prev[file],
    }));
  };

  // Calculate totals
  let totalAdditions = 0;
  let totalDeletions = 0;
  for (const diff of diffs) {
    const stats = getDiffStats(diff.lines);
    totalAdditions += stats.additions;
    totalDeletions += stats.deletions;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {/* Summary header */}
      <Box flexDirection="row" gap={1}>
        <Text color={colors.dim}>{diffs.length} files changed</Text>
        {totalAdditions > 0 && (
          <Text color={colors.success}>+{totalAdditions}</Text>
        )}
        {totalDeletions > 0 && (
          <Text color={colors.error}>-{totalDeletions}</Text>
        )}
      </Box>

      {/* Individual diffs */}
      {diffs.map((diff) => (
        <React.Fragment key={diff.file}>
          <DiffView
            file={diff.file}
            lines={diff.lines}
            maxHeight={maxHeightPerDiff}
            collapsed={collapsedState[diff.file] ?? startCollapsed}
            onToggle={() => toggleFile(diff.file)}
            isStreaming={diff.isStreaming}
            showBorder={false}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// ============================================================================
// Diff Parser Utility
// ============================================================================

/**
 * Parses a unified diff string into DiffLine array.
 */
export function parseUnifiedDiff(diffText: string): DiffLine[] {
  const lines: DiffLine[] = [];
  const diffLines = diffText.split("\n");

  let oldLine = 0;
  let newLine = 0;

  for (const line of diffLines) {
    // Skip diff headers
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -start,count +start,count @@
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = parseInt(match[1]!, 10);
        newLine = parseInt(match[2]!, 10);
      }
      continue;
    }

    if (line.startsWith("+")) {
      lines.push({
        type: "add",
        content: line.slice(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith("-")) {
      lines.push({
        type: "remove",
        content: line.slice(1),
        oldLineNumber: oldLine++,
      });
    } else if (line.startsWith(" ") || line === "") {
      lines.push({
        type: "context",
        content: line.slice(1) || "",
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
  }

  return lines;
}
