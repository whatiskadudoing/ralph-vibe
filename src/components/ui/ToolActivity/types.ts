/**
 * @module components/ui/ToolActivity/types
 *
 * Type definitions and interfaces for ToolActivity components.
 */

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
export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

/** Token usage information for a tool operation */
export interface TokenUsage {
  /** Input tokens (prompt + context) */
  inputTokens: number;
  /** Output tokens (response) */
  outputTokens: number;
  /** Tokens read from cache */
  cacheReadTokens: number;
  /** Tokens written to cache */
  cacheWriteTokens: number;
  /** Cache efficiency percentage (0-100) */
  cacheEfficiency: number;
}

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
  /** Token usage for this operation (from tool_result event) */
  tokenUsage?: TokenUsage;
  /** Cost in USD (if available) */
  costUsd?: number;
  /** Model used for this operation */
  model?: string;
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
    /** Number of lines in file (from Read tool_result) */
    numLines?: number;
    /** Total lines in file (from Read tool_result) */
    totalLines?: number;
    /** Whether output was truncated */
    truncated?: boolean;
  };
  /** Model used for Task/subagent tools */
  subagentModel?: 'opus' | 'sonnet' | 'haiku' | string;
  /** Nested tool calls (for Task tools with subagent operations) */
  nested?: EnhancedToolCall[];
  /** Context management info (if context was truncated/summarized) */
  contextManagement?: {
    truncated: boolean;
    summarized: boolean;
    message?: string;
  };
}

/** Grouped tool operations */
export interface ToolGroup {
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

/** Tool stats summary */
export interface ToolStats {
  total: number;
  byType: Record<string, number>;
  totalDuration: number;
}

/** Props for the main ToolActivity component */
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
