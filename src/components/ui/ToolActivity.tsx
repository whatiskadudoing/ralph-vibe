/**
 * @module components/ui/ToolActivity
 *
 * Enhanced live tool activity feed showing recent operations.
 * Features tree-style connectors, tool-specific icons, input previews,
 * subagent model badges, and clean formatting.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useTerminalSize } from "../../../packages/deno-ink/src/mod.ts";
import { colors } from "./theme.ts";

// ============================================================================
// Types
// ============================================================================

/** Original ToolCall interface - kept for backward compatibility */
export interface ToolCall {
  name: string;
  detail?: string;
  /** Unique ID for stable React keys (optional for backwards compatibility) */
  id?: string;
}

/** Tool execution status */
export type ToolStatus = "pending" | "running" | "success" | "error";

/** Enhanced tool call interface with rich metadata */
export interface EnhancedToolCall {
  /** Unique ID for React keys */
  id: string;
  /** Tool name (Read, Edit, Bash, etc.) */
  name: string;
  /** Current execution status */
  status: ToolStatus;
  /** When the tool started (timestamp) */
  startTime?: number;
  /** When the tool completed (timestamp) */
  endTime?: number;
  /** Full input parameters */
  input: Record<string, unknown>;
  /** Result metadata */
  result?: {
    /** Number of matches for Glob/Grep */
    matchCount?: number;
    /** Lines changed for Edit (+added -removed) */
    linesChanged?: number;
    /** Lines added for Edit */
    linesAdded?: number;
    /** Lines removed for Edit */
    linesRemoved?: number;
    /** Exit code for Bash */
    exitCode?: number;
    /** File size for Read/Write */
    fileSize?: number;
    /** Lines range for Read */
    lineRange?: string;
    /** Number of operations for Task */
    operationCount?: number;
  };
  /** Model used for Task/subagent tools */
  subagentModel?: "opus" | "sonnet" | "haiku" | string;
  /** Nested tool calls (for Task tools with subagent operations) */
  nested?: EnhancedToolCall[];
}

/** Grouped tool operations */
interface ToolGroup {
  /** Tool type name */
  name: string;
  /** Tools in this group */
  tools: EnhancedToolCall[];
  /** Whether the group has any running tools */
  hasRunning: boolean;
  /** Whether the group has any errors */
  hasError: boolean;
  /** Total duration of all tools in group */
  totalDuration: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimalist tool icons - vibrant, consistent color scheme */
const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  Read: { icon: "○", color: colors.info },       // Blue for read operations
  Write: { icon: "+", color: colors.success },   // Green for write
  Edit: { icon: "~", color: colors.accent },     // Orange for edit
  Bash: { icon: "$", color: colors.accent },     // Orange for commands
  Glob: { icon: "○", color: colors.info },       // Blue for search
  Grep: { icon: "○", color: colors.info },       // Blue for search
  Task: { icon: "●", color: colors.accent },     // Orange for tasks
  WebFetch: { icon: "↗", color: colors.cyan },   // Cyan for web
  WebSearch: { icon: "◎", color: colors.cyan },  // Cyan for web
  NotebookEdit: { icon: "□", color: colors.magenta }, // Magenta for notebooks
  TodoRead: { icon: "☐", color: colors.info },
  TodoWrite: { icon: "☑", color: colors.success },
};

/** Status indicators */
const STATUS_INDICATORS: Record<ToolStatus, { char: string; color: string }> = {
  pending: { char: "○", color: colors.dim },
  running: { char: "●", color: colors.accent },
  success: { char: "✓", color: colors.success },
  error: { char: "✗", color: colors.error },
};

/** Spinner frames for running status */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Colors for animated dots - vibrant cycling colors */
const DOT_COLORS = [
  colors.accent,     // orange
  colors.success,    // green
  colors.cyan,       // cyan
  colors.magenta,    // magenta
];

/** Column widths */
const COL_ICON = 2;
const COL_TOOL_NAME = 10;
const COL_TIMING = 7;
const COL_STATUS = 3;
const COL_RESULT_MIN = 12;

/** Tree connector characters */
const TREE_BRANCH = "├─";
const TREE_LAST = "└─";

/** Nested indent width */
const NESTED_INDENT = 4;

/** Model badge colors */
const MODEL_COLORS: Record<string, string> = {
  opus: colors.accent,
  sonnet: colors.info,
  haiku: colors.success,
};

// ============================================================================
// Natural Language Descriptions (Cursor-inspired)
// ============================================================================

/**
 * Get a human-readable activity description for a tool.
 * Inspired by Cursor's approach: "never show tool names, describe what it's doing"
 */
export function getActivityDescription(tool: EnhancedToolCall): string {
  const { name, input, status } = tool;
  const isRunning = status === "running";
  const suffix = isRunning ? "..." : "";

  switch (name) {
    case "Read": {
      const path = String(input.file_path ?? input.path ?? "");
      const filename = path.split("/").pop() ?? path;
      return `Reading ${filename}${suffix}`;
    }

    case "Write": {
      const path = String(input.file_path ?? input.path ?? "");
      const filename = path.split("/").pop() ?? path;
      return `Creating ${filename}${suffix}`;
    }

    case "Edit": {
      const path = String(input.file_path ?? input.path ?? "");
      const filename = path.split("/").pop() ?? path;
      return `Editing ${filename}${suffix}`;
    }

    case "Bash": {
      const cmd = String(input.command ?? "");
      // Detect common command patterns
      if (cmd.startsWith("npm ")) return `Running npm${suffix}`;
      if (cmd.startsWith("yarn ")) return `Running yarn${suffix}`;
      if (cmd.startsWith("pnpm ")) return `Running pnpm${suffix}`;
      if (cmd.startsWith("deno ")) return `Running deno${suffix}`;
      if (cmd.startsWith("git ")) return `Git operation${suffix}`;
      if (cmd.includes("test")) return `Running tests${suffix}`;
      if (cmd.includes("build")) return `Building${suffix}`;
      if (cmd.includes("lint")) return `Linting${suffix}`;
      if (cmd.startsWith("cd ")) return `Changing directory${suffix}`;
      if (cmd.startsWith("ls ") || cmd === "ls") return `Listing files${suffix}`;
      if (cmd.startsWith("cat ")) return `Reading file${suffix}`;
      if (cmd.startsWith("mkdir ")) return `Creating directory${suffix}`;
      return `Running command${suffix}`;
    }

    case "Glob": {
      const pattern = String(input.pattern ?? "");
      if (pattern.includes("*")) {
        const ext = pattern.match(/\*\.(\w+)/)?.[1];
        if (ext) return `Finding ${ext} files${suffix}`;
      }
      return `Finding files${suffix}`;
    }

    case "Grep": {
      const pattern = String(input.pattern ?? "");
      const shortPattern = pattern.length > 20
        ? pattern.slice(0, 17) + "..."
        : pattern;
      return `Searching "${shortPattern}"${suffix}`;
    }

    case "Task": {
      const desc = String(input.description ?? input.task ?? "");
      if (desc.length > 30) {
        return desc.slice(0, 27) + "..." + suffix;
      }
      return desc + suffix;
    }

    case "WebFetch": {
      const url = String(input.url ?? "");
      const prompt = String(input.prompt ?? "");

      // If there's a prompt, show what we're looking for
      if (prompt && prompt.length > 0) {
        const shortPrompt = prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt;
        return `Fetching: ${shortPrompt}${suffix}`;
      }

      // Otherwise just show the URL
      try {
        const hostname = new URL(url).hostname;
        return `Fetching ${hostname}${suffix}`;
      } catch {
        return `Fetching URL${suffix}`;
      }
    }

    case "WebSearch": {
      const query = String(input.query ?? "");
      // Show full query without truncation for better context
      const maxQueryLength = 50;
      const displayQuery = query.length > maxQueryLength
        ? query.slice(0, maxQueryLength - 3) + "..."
        : query;
      return `Searching "${displayQuery}"${suffix}`;
    }

    case "NotebookEdit":
      return `Editing notebook${suffix}`;

    case "TodoRead":
      return `Reading tasks${suffix}`;

    case "TodoWrite":
      return `Updating tasks${suffix}`;

    default:
      return `${name}${suffix}`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert legacy ToolCall to EnhancedToolCall
 */
export function convertLegacyToolCall(
  tool: ToolCall,
  index: number
): EnhancedToolCall {
  return {
    id: tool.id ?? `legacy-${index}-${Date.now()}`,
    name: tool.name,
    status: "success",
    input: { detail: tool.detail },
  };
}

/**
 * Check if a tool call is an EnhancedToolCall
 */
export function isEnhancedToolCall(
  tool: ToolCall | EnhancedToolCall
): tool is EnhancedToolCall {
  return "status" in tool && "input" in tool;
}

/**
 * Normalize tools to EnhancedToolCall format
 */
export function normalizeTools(
  tools: (ToolCall | EnhancedToolCall)[]
): EnhancedToolCall[] {
  return tools.map((tool, index) =>
    isEnhancedToolCall(tool) ? tool : convertLegacyToolCall(tool, index)
  );
}

/**
 * Format duration in human-readable format
 */
function formatDuration(startTime?: number, endTime?: number): string {
  if (!startTime) return "";
  const end = endTime ?? Date.now();
  const ms = end - startTime;

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m${secs}s`;
}

/**
 * Format duration from milliseconds
 */
function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

// ============================================================================
// Helper Functions for Enhanced Display
// ============================================================================

/**
 * Get icon for tool name
 */
export function getToolIcon(name: string): string {
  return TOOL_ICONS[name]?.icon ?? "▸";
}

/**
 * Get color for tool name
 */
export function getToolColor(name: string): string {
  return TOOL_ICONS[name]?.color ?? colors.dim;
}

/**
 * Format tool input for display - shows the most relevant information for each tool type.
 * For WebFetch and WebSearch, shows full details without truncation for better user understanding.
 */
export function formatToolInput(tool: EnhancedToolCall): { primary: string; secondary?: string } {
  const { name, input } = tool;

  switch (name) {
    case "Read": {
      const path = String(input.file_path ?? input.path ?? "");
      const parts = path.split("/");
      const shortPath = parts.length > 2 ? parts.slice(-2).join("/") : path;
      // Show line range if specified
      const offset = input.offset as number | undefined;
      const limit = input.limit as number | undefined;
      if (offset !== undefined || limit !== undefined) {
        const range = offset !== undefined && limit !== undefined
          ? `lines ${offset}-${offset + limit}`
          : offset !== undefined ? `from line ${offset}` : `first ${limit} lines`;
        return { primary: shortPath, secondary: range };
      }
      return { primary: shortPath };
    }

    case "Write": {
      const path = String(input.file_path ?? input.path ?? "");
      const parts = path.split("/");
      const shortPath = parts.length > 2 ? parts.slice(-2).join("/") : path;
      const content = String(input.content ?? "");
      const lines = content.split("\n").length;
      return { primary: shortPath, secondary: `${lines} lines` };
    }

    case "Edit": {
      const path = String(input.file_path ?? input.path ?? "");
      const parts = path.split("/");
      const shortPath = parts.length > 2 ? parts.slice(-2).join("/") : path;
      // Show what's being changed
      const oldStr = String(input.old_string ?? "").trim();
      const newStr = String(input.new_string ?? "").trim();
      if (oldStr && newStr) {
        // Truncate and show the change
        const oldPreview = (oldStr.split("\n")[0] ?? "").slice(0, 30);
        const newPreview = (newStr.split("\n")[0] ?? "").slice(0, 30);
        return { primary: shortPath, secondary: `"${oldPreview}..." → "${newPreview}..."` };
      }
      return { primary: shortPath };
    }

    case "Bash": {
      const cmd = String(input.command ?? "");
      const desc = String(input.description ?? "");
      if (desc) {
        return { primary: cmd.slice(0, 50), secondary: desc };
      }
      return { primary: cmd };
    }

    case "Glob": {
      const pattern = String(input.pattern ?? "");
      const path = String(input.path ?? "");
      if (path) {
        return { primary: pattern, secondary: `in ${path}` };
      }
      return { primary: pattern };
    }

    case "Grep": {
      const pattern = String(input.pattern ?? "");
      const path = String(input.path ?? "");
      const glob = String(input.glob ?? "");
      const secondary = path ? `in ${path}` : glob ? `*.${glob}` : undefined;
      return { primary: `/${pattern}/`, secondary };
    }

    case "Task": {
      const desc = String(input.description ?? input.task ?? "");
      const model = String(input.model ?? "");
      if (model) {
        return { primary: `"${desc}"`, secondary: `[${model}]` };
      }
      return { primary: `"${desc}"` };
    }

    case "TodoWrite": {
      const todos = input.todos as Array<{ content?: string; status?: string }> | undefined;
      if (todos && todos.length > 0) {
        const pending = todos.filter(t => t.status === "pending").length;
        const completed = todos.filter(t => t.status === "completed").length;
        return { primary: `${todos.length} tasks`, secondary: `${completed} done, ${pending} pending` };
      }
      return { primary: "updating tasks" };
    }

    case "WebFetch": {
      const url = String(input.url ?? "");
      const prompt = String(input.prompt ?? "");
      // Show full URL and prompt on separate lines if needed
      return {
        primary: url,
        secondary: prompt ? `Q: ${prompt}` : undefined
      };
    }

    case "WebSearch": {
      const query = String(input.query ?? "");
      // Show full query without truncation
      return { primary: `"${query}"` };
    }

    default:
      // Return first string value found
      for (const value of Object.values(input)) {
        if (typeof value === "string" && value.length > 0) {
          return { primary: value };
        }
      }
      return { primary: "" };
  }
}

/**
 * Extract and truncate input preview from tool
 */
export function getInputPreview(tool: EnhancedToolCall, maxLength = 40): string {
  const formatted = formatToolInput(tool);

  // For single-line display, combine primary and secondary with truncation
  if (formatted.secondary) {
    const combined = `${formatted.primary} - ${formatted.secondary}`;
    return combined.length > maxLength ? combined.slice(0, maxLength - 3) + "..." : combined;
  }

  // Just truncate primary if too long
  return formatted.primary.length > maxLength
    ? formatted.primary.slice(0, maxLength - 3) + "..."
    : formatted.primary;
}

/**
 * Get model badge text
 */
export function getModelBadge(model?: string): string {
  if (!model) return "";

  if (model.includes("opus")) return "[opus]";
  if (model.includes("sonnet")) return "[sonnet]";
  if (model.includes("haiku")) return "[haiku]";

  return `[${model.slice(0, 6)}]`;
}

/**
 * Get model badge color
 */
export function getModelBadgeColor(model?: string): string {
  if (!model) return colors.dim;

  if (model.includes("opus")) return MODEL_COLORS["opus"]!;
  if (model.includes("sonnet")) return MODEL_COLORS["sonnet"]!;
  if (model.includes("haiku")) return MODEL_COLORS["haiku"]!;

  return colors.dim;
}

/**
 * Group consecutive tools by type
 */
function groupTools(tools: EnhancedToolCall[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  let currentGroup: ToolGroup | null = null;

  for (const tool of tools) {
    if (currentGroup && currentGroup.name === tool.name) {
      currentGroup.tools.push(tool);
      if (tool.status === "running") currentGroup.hasRunning = true;
      if (tool.status === "error") currentGroup.hasError = true;
      if (tool.startTime) {
        const end = tool.endTime ?? Date.now();
        currentGroup.totalDuration += end - tool.startTime;
      }
    } else {
      currentGroup = {
        name: tool.name,
        tools: [tool],
        hasRunning: tool.status === "running",
        hasError: tool.status === "error",
        totalDuration: tool.startTime
          ? (tool.endTime ?? Date.now()) - tool.startTime
          : 0,
      };
      groups.push(currentGroup);
    }
  }

  return groups;
}

/**
 * Get stats summary from tools
 */
function getToolStats(tools: EnhancedToolCall[]): {
  total: number;
  byType: Record<string, number>;
  totalDuration: number;
} {
  const byType: Record<string, number> = {};
  let totalDuration = 0;

  for (const tool of tools) {
    byType[tool.name] = (byType[tool.name] ?? 0) + 1;
    if (tool.startTime) {
      const end = tool.endTime ?? Date.now();
      totalDuration += end - tool.startTime;
    }
  }

  return {
    total: tools.length,
    byType,
    totalDuration,
  };
}

/**
 * Smart path formatting based on available width
 */
function formatPathSmart(path: string, maxWidth: number): string {
  if (path.length <= maxWidth) return path;

  const parts = path.split("/");

  // Try just filename
  const filename = parts[parts.length - 1] ?? path;
  if (filename.length <= maxWidth) return filename;

  // Try last two parts (dir/file)
  if (parts.length >= 2) {
    const shortPath = parts.slice(-2).join("/");
    if (shortPath.length <= maxWidth) return shortPath;
  }

  // Truncate filename
  return truncate(filename, maxWidth);
}

/**
 * Format result metadata based on tool type
 */
function formatResult(tool: EnhancedToolCall): string {
  const { name, result, subagentModel } = tool;

  if (!result) {
    // For Task tool, show model even without result
    if (name === "Task" && subagentModel) {
      const modelShort = subagentModel.includes("sonnet")
        ? "sonnet"
        : subagentModel.includes("haiku")
        ? "haiku"
        : subagentModel.includes("opus")
        ? "opus"
        : subagentModel.slice(0, 8);
      return `(${modelShort})`;
    }
    return "";
  }

  switch (name) {
    case "Glob":
    case "Grep":
      if (result.matchCount !== undefined) {
        const unit = result.matchCount === 1 ? "file" : "files";
        return `${result.matchCount} ${unit}`;
      }
      break;

    case "Read":
      if (result.lineRange) {
        return `L${result.lineRange}`;
      }
      if (result.fileSize !== undefined) {
        return formatFileSize(result.fileSize);
      }
      break;

    case "Write":
      if (result.fileSize !== undefined) {
        return formatFileSize(result.fileSize);
      }
      break;

    case "Edit":
      if (result.linesAdded !== undefined || result.linesRemoved !== undefined) {
        const added = result.linesAdded ?? 0;
        const removed = result.linesRemoved ?? 0;
        return `+${added} -${removed}`;
      }
      if (result.linesChanged !== undefined) {
        return `${result.linesChanged} lines`;
      }
      break;

    case "Bash":
      if (result.exitCode !== undefined) {
        return `exit ${result.exitCode}`;
      }
      break;

    case "Task": {
      const parts: string[] = [];
      if (result.operationCount !== undefined) {
        parts.push(`${result.operationCount} ops`);
      }
      if (subagentModel) {
        const modelShort = subagentModel.includes("sonnet")
          ? "sonnet"
          : subagentModel.includes("haiku")
          ? "haiku"
          : subagentModel.includes("opus")
          ? "opus"
          : subagentModel.slice(0, 8);
        parts.push(`(${modelShort})`);
      }
      return parts.join(" ");
    }

    default:
      break;
  }

  return "";
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Extract detail string from tool input
 */
function extractDetail(tool: EnhancedToolCall): string {
  const { input } = tool;

  // Handle legacy format where detail was stored directly
  if (input.detail && typeof input.detail === "string") {
    return input.detail;
  }

  // Use formatToolInput for consistent formatting
  const formatted = formatToolInput(tool);
  return formatted.primary;
}

/**
 * Truncate string to fit in column width
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Pad string to exact width
 */
function padEnd(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}

/**
 * Extract detail with smart path formatting
 */
function extractDetailSmart(tool: EnhancedToolCall, maxWidth: number): string {
  const { name, input } = tool;

  // Handle legacy format where detail was stored directly
  if (input.detail && typeof input.detail === "string") {
    return truncate(input.detail, maxWidth);
  }

  // Use formatToolInput for consistent formatting
  const formatted = formatToolInput(tool);

  // Special handling for path-based tools
  if (name === "Read" || name === "Write" || name === "Edit") {
    return formatPathSmart(formatted.primary, maxWidth);
  }

  // For other tools, just truncate if needed
  return truncate(formatted.primary, maxWidth);
}

// ============================================================================
// Components
// ============================================================================

interface SpinnerIconProps {
  color: string;
}

/**
 * Animated spinner icon for running tools
 */
function SpinnerIcon({ color }: SpinnerIconProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f: number) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{SPINNER_FRAMES[frame]}</Text>;
}

/**
 * Animated operation dots indicator
 * Shows completed operations as green dots, running as blinking orange
 */
function OperationDots({
  total,
  completed,
  hasRunning
}: {
  total: number;
  completed: number;
  hasRunning: boolean;
}): React.ReactElement {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(() => {
      setColorIndex((i: number) => (i + 1) % DOT_COLORS.length);
    }, 300);
    return () => clearInterval(timer);
  }, [hasRunning]);

  // Limit dots to show (max 10, then show +N)
  const maxDots = 10;
  const showDots = Math.min(total, maxDots);
  const extraCount = total - maxDots;

  const dots: React.ReactNode[] = [];

  for (let i = 0; i < showDots; i++) {
    const isCompleted = i < completed;
    const isRunning = i === completed && hasRunning;

    let dotColor = colors.dim;
    if (isCompleted) {
      dotColor = colors.success;
    } else if (isRunning) {
      dotColor = DOT_COLORS[colorIndex] ?? colors.accent;
    }

    dots.push(
      <Text key={i} color={dotColor}>
        {isRunning ? "●" : isCompleted ? "●" : "○"}
      </Text>
    );

    // Add connector between dots
    if (i < showDots - 1) {
      dots.push(
        <Text key={`c${i}`} color={colors.dim}>─</Text>
      );
    }
  }

  return (
    <Box flexDirection="row" gap={0}>
      {dots}
      {extraCount > 0 && (
        <Text color={colors.dim}> +{extraCount}</Text>
      )}
    </Box>
  );
}

/**
 * Live duration counter for running tools
 */
function LiveDuration({ startTime }: { startTime: number }): React.ReactElement {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <Text color={colors.dim}>{elapsed}s...</Text>;
}

interface ToolRowProps {
  tool: EnhancedToolCall;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
  /** Use natural language description instead of tool name + detail */
  useNaturalLanguage?: boolean;
}

/**
 * Single tool row with multi-column layout
 */
function ToolRow({
  tool,
  detailWidth,
  resultWidth,
  showTiming,
  showResult,
  dimRow,
  useNaturalLanguage = false,
}: ToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: "▸",
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  // Dim completed tools when there are running tools
  const textColor = dimRow && tool.status !== "running" ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === "running";

  const resultStr = formatResult(tool);
  const durationStr = formatDuration(tool.startTime, tool.endTime);

  // Use natural language or traditional tool name + detail
  if (useNaturalLanguage) {
    const activityText = getActivityDescription(tool);
    const totalWidth = COL_TOOL_NAME + detailWidth;

    return (
      <Box flexDirection="row">
        <Text color={colors.dim}>  </Text>

        {/* Icon column */}
        {isRunning ? (
          <SpinnerIcon color={iconColor} />
        ) : (
          <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>
        )}
        <Text> </Text>

        {/* Natural language description (takes full width) */}
        <Text color={textColor}>{padEnd(truncate(activityText, totalWidth), totalWidth)}</Text>

        {/* Timing column */}
        {showTiming && (
          <Text color={colors.dim}>
            {padEnd(durationStr, COL_TIMING)}
          </Text>
        )}

        {/* Status indicator */}
        <Text color={statusInfo.color}> {statusInfo.char}</Text>
      </Box>
    );
  }

  // Traditional display: tool name + detail
  const formatted = formatToolInput(tool);
  const hasSecondaryInfo = formatted.secondary !== undefined;

  return (
    <Box flexDirection="column">
      {/* Primary row */}
      <Box flexDirection="row">
        <Text color={colors.dim}>  </Text>

        {/* Icon column */}
        {isRunning ? (
          <SpinnerIcon color={iconColor} />
        ) : (
          <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>
        )}
        <Text> </Text>

        {/* Tool name column */}
        <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME)}</Text>

        {/* Detail column (flexible width) */}
        <Text color={detailColor}>{padEnd(truncate(formatted.primary, detailWidth), detailWidth)}</Text>

        {/* Timing column */}
        {showTiming && (
          <Text color={colors.dim}>
            {padEnd(durationStr, COL_TIMING)}
          </Text>
        )}

        {/* Status indicator */}
        <Text color={statusInfo.color}> {statusInfo.char}</Text>
      </Box>

      {/* Secondary row (if present) - for WebFetch prompt, etc */}
      {hasSecondaryInfo && (
        <Box flexDirection="row">
          <Text color={colors.dim}>     </Text>
          <Text color={colors.dim}>{truncate(formatted.secondary!, detailWidth + COL_TOOL_NAME)}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Nested Tool Row Component
// ============================================================================

interface NestedToolRowProps {
  tool: EnhancedToolCall;
  isLast: boolean;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
}

/**
 * Nested tool row with tree connector
 */
function NestedToolRow({
  tool,
  isLast,
  detailWidth,
  resultWidth,
  showTiming,
  showResult,
  dimRow,
}: NestedToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: "\u25B8",
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== "running" ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === "running";

  const detail = extractDetailSmart(tool, detailWidth - NESTED_INDENT);
  const resultStr = formatResult(tool);
  const durationStr = formatDuration(tool.startTime, tool.endTime);

  const connector = isLast ? TREE_LAST : TREE_BRANCH;

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>     {connector} </Text>

      {/* Icon */}
      {isRunning ? (
        <SpinnerIcon color={iconColor} />
      ) : (
        <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>
      )}
      <Text> </Text>

      {/* Tool name */}
      <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME - 2)}</Text>

      {/* Detail (reduced width for nesting) */}
      <Text color={detailColor}>
        {padEnd(detail, detailWidth - NESTED_INDENT)}
      </Text>

      {/* Timing */}
      {showTiming && (
        <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>
      )}

      {/* Status */}
      <Text color={statusInfo.color}> {statusInfo.char}</Text>
    </Box>
  );
}

// ============================================================================
// Task Row with Nested Operations
// ============================================================================

interface TaskRowWithNestedProps {
  tool: EnhancedToolCall;
  detailWidth: number;
  resultWidth: number;
  showTiming: boolean;
  showResult: boolean;
  dimRow: boolean;
  showNested: boolean;
  maxNestedVisible?: number;
}

/**
 * Task tool row with nested operations displayed in tree structure
 */
function TaskRowWithNested({
  tool,
  detailWidth,
  resultWidth,
  showTiming,
  showResult,
  dimRow,
  showNested,
  maxNestedVisible = 5,
}: TaskRowWithNestedProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: "\u25B8",
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== "running" ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === "running";

  // Extract task description
  const taskDesc = String(tool.input.description ?? tool.input.task ?? "");
  const detail = `"${truncate(taskDesc, detailWidth - 10)}"`;

  // Build result string
  let resultStr = "";
  const parts: string[] = [];

  if (tool.nested && tool.nested.length > 0) {
    parts.push(`${tool.nested.length} ops`);
  } else if (tool.result?.operationCount !== undefined) {
    parts.push(`${tool.result.operationCount} ops`);
  }

  if (tool.subagentModel) {
    const modelShort = tool.subagentModel.includes("sonnet")
      ? "sonnet"
      : tool.subagentModel.includes("haiku")
      ? "haiku"
      : tool.subagentModel.includes("opus")
      ? "opus"
      : tool.subagentModel.slice(0, 8);
    parts.push(`(${modelShort})`);
  }

  resultStr = parts.join(" ");

  const durationStr = formatDuration(tool.startTime, tool.endTime);

  // Determine which nested tools to show
  const nestedTools = tool.nested ?? [];
  const visibleNested = showNested ? nestedTools.slice(-maxNestedVisible) : [];
  const hiddenCount = nestedTools.length - visibleNested.length;

  return (
    <Box flexDirection="column">
      {/* Main task row */}
      <Box flexDirection="row">
        <Text color={colors.dim}>  </Text>

        {isRunning ? (
          <SpinnerIcon color={iconColor} />
        ) : (
          <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>
        )}
        <Text> </Text>

        <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME)}</Text>
        <Text color={detailColor}>{padEnd(detail, detailWidth)}</Text>

        {showTiming && (
          <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>
        )}

        <Text color={statusInfo.color}> {statusInfo.char}</Text>
      </Box>

      {/* Hidden nested count indicator */}
      {showNested && hiddenCount > 0 && (
        <Box flexDirection="row">
          <Text color={colors.dim}>      </Text>
          <Text color={colors.dim}>... {hiddenCount} more operations</Text>
        </Box>
      )}

      {/* Nested tools */}
      {visibleNested.map((nestedTool, index) => (
        <React.Fragment key={nestedTool.id}>
          <NestedToolRow
            tool={nestedTool}
            isLast={index === visibleNested.length - 1}
            detailWidth={detailWidth}
            resultWidth={resultWidth}
            showTiming={showTiming}
            showResult={showResult}
            dimRow={dimRow}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// ============================================================================
// Grouped Operations Row
// ============================================================================

interface GroupedRowProps {
  group: ToolGroup;
  detailWidth: number;
  showTiming: boolean;
  dimRow: boolean;
}

/**
 * Grouped operations row showing count and file list
 */
function GroupedRow({
  group,
  detailWidth,
  showTiming,
  dimRow,
}: GroupedRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[group.name] ?? {
    icon: "\u25B8",
    color: colors.dim,
  };

  const isRunning = group.hasRunning;
  const statusInfo = group.hasError
    ? STATUS_INDICATORS.error
    : group.hasRunning
    ? STATUS_INDICATORS.running
    : STATUS_INDICATORS.success;

  const textColor = dimRow && !isRunning ? colors.dim : colors.muted;

  // Build file/pattern list
  const items: string[] = [];
  for (const tool of group.tools) {
    const detail = extractDetail(tool);
    if (detail && !items.includes(detail)) {
      items.push(detail);
    }
  }

  // Format display with count
  const countStr = `(${group.tools.length})`;
  const nameWithCount = `${group.name} ${countStr}`;

  // Build items preview
  const maxItemsToShow = 2;
  const shownItems = items.slice(0, maxItemsToShow);
  const moreCount = items.length - maxItemsToShow;
  let itemsStr = shownItems.join(", ");
  if (moreCount > 0) {
    itemsStr += `, +${moreCount} more`;
  }

  const durationStr = formatDurationMs(group.totalDuration);

  return (
    <Box flexDirection="column">
      {/* Group header */}
      <Box flexDirection="row">
        <Text color={colors.dim}>  </Text>

        {isRunning ? (
          <SpinnerIcon color={iconColor} />
        ) : (
          <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>
        )}
        <Text> </Text>

        <Text color={textColor} bold={isRunning}>
          {padEnd(nameWithCount, COL_TOOL_NAME + 4)}
        </Text>

        {showTiming && (
          <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>
        )}

        <Text color={statusInfo.color}> {statusInfo.char}</Text>
      </Box>

      {/* Items list */}
      <Box flexDirection="row">
        <Text color={colors.dim}>     </Text>
        <Text color={colors.dim}>
          {truncate(itemsStr, detailWidth + COL_TOOL_NAME)}
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Timeline Component
// ============================================================================

interface TimelineProps {
  tools: EnhancedToolCall[];
  width: number;
}

/**
 * Visual timeline showing operation progress as dots
 */
function Timeline({ tools, width }: TimelineProps): React.ReactElement {
  // Limit number of dots based on width
  const maxDots = Math.min(tools.length, Math.floor((width - 10) / 3));
  const visibleTools = tools.slice(-maxDots);

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={colors.dim}>  Tools </Text>

        {/* Connection line and dots */}
        {visibleTools.map((tool, index) => {
          const statusColor =
            tool.status === "error"
              ? colors.error
              : tool.status === "running"
              ? colors.accent
              : tool.status === "success"
              ? colors.success
              : colors.dim;

          const dotChar = tool.status === "running" ? "\u25CF" : "\u25CF"; // "●"
          const lineChar = index < visibleTools.length - 1 ? "\u2500\u2500" : ""; // "──"

          return (
            <React.Fragment key={tool.id}>
              <Text color={statusColor}>{dotChar}</Text>
              {lineChar && <Text color={colors.dim}>{lineChar}</Text>}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Tool names below (abbreviated) */}
      <Box flexDirection="row">
        <Text color={colors.dim}>        </Text>

        {visibleTools.map((tool, index) => {
          const abbrev = tool.name.slice(0, 4);
          const spacing = index < visibleTools.length - 1 ? "  " : "";

          return (
            <React.Fragment key={tool.id}>
              <Text color={colors.dim}>{abbrev}</Text>
              {spacing && <Text>{spacing}</Text>}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}

// ============================================================================
// Stats Summary Component
// ============================================================================

interface StatsSummaryProps {
  stats: {
    total: number;
    byType: Record<string, number>;
    totalDuration: number;
  };
  width: number;
}

/**
 * Stats summary row showing operation counts
 */
function StatsSummary({ stats, width }: StatsSummaryProps): React.ReactElement {
  // Build type counts string
  const typeCounts = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([name, count]) => `${name}: ${count}`)
    .join(", ");

  const durationStr = stats.totalDuration > 0
    ? formatDurationMs(stats.totalDuration)
    : "";

  const summaryParts: string[] = [];
  summaryParts.push(`${stats.total} operations`);
  if (durationStr) {
    summaryParts.push(durationStr);
  }

  const summary = summaryParts.join(" \u00B7 "); // " · "
  const fullLine = typeCounts
    ? `${summary} \u00B7 ${typeCounts}`
    : summary;

  const maxWidth = width - 4; // Account for borders

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>  </Text>
      <Text color={colors.muted}>{truncate(fullLine, maxWidth)}</Text>
    </Box>
  );
}

// ============================================================================
// Enhanced Tree-Style Tool Display
// ============================================================================

interface EnhancedToolRowProps {
  tool: EnhancedToolCall;
  isLast: boolean;
  showInputPreview?: boolean;
  showSubagents?: boolean;
  maxWidth?: number;
}

/**
 * Enhanced tool row with tree connector, icon, input preview, and badges
 */
function EnhancedToolRow({
  tool,
  isLast,
  showInputPreview = true,
  showSubagents = true,
  maxWidth = 80,
}: EnhancedToolRowProps): React.ReactElement {
  const connector = isLast ? TREE_LAST : TREE_BRANCH;
  const icon = getToolIcon(tool.name);
  const iconColor = getToolColor(tool.name);
  const statusInfo = STATUS_INDICATORS[tool.status];
  const isRunning = tool.status === "running";

  // Build the display text
  const parts: React.ReactNode[] = [];

  // Icon
  parts.push(
    <Text key="icon" color={iconColor}>
      {icon}
    </Text>
  );

  // Tool name or input preview
  if (showInputPreview) {
    const preview = getInputPreview(tool, maxWidth - 20);
    parts.push(
      <Text key="preview" color={colors.text}>
        {" "}
        {tool.name} {preview}
      </Text>
    );
  } else {
    parts.push(
      <Text key="name" color={colors.text}>
        {" "}
        {tool.name}
      </Text>
    );
  }

  // Subagent model badge for Task
  if (showSubagents && tool.name === "Task" && tool.subagentModel) {
    const badge = getModelBadge(tool.subagentModel);
    const badgeColor = getModelBadgeColor(tool.subagentModel);
    parts.push(
      <Text key="badge" color={badgeColor}>
        {" "}
        {badge}
      </Text>
    );
  }

  // Spacer before status
  parts.push(
    <Text key="spacer" color={colors.dim}>
      {" "}
    </Text>
  );

  // Status indicator or spinner
  if (isRunning) {
    parts.push(
      <Box key="status">
        <SpinnerIcon color={statusInfo.color} />
      </Box>
    );
  } else {
    parts.push(
      <Text key="status" color={statusInfo.color}>
        {statusInfo.char}
      </Text>
    );
  }

  // Duration
  if (tool.startTime) {
    if (isRunning && !tool.endTime) {
      parts.push(<Text key="duration-space"> </Text>);
      parts.push(
        <Box key="duration">
          <LiveDuration startTime={tool.startTime} />
        </Box>
      );
    } else {
      const duration = formatDuration(tool.startTime, tool.endTime);
      parts.push(
        <Text key="duration" color={colors.dim}>
          {" "}
          {duration}
        </Text>
      );
    }
  }

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>  {connector} </Text>
      {parts}
    </Box>
  );
}

interface EnhancedToolActivityProps {
  tools: EnhancedToolCall[];
  maxVisible?: number;
  showTimeline?: boolean;
  showSubagents?: boolean;
  showInputPreview?: boolean;
  maxWidth?: number;
}

/**
 * Enhanced tool activity display with tree connectors and input previews
 */
function EnhancedToolActivity({
  tools,
  maxVisible = 5,
  showTimeline = true,
  showSubagents = true,
  showInputPreview = true,
  maxWidth = 80,
}: EnhancedToolActivityProps): React.ReactElement {
  const visibleTools = tools.slice(-maxVisible);
  const hiddenCount = tools.length - visibleTools.length;

  return (
    <Box flexDirection="column">
      {hiddenCount > 0 && (
        <Box flexDirection="row">
          <Text color={colors.dim}>  ... {hiddenCount} more tools above</Text>
        </Box>
      )}

      {visibleTools.map((tool, index) => (
        <React.Fragment key={tool.id}>
          <EnhancedToolRow
            tool={tool}
            isLast={index === visibleTools.length - 1}
            showInputPreview={showInputPreview}
            showSubagents={showSubagents}
            maxWidth={maxWidth}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// Export the enhanced version
export { EnhancedToolActivity };

// ============================================================================
// Main Component
// ============================================================================

export interface ToolActivityProps {
  /** List of tool calls (supports both legacy and enhanced format) */
  tools: (ToolCall | EnhancedToolCall)[];
  /** Maximum number of visible tools (default: 8) */
  maxVisible?: number;
  /** Maximum detail length before truncation (deprecated, now auto-calculated) */
  maxDetailLength?: number;
  /** Whether tools are visible (for toggle) */
  visible?: boolean;
  /** Compact mode - single line summary with counts */
  compact?: boolean;
  /** Override terminal width (otherwise uses useTerminalSize) */
  terminalWidth?: number;
  /** Show timing column (default: true) */
  showTiming?: boolean;
  /** Show result metadata column (default: true) */
  showResult?: boolean;
  /** Group similar operations together (default: false) */
  grouped?: boolean;
  /** Show nested task operations in tree structure (default: true) */
  showNested?: boolean;
  /** Show visual timeline of operations (default: false) */
  showTimeline?: boolean;
  /** Show stats summary row at bottom (default: true) */
  showStats?: boolean;
  /** Use natural language descriptions instead of tool names (default: false) */
  useNaturalLanguage?: boolean;
}

export function ToolActivity({
  tools,
  maxVisible = 8,
  visible = true,
  compact = false,
  terminalWidth: terminalWidthProp,
  showTiming = true,
  showResult = true,
  grouped = false,
  showNested = true,
  showTimeline = false,
  showStats = true,
  useNaturalLanguage = false,
}: ToolActivityProps): React.ReactElement | null {
  const terminalSize = useTerminalSize();
  const width = terminalWidthProp ?? terminalSize.columns;

  if (!visible || tools.length === 0) {
    return null;
  }

  // Normalize all tools to enhanced format
  const normalizedTools = normalizeTools(tools);

  // Calculate stats (memoized for efficiency)
  const stats = useMemo(
    () => getToolStats(normalizedTools),
    [normalizedTools]
  );

  // Calculate flexible column widths
  // Total: [padding] [icon] [name] [detail...] [timing] [status]
  // Fixed: 2 (padding) + 2 (icon + space) + 10 (name) + 2 (status with space)
  const fixedWidth =
    2 + // left padding
    COL_ICON + // icon + space
    COL_TOOL_NAME + // tool name
    (showTiming ? COL_TIMING : 0) + // timing
    2; // status with space

  // Use more terminal width - aim for 90% of available
  const effectiveWidth = Math.min(width, Math.max(80, Math.floor(width * 0.95)));
  const availableWidth = Math.max(effectiveWidth - fixedWidth, 20);

  // Allocate remaining space between detail and result
  // Better ratio: 70% detail, 30% result for wider terminals
  let detailWidth: number;
  let resultWidth: number;

  if (showResult) {
    const resultRatio = effectiveWidth > 100 ? 0.2 : 0.25;
    resultWidth = Math.max(COL_RESULT_MIN, Math.floor(availableWidth * resultRatio));
    detailWidth = availableWidth - resultWidth;
  } else {
    detailWidth = availableWidth;
    resultWidth = 0;
  }

  // Compact mode: just icons and counts
  if (compact) {
    const counts: Record<string, { count: number; running: number }> = {};
    for (const tool of normalizedTools) {
      if (!counts[tool.name]) {
        counts[tool.name] = { count: 0, running: 0 };
      }
      // TypeScript needs the non-null assertion since we just created it above
      counts[tool.name]!.count++;
      if (tool.status === "running") {
        counts[tool.name]!.running++;
      }
    }

    return (
      <Box flexDirection="row" gap={1}>
        <Text color={colors.dim}>  </Text>
        {Object.entries(counts).map(([name, { count, running }], i) => {
          const { icon, color } = TOOL_ICONS[name] ?? {
            icon: "\u25B8",
            color: colors.dim,
          };
          const isActive = running > 0;
          return (
            <React.Fragment key={name}>
              {i > 0 && <Text color={colors.dim}> </Text>}
              <Text color={isActive ? color : colors.dim}>{icon}</Text>
              <Text color={isActive ? colors.muted : colors.dim}>{count}</Text>
              {running > 0 && (
                <Text color={colors.accent}>({running})</Text>
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  // Check if any tools are currently running (to dim completed ones)
  const hasRunning = normalizedTools.some((t) => t.status === "running");

  // Count completed vs running tools
  const completedCountGrouped = normalizedTools.filter(t => t.status === "success" || t.status === "error").length;

  // Grouped mode: group consecutive tools of same type
  if (grouped) {
    const toolGroups = groupTools(normalizedTools);
    const visibleGroups = toolGroups.slice(-maxVisible);

    return (
      <Box flexDirection="column">
        {/* Animated operation dots at top */}
        {normalizedTools.length > 0 && (
          <Box marginBottom={0} marginLeft={2}>
            <OperationDots
              total={normalizedTools.length}
              completed={completedCountGrouped}
              hasRunning={hasRunning}
            />
          </Box>
        )}

        {/* Legacy Timeline (disabled by default) */}
        {showTimeline && <Timeline tools={normalizedTools} width={effectiveWidth} />}

        {/* Grouped rows */}
        {visibleGroups.map((group, index) => (
          <React.Fragment key={`${group.name}-${index}`}>
            <GroupedRow
              group={group}
              detailWidth={detailWidth}
              showTiming={showTiming}
              dimRow={hasRunning}
            />
          </React.Fragment>
        ))}

        {/* Stats summary at bottom */}
        {showStats && <StatsSummary stats={stats} width={effectiveWidth} />}
      </Box>
    );
  }

  // Standard mode with optional nested task views
  const visibleTools = normalizedTools.slice(-maxVisible);

  // Count completed vs running tools
  const completedCount = normalizedTools.filter(t => t.status === "success" || t.status === "error").length;

  return (
    <Box flexDirection="column">
      {/* Animated operation dots at top */}
      {normalizedTools.length > 0 && (
        <Box marginBottom={0} marginLeft={2}>
          <OperationDots
            total={normalizedTools.length}
            completed={completedCount}
            hasRunning={hasRunning}
          />
        </Box>
      )}

      {/* Legacy Timeline (disabled by default) */}
      {showTimeline && <Timeline tools={normalizedTools} width={effectiveWidth} />}

      {/* Tool rows */}
      {visibleTools.map((tool) => {
        // Use TaskRowWithNested for Task tools that have nested operations
        if (
          tool.name === "Task" &&
          showNested &&
          tool.nested &&
          tool.nested.length > 0
        ) {
          return (
            <React.Fragment key={tool.id}>
              <TaskRowWithNested
                tool={tool}
                detailWidth={detailWidth}
                resultWidth={resultWidth}
                showTiming={showTiming}
                showResult={showResult}
                dimRow={hasRunning}
                showNested={showNested}
              />
            </React.Fragment>
          );
        }

        // Standard row for other tools
        return (
          <React.Fragment key={tool.id}>
            <ToolRow
              tool={tool}
              detailWidth={detailWidth}
              resultWidth={resultWidth}
              showTiming={showTiming}
              showResult={showResult}
              dimRow={hasRunning}
              useNaturalLanguage={useNaturalLanguage}
            />
          </React.Fragment>
        );
      })}

      {/* Stats summary at bottom */}
      {showStats && <StatsSummary stats={stats} width={effectiveWidth} />}
    </Box>
  );
}
