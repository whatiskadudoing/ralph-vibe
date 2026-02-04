/**
 * @module components/ui/ToolActivity
 *
 * Enhanced live tool activity feed showing recent operations.
 * Features tree-style connectors, tool-specific icons, input previews,
 * subagent model badges, and clean formatting.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useTerminalSize } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { formatDuration as formatDurationMs } from '@/utils/formatting.ts';

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

/** Simple, consistent tool icons */
const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  Read: { icon: '○', color: colors.info },
  Write: { icon: '○', color: colors.success },
  Edit: { icon: '~', color: colors.accent },
  Bash: { icon: '$', color: colors.magenta },
  Glob: { icon: '*', color: colors.cyan },
  Grep: { icon: '/', color: colors.cyan },
  Task: { icon: '◆', color: colors.accent },
  WebFetch: { icon: '↓', color: colors.info },
  WebSearch: { icon: '?', color: colors.success },
  NotebookEdit: { icon: '□', color: colors.magenta },
  TodoRead: { icon: '☐', color: colors.dim },
  TodoWrite: { icon: '☑', color: colors.success },
};

/** Status indicators */
const STATUS_INDICATORS: Record<ToolStatus, { char: string; color: string }> = {
  pending: { char: '○', color: colors.dim },
  running: { char: '●', color: colors.accent },
  success: { char: '✓', color: colors.success },
  error: { char: '✗', color: colors.error },
};

/** Spinner frames for running status */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Colors for animated dots - vibrant cycling colors */
const DOT_COLORS = [
  colors.accent, // orange
  colors.success, // green
  colors.cyan, // cyan
  colors.magenta, // magenta
];

/** Column widths - optimized for readability */
const COL_ICON = 2;
const COL_TOOL_NAME = 12;  // Wider for tool names
const COL_TIMING = 8;       // Consistent timing width
const _COL_STATUS = 3;
const COL_RESULT_MIN = 12;
const COL_TOKEN_BADGE = 18; // Space for token badge [ 12.3k ▼ 45% ]

/** Tree connector characters */
const TREE_BRANCH = '├─';
const TREE_LAST = '└─';

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
  const isRunning = status === 'running';
  const suffix = isRunning ? '...' : '';

  switch (name) {
    case 'Read': {
      const path = String(input.file_path ?? input.path ?? '');
      const filename = path.split('/').pop() ?? path;
      return `Reading ${filename}${suffix}`;
    }

    case 'Write': {
      const path = String(input.file_path ?? input.path ?? '');
      const filename = path.split('/').pop() ?? path;
      return `Creating ${filename}${suffix}`;
    }

    case 'Edit': {
      const path = String(input.file_path ?? input.path ?? '');
      const filename = path.split('/').pop() ?? path;
      return `Editing ${filename}${suffix}`;
    }

    case 'Bash': {
      const cmd = String(input.command ?? '');
      // Detect common command patterns
      if (cmd.startsWith('npm ')) return `Running npm${suffix}`;
      if (cmd.startsWith('yarn ')) return `Running yarn${suffix}`;
      if (cmd.startsWith('pnpm ')) return `Running pnpm${suffix}`;
      if (cmd.startsWith('deno ')) return `Running deno${suffix}`;
      if (cmd.startsWith('git ')) return `Git operation${suffix}`;
      if (cmd.includes('test')) return `Running tests${suffix}`;
      if (cmd.includes('build')) return `Building${suffix}`;
      if (cmd.includes('lint')) return `Linting${suffix}`;
      if (cmd.startsWith('cd ')) return `Changing directory${suffix}`;
      if (cmd.startsWith('ls ') || cmd === 'ls') return `Listing files${suffix}`;
      if (cmd.startsWith('cat ')) return `Reading file${suffix}`;
      if (cmd.startsWith('mkdir ')) return `Creating directory${suffix}`;
      return `Running command${suffix}`;
    }

    case 'Glob': {
      const pattern = String(input.pattern ?? '');
      if (pattern.includes('*')) {
        const ext = pattern.match(/\*\.(\w+)/)?.[1];
        if (ext) return `Finding ${ext} files${suffix}`;
      }
      return `Finding files${suffix}`;
    }

    case 'Grep': {
      const pattern = String(input.pattern ?? '');
      const shortPattern = pattern.length > 20 ? pattern.slice(0, 17) + '...' : pattern;
      return `Searching "${shortPattern}"${suffix}`;
    }

    case 'Task': {
      const desc = String(input.description ?? input.task ?? '');
      if (desc.length > 30) {
        return desc.slice(0, 27) + '...' + suffix;
      }
      return desc + suffix;
    }

    case 'WebFetch': {
      const url = String(input.url ?? '');
      const prompt = String(input.prompt ?? '');

      // If there's a prompt, show what we're looking for
      if (prompt && prompt.length > 0) {
        const shortPrompt = prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt;
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

    case 'WebSearch': {
      const query = String(input.query ?? '');
      // Show full query without truncation for better context
      const maxQueryLength = 50;
      const displayQuery = query.length > maxQueryLength
        ? query.slice(0, maxQueryLength - 3) + '...'
        : query;
      return `Searching "${displayQuery}"${suffix}`;
    }

    case 'NotebookEdit':
      return `Editing notebook${suffix}`;

    case 'TodoRead':
      return `Reading tasks${suffix}`;

    case 'TodoWrite':
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
  index: number,
): EnhancedToolCall {
  return {
    id: tool.id ?? `legacy-${index}-${Date.now()}`,
    name: tool.name,
    status: 'success',
    input: { detail: tool.detail },
  };
}

/**
 * Check if a tool call is an EnhancedToolCall
 */
export function isEnhancedToolCall(
  tool: ToolCall | EnhancedToolCall,
): tool is EnhancedToolCall {
  return 'status' in tool && 'input' in tool;
}

/**
 * Normalize tools to EnhancedToolCall format
 */
export function normalizeTools(
  tools: (ToolCall | EnhancedToolCall)[],
): EnhancedToolCall[] {
  return tools.map((tool, index) =>
    isEnhancedToolCall(tool) ? tool : convertLegacyToolCall(tool, index)
  );
}

/**
 * Format duration between two timestamps using the shared formatter.
 * Calculates elapsed time and delegates to formatDurationMs.
 */
function formatTimestampDuration(startTime?: number, endTime?: number): string {
  if (!startTime) return '';
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  return formatDurationMs(ms);
}

// formatDurationMs is imported from @/utils/formatting.ts as formatDuration

// ============================================================================
// Helper Functions for Enhanced Display
// ============================================================================

/**
 * Get icon for tool name
 */
export function getToolIcon(name: string): string {
  return TOOL_ICONS[name]?.icon ?? '▸';
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
    case 'Read': {
      const path = String(input.file_path ?? input.path ?? '');
      const parts = path.split('/');
      const shortPath = parts.length > 2 ? parts.slice(-2).join('/') : path;
      // Show line range if specified
      const offset = input.offset as number | undefined;
      const limit = input.limit as number | undefined;
      if (offset !== undefined || limit !== undefined) {
        const range = offset !== undefined && limit !== undefined
          ? `lines ${offset}-${offset + limit}`
          : offset !== undefined
          ? `from line ${offset}`
          : `first ${limit} lines`;
        return { primary: shortPath, secondary: range };
      }
      return { primary: shortPath };
    }

    case 'Write': {
      const path = String(input.file_path ?? input.path ?? '');
      const parts = path.split('/');
      const shortPath = parts.length > 2 ? parts.slice(-2).join('/') : path;
      const content = String(input.content ?? '');
      const lines = content.split('\n').length;
      return { primary: shortPath, secondary: `${lines} lines` };
    }

    case 'Edit': {
      const path = String(input.file_path ?? input.path ?? '');
      const parts = path.split('/');
      const shortPath = parts.length > 2 ? parts.slice(-2).join('/') : path;
      // Show what's being changed
      const oldStr = String(input.old_string ?? '').trim();
      const newStr = String(input.new_string ?? '').trim();
      if (oldStr && newStr) {
        // Truncate and show the change
        const oldPreview = (oldStr.split('\n')[0] ?? '').slice(0, 30);
        const newPreview = (newStr.split('\n')[0] ?? '').slice(0, 30);
        return { primary: shortPath, secondary: `"${oldPreview}..." → "${newPreview}..."` };
      }
      return { primary: shortPath };
    }

    case 'Bash': {
      const cmd = String(input.command ?? '');
      const desc = String(input.description ?? '');
      if (desc) {
        return { primary: cmd.slice(0, 50), secondary: desc };
      }
      return { primary: cmd };
    }

    case 'Glob': {
      const pattern = String(input.pattern ?? '');
      const path = String(input.path ?? '');
      if (path) {
        return { primary: pattern, secondary: `in ${path}` };
      }
      return { primary: pattern };
    }

    case 'Grep': {
      const pattern = String(input.pattern ?? '');
      const path = String(input.path ?? '');
      const glob = String(input.glob ?? '');
      const secondary = path ? `in ${path}` : glob ? `*.${glob}` : undefined;
      return { primary: `/${pattern}/`, secondary };
    }

    case 'Task': {
      const desc = String(input.description ?? input.task ?? '');
      const model = String(input.model ?? '');
      if (model) {
        return { primary: `"${desc}"`, secondary: `[${model}]` };
      }
      return { primary: `"${desc}"` };
    }

    case 'TodoWrite': {
      const todos = input.todos as Array<{ content?: string; status?: string }> | undefined;
      if (todos && todos.length > 0) {
        const pending = todos.filter((t) => t.status === 'pending').length;
        const completed = todos.filter((t) => t.status === 'completed').length;
        return {
          primary: `${todos.length} tasks`,
          secondary: `${completed} done, ${pending} pending`,
        };
      }
      return { primary: 'updating tasks' };
    }

    case 'WebFetch': {
      const url = String(input.url ?? '');
      const prompt = String(input.prompt ?? '');
      // Show full URL and prompt on separate lines if needed
      return {
        primary: url,
        secondary: prompt ? `Q: ${prompt}` : undefined,
      };
    }

    case 'WebSearch': {
      const query = String(input.query ?? '');
      // Show full query without truncation
      return { primary: `"${query}"` };
    }

    default:
      // Return first string value found
      for (const value of Object.values(input)) {
        if (typeof value === 'string' && value.length > 0) {
          return { primary: value };
        }
      }
      return { primary: '' };
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
    return combined.length > maxLength ? combined.slice(0, maxLength - 3) + '...' : combined;
  }

  // Just truncate primary if too long
  return formatted.primary.length > maxLength
    ? formatted.primary.slice(0, maxLength - 3) + '...'
    : formatted.primary;
}

/**
 * Get model badge text
 */
export function getModelBadge(model?: string): string {
  if (!model) return '';

  if (model.includes('opus')) return '[opus]';
  if (model.includes('sonnet')) return '[sonnet]';
  if (model.includes('haiku')) return '[haiku]';

  return `[${model.slice(0, 6)}]`;
}

/**
 * Get model badge color
 */
export function getModelBadgeColor(model?: string): string {
  if (!model) return colors.dim;

  if (model.includes('opus')) return MODEL_COLORS['opus'] ?? colors.dim;
  if (model.includes('sonnet')) return MODEL_COLORS['sonnet'] ?? colors.dim;
  if (model.includes('haiku')) return MODEL_COLORS['haiku'] ?? colors.dim;

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
      if (tool.status === 'running') currentGroup.hasRunning = true;
      if (tool.status === 'error') currentGroup.hasError = true;
      if (tool.startTime) {
        const end = tool.endTime ?? Date.now();
        currentGroup.totalDuration += end - tool.startTime;
      }
    } else {
      currentGroup = {
        name: tool.name,
        tools: [tool],
        hasRunning: tool.status === 'running',
        hasError: tool.status === 'error',
        totalDuration: tool.startTime ? (tool.endTime ?? Date.now()) - tool.startTime : 0,
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
  totalTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  avgCacheEfficiency: number;
  totalCost: number;
} {
  const byType: Record<string, number> = {};
  let totalDuration = 0;
  let totalTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let totalCost = 0;
  let toolsWithTokens = 0;

  for (const tool of tools) {
    byType[tool.name] = (byType[tool.name] ?? 0) + 1;

    if (tool.startTime) {
      const end = tool.endTime ?? Date.now();
      totalDuration += end - tool.startTime;
    }

    if (tool.tokenUsage) {
      totalTokens += tool.tokenUsage.inputTokens + tool.tokenUsage.outputTokens;
      totalCacheReadTokens += tool.tokenUsage.cacheReadTokens;
      totalCacheWriteTokens += tool.tokenUsage.cacheWriteTokens;
      toolsWithTokens++;
    }

    if (tool.costUsd) {
      totalCost += tool.costUsd;
    }
  }

  // Calculate average cache efficiency
  const totalCacheableTokens = totalCacheReadTokens + totalCacheWriteTokens;
  const avgCacheEfficiency = totalCacheableTokens > 0
    ? Math.round((totalCacheReadTokens / totalCacheableTokens) * 100)
    : 0;

  return {
    total: tools.length,
    byType,
    totalDuration,
    totalTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    avgCacheEfficiency,
    totalCost,
  };
}

/**
 * Smart path formatting based on available width
 */
function formatPathSmart(path: string, maxWidth: number): string {
  if (path.length <= maxWidth) return path;

  const parts = path.split('/');

  // Try just filename
  const filename = parts[parts.length - 1] ?? path;
  if (filename.length <= maxWidth) return filename;

  // Try last two parts (dir/file)
  if (parts.length >= 2) {
    const shortPath = parts.slice(-2).join('/');
    if (shortPath.length <= maxWidth) return shortPath;
  }

  // Truncate filename
  return truncate(filename, maxWidth);
}

/**
 * Format result metadata based on tool type
 */
function _formatResult(tool: EnhancedToolCall): string {
  const { name, result, subagentModel } = tool;

  if (!result) {
    // For Task tool, show model even without result
    if (name === 'Task' && subagentModel) {
      const modelShort = subagentModel.includes('sonnet')
        ? 'sonnet'
        : subagentModel.includes('haiku')
        ? 'haiku'
        : subagentModel.includes('opus')
        ? 'opus'
        : subagentModel.slice(0, 8);
      return `(${modelShort})`;
    }
    return '';
  }

  switch (name) {
    case 'Glob':
    case 'Grep':
      if (result.matchCount !== undefined) {
        const unit = result.matchCount === 1 ? 'file' : 'files';
        return `${result.matchCount} ${unit}`;
      }
      break;

    case 'Read':
      if (result.lineRange) {
        return `L${result.lineRange}`;
      }
      if (result.fileSize !== undefined) {
        return formatFileSize(result.fileSize);
      }
      break;

    case 'Write':
      if (result.fileSize !== undefined) {
        return formatFileSize(result.fileSize);
      }
      break;

    case 'Edit':
      if (result.linesAdded !== undefined || result.linesRemoved !== undefined) {
        const added = result.linesAdded ?? 0;
        const removed = result.linesRemoved ?? 0;
        return `+${added} -${removed}`;
      }
      if (result.linesChanged !== undefined) {
        return `${result.linesChanged} lines`;
      }
      break;

    case 'Bash':
      if (result.exitCode !== undefined) {
        return `exit ${result.exitCode}`;
      }
      break;

    case 'Task': {
      const parts: string[] = [];
      if (result.operationCount !== undefined) {
        parts.push(`${result.operationCount} ops`);
      }
      if (subagentModel) {
        const modelShort = subagentModel.includes('sonnet')
          ? 'sonnet'
          : subagentModel.includes('haiku')
          ? 'haiku'
          : subagentModel.includes('opus')
          ? 'opus'
          : subagentModel.slice(0, 8);
        parts.push(`(${modelShort})`);
      }
      return parts.join(' ');
    }

    default:
      break;
  }

  return '';
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
 * Format token count in human-readable format (k for thousands, M for millions)
 */
function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

/**
 * Extract detail string from tool input
 */
function extractDetail(tool: EnhancedToolCall): string {
  const { input } = tool;

  // Handle legacy format where detail was stored directly
  if (input.detail && typeof input.detail === 'string') {
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
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Smart truncation for file paths - shows filename, truncates path.
 * Examples:
 *   "/very/long/path/to/file.ts" → "…/file.ts"
 *   "https://example.com/very/long/url" → "…/long/url"
 */
function smartTruncateDetail(detail: string, maxLength: number): string {
  if (detail.length <= maxLength) return detail;

  // For file paths - prioritize showing the filename
  if (detail.includes('/')) {
    const parts = detail.split('/');
    const filename = parts[parts.length - 1] ?? '';

    // If just the filename fits, show path prefix + filename
    if (filename.length < maxLength - 3) {
      const remaining = maxLength - filename.length - 3;
      if (remaining > 0) {
        const pathPrefix = detail.slice(0, remaining);
        return pathPrefix + '…/' + filename;
      }
      return '…/' + filename;
    }
  }

  // For URLs - show end of URL
  if (detail.startsWith('http')) {
    return '…' + detail.slice(-(maxLength - 1));
  }

  // Default: truncate end
  return detail.slice(0, maxLength - 1) + '…';
}

/**
 * Pad string to exact width
 */
function padEnd(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

/**
 * Extract detail with smart path formatting
 */
function extractDetailSmart(tool: EnhancedToolCall, maxWidth: number): string {
  const { name, input } = tool;

  // Handle legacy format where detail was stored directly
  if (input.detail && typeof input.detail === 'string') {
    return truncate(input.detail, maxWidth);
  }

  // Use formatToolInput for consistent formatting
  const formatted = formatToolInput(tool);

  // Special handling for path-based tools
  if (name === 'Read' || name === 'Write' || name === 'Edit') {
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

  return <Text color={color}>{SPINNER_FRAMES[frame] ?? '⠋'}</Text>;
}

/**
 * Animated operation dots indicator
 * Shows completed operations as green dots, running as blinking orange
 */
function OperationDots({
  total,
  completed,
  hasRunning,
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
      dotColor = DOT_COLORS[colorIndex % DOT_COLORS.length] ?? colors.accent;
    }

    dots.push(
      <Text key={i} color={dotColor}>
        {isRunning ? '●' : isCompleted ? '●' : '○'}
      </Text>,
    );

    // Add connector between dots
    if (i < showDots - 1) {
      dots.push(
        <Text key={`c${i}`} color={colors.dim}>─</Text>,
      );
    }
  }

  return (
    <Box flexDirection='row' gap={0}>
      {dots}
      {extraCount > 0 && <Text color={colors.dim}>+{extraCount}</Text>}
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

/**
 * Token usage badge showing total tokens and cache efficiency
 * Format: [ 23k ▼ 89% ] or [ 23k ▼ ●●●●○ ] with nice spacing
 */
function TokenBadge({
  tokenUsage,
  showDots = false,
}: {
  tokenUsage: TokenUsage;
  showDots?: boolean;
}): React.ReactElement {
  const totalTokens = tokenUsage.inputTokens + tokenUsage.outputTokens;
  const cachePercent = tokenUsage.cacheEfficiency;

  // Color-code cache efficiency: green (>70%), orange (40-70%), dim (<40%)
  const cacheColor = cachePercent > 70
    ? colors.success
    : cachePercent > 40
    ? colors.accent
    : colors.dim;

  if (showDots) {
    const filled = Math.round(cachePercent / 20); // 0-5 dots
    const dots = '●'.repeat(filled) + '○'.repeat(5 - filled);

    return (
      <Box flexDirection="row">
        <Text color={colors.dim}>[ </Text>
        <Text color={colors.muted}>{formatTokenCount(totalTokens)}</Text>
        <Text color={colors.dim}> ▼ </Text>
        <Text color={cacheColor}>{dots}</Text>
        <Text color={colors.dim}> ]</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>[ </Text>
      <Text color={colors.muted}>{formatTokenCount(totalTokens)}</Text>
      <Text color={colors.dim}> ▼ </Text>
      <Text color={cacheColor}>{cachePercent}%</Text>
      <Text color={colors.dim}> ]</Text>
    </Box>
  );
}

/**
 * Cache efficiency dots indicator
 * Shows 5 dots representing cache hit rate: ●●●●○ = 80% cached
 * Color-coded: green (>70%), orange (40-70%), dim (<40%)
 */
function CacheEfficiencyDots({ efficiency }: { efficiency: number }): React.ReactElement {
  const filled = Math.round(efficiency / 20); // 0-5 dots (20% per dot)
  const dots = '●'.repeat(filled) + '○'.repeat(5 - filled);

  const color = efficiency > 70
    ? colors.success
    : efficiency > 40
    ? colors.accent
    : colors.dim;

  return <Text color={color}>{dots}</Text>;
}

/**
 * Model badge showing which Claude model was used
 * Format: [ opus ] [ sonnet ] [ haiku ]
 * Color-coded by model type with nice spacing
 */
function ModelBadge({ model }: { model: string }): React.ReactElement {
  // Extract model name from full model ID
  const modelName = model.includes('opus')
    ? 'opus'
    : model.includes('sonnet')
    ? 'sonnet'
    : model.includes('haiku')
    ? 'haiku'
    : model.slice(0, 10); // Fallback: first 10 chars

  // Color-code by model
  const modelColor = modelName === 'opus'
    ? colors.accent
    : modelName === 'sonnet'
    ? colors.info
    : modelName === 'haiku'
    ? colors.success
    : colors.dim;

  return (
    <Box flexDirection="row">
      <Text color={colors.dim}>[ </Text>
      <Text color={modelColor}>{modelName}</Text>
      <Text color={colors.dim}> ]</Text>
    </Box>
  );
}

/**
 * Expandable detail row showing token breakdown
 * Shows input/output tokens, cache stats, cost, and context warnings
 * With improved spacing and formatting
 */
function ToolDetailRow({ tool }: { tool: EnhancedToolCall }): React.ReactElement | null {
  if (!tool.tokenUsage && !tool.contextManagement) return null;

  const { tokenUsage, costUsd, model, contextManagement } = tool;

  return (
    <Box flexDirection='column' marginLeft={4} marginTop={1}>
      {/* Token breakdown */}
      {tokenUsage && (
        <>
          <Box flexDirection='row'>
            <Text color={colors.dim}>├─ </Text>
            <Text color={colors.muted}>Input: </Text>
            <Text color={colors.text}>{tokenUsage.inputTokens.toLocaleString()}</Text>
            <Text color={colors.muted}> tokens</Text>
            {tokenUsage.cacheReadTokens > 0 && (
              <>
                <Text color={colors.dim}> (</Text>
                <Text color={colors.success}>{tokenUsage.cacheReadTokens.toLocaleString()} cached</Text>
                <Text color={colors.dim}>)</Text>
              </>
            )}
          </Box>

          {/* Output tokens */}
          <Box flexDirection='row'>
            <Text color={colors.dim}>├─ </Text>
            <Text color={colors.muted}>Output: </Text>
            <Text color={colors.text}>{tokenUsage.outputTokens.toLocaleString()}</Text>
            <Text color={colors.muted}> tokens</Text>
          </Box>

          {/* Cache write tokens (if any) */}
          {tokenUsage.cacheWriteTokens > 0 && (
            <Box flexDirection='row'>
              <Text color={colors.dim}>├─ </Text>
              <Text color={colors.muted}>Cache write: </Text>
              <Text color={colors.text}>{tokenUsage.cacheWriteTokens.toLocaleString()}</Text>
              <Text color={colors.muted}> tokens</Text>
            </Box>
          )}
        </>
      )}

      {/* Context management warning */}
      {contextManagement && (contextManagement.truncated || contextManagement.summarized) && (
        <Box flexDirection='row'>
          <Text color={colors.accent}>├─ ⚠  Context </Text>
          <Text color={colors.accent}>
            {contextManagement.truncated ? 'truncated' : 'summarized'}
          </Text>
          {contextManagement.message && (
            <Text color={colors.dim}>: {contextManagement.message}</Text>
          )}
        </Box>
      )}

      {/* Cost and model */}
      <Box flexDirection='row'>
        <Text color={colors.dim}>└─ </Text>
        {costUsd && (
          <>
            <Text color={colors.muted}>Cost: </Text>
            <Text color={colors.success}>${costUsd.toFixed(4)}</Text>
          </>
        )}
        {costUsd && model && <Text color={colors.dim}> · </Text>}
        {model && (
          <Text color={colors.dim}>{model}</Text>
        )}
        {!costUsd && model && (
          <>
            <Text color={colors.muted}>Model: </Text>
            <Text color={colors.dim}>{model}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

interface ToolRowProps {
  tool: EnhancedToolCall;
  detailWidth: number;
  resultWidth?: number;
  showTiming: boolean;
  showResult?: boolean;
  dimRow: boolean;
  /** Terminal width for full-width layout */
  terminalWidth?: number;
  /** Use natural language description instead of tool name + detail */
  useNaturalLanguage?: boolean;
  /** Show token usage badges */
  showTokens?: boolean;
  /** Show expandable token detail rows */
  showTokenDetails?: boolean;
  /** Show cache efficiency dots instead of percentage */
  showCacheDots?: boolean;
  /** Show model badges for all tools */
  showModels?: boolean;
}

/**
 * Single tool row with multi-column layout
 */
function ToolRow({
  tool,
  detailWidth,
  showTiming,
  dimRow,
  terminalWidth,
  useNaturalLanguage = false,
  showTokens = true,
  showTokenDetails = false,
  showCacheDots = false,
  showModels = false,
}: ToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: '▸',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  // Dim completed tools when there are running tools
  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  const durationStr = formatTimestampDuration(tool.startTime, tool.endTime);

  // Use natural language or traditional tool name + detail
  if (useNaturalLanguage) {
    const activityText = getActivityDescription(tool);

    return (
      <Box flexDirection='column'>
        <Box flexDirection='row' marginLeft={2} width={terminalWidth ? terminalWidth - 4 : undefined}>
          {isRunning
            ? <SpinnerIcon color={iconColor} />
            : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
          <Text> </Text>
          <Text color={textColor}>{activityText}</Text>

          {/* Flexible spacer */}
          <Box flexGrow={1} minWidth={2} />

          {/* Right section */}
          {showTiming && (
            <>
              <Text color={colors.dim}>{durationStr}</Text>
              {(showTokens && tool.tokenUsage) && <Text color={colors.dim}> · </Text>}
            </>
          )}

          {showTokens && tool.tokenUsage && (
            <>
              <TokenBadge tokenUsage={tool.tokenUsage} showDots={showCacheDots} />
              <Text> </Text>
            </>
          )}

          {showModels && tool.model && (
            <>
              <ModelBadge model={tool.model} />
              <Text> </Text>
            </>
          )}

          {tool.contextManagement?.truncated && (
            <>
              <Text color={colors.accent}>⚠</Text>
              <Text> </Text>
            </>
          )}

          <Text color={statusInfo.color}>{statusInfo.char}</Text>
        </Box>

        {/* Expandable detail row */}
        {showTokenDetails && <ToolDetailRow tool={tool} />}
      </Box>
    );
  }

  // Traditional display: tool name + detail
  const formatted = formatToolInput(tool);
  const hasSecondaryInfo = formatted.secondary !== undefined;

  // Truncate detail intelligently - prioritize filename over path
  const truncatedDetail = smartTruncateDetail(formatted.primary, detailWidth);

  return (
    <Box flexDirection='column'>
      {/* Primary row - explicit width for proper flex layout */}
      <Box flexDirection='row' marginLeft={2} width={terminalWidth ? terminalWidth - 4 : undefined}>
        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text> </Text>
        <Text color={textColor} bold={isRunning}>
          {padEnd(tool.name, COL_TOOL_NAME)}
        </Text>
        <Text color={colors.dim}>· </Text>
        <Text color={detailColor}>
          {truncatedDetail}
        </Text>

        {/* Flexible spacer - pushes timing/status to far right */}
        <Box flexGrow={1} minWidth={2} />

        {/* Timing and status at far right edge */}
        {showTiming && <Text color={colors.dim}>{durationStr}</Text>}

        {showTokens && tool.tokenUsage && (
          <>
            <Text color={colors.dim}> · </Text>
            <TokenBadge tokenUsage={tool.tokenUsage} showDots={showCacheDots} />
          </>
        )}

        {showModels && tool.model && (
          <>
            <Text> </Text>
            <ModelBadge model={tool.model} />
          </>
        )}

        {tool.contextManagement?.truncated && (
          <>
            <Text> </Text>
            <Text color={colors.accent}>⚠</Text>
          </>
        )}

        <Text> </Text>
        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Secondary row (if present) - indented with tree connector */}
      {hasSecondaryInfo && formatted.secondary && (
        <Box flexDirection='row' marginLeft={4}>
          <Text color={colors.dim}>└─ </Text>
          <Text color={colors.dim}>
            {truncate(formatted.secondary, detailWidth + COL_TOOL_NAME - 4)}
          </Text>
        </Box>
      )}

      {/* Expandable detail row */}
      {showTokenDetails && <ToolDetailRow tool={tool} />}
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
  resultWidth?: number;
  showTiming: boolean;
  showResult?: boolean;
  dimRow: boolean;
}

/**
 * Nested tool row with tree connector
 */
function NestedToolRow({
  tool,
  isLast,
  detailWidth,
  showTiming,
  dimRow,
}: NestedToolRowProps): React.ReactElement {
  const { icon, color: iconColor } = TOOL_ICONS[tool.name] ?? {
    icon: '\u25B8',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  const detail = extractDetailSmart(tool, detailWidth - NESTED_INDENT);
  const durationStr = formatTimestampDuration(tool.startTime, tool.endTime);

  const connector = isLast ? TREE_LAST : TREE_BRANCH;

  return (
    <Box flexDirection='row' marginLeft={4}>
      <Text color={colors.dim}>{connector} </Text>

      {/* Icon */}
      {isRunning
        ? <SpinnerIcon color={iconColor} />
        : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
      <Text> </Text>

      {/* Tool name */}
      <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME - 2)}</Text>

      {/* Detail (reduced width for nesting) */}
      <Text color={detailColor}>
        {padEnd(detail, detailWidth - NESTED_INDENT - 4)}
      </Text>

      {/* Timing */}
      {showTiming && <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>}

      {/* Status with spacing */}
      <Text>  </Text>
      <Text color={statusInfo.color}>{statusInfo.char}</Text>
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
    icon: '\u25B8',
    color: colors.dim,
  };
  const statusInfo = STATUS_INDICATORS[tool.status];

  const textColor = dimRow && tool.status !== 'running' ? colors.dim : colors.muted;
  const detailColor = colors.dim;
  const isRunning = tool.status === 'running';

  // Extract task description
  const taskDesc = String(tool.input.description ?? tool.input.task ?? '');
  const detail = `"${truncate(taskDesc, detailWidth - 10)}"`;

  // Build result string
  const parts: string[] = [];

  if (tool.nested && tool.nested.length > 0) {
    parts.push(`${tool.nested.length} ops`);
  } else if (tool.result?.operationCount !== undefined) {
    parts.push(`${tool.result.operationCount} ops`);
  }

  if (tool.subagentModel) {
    const modelShort = tool.subagentModel.includes('sonnet')
      ? 'sonnet'
      : tool.subagentModel.includes('haiku')
      ? 'haiku'
      : tool.subagentModel.includes('opus')
      ? 'opus'
      : tool.subagentModel.slice(0, 8);
    parts.push(`(${modelShort})`);
  }

  const _resultStr = parts.join(' ');

  const durationStr = formatTimestampDuration(tool.startTime, tool.endTime);

  // Determine which nested tools to show
  const nestedTools = tool.nested ?? [];
  const visibleNested = showNested ? nestedTools.slice(-maxNestedVisible) : [];
  const hiddenCount = nestedTools.length - visibleNested.length;

  return (
    <Box flexDirection='column'>
      {/* Main task row */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text></Text>

        <Text color={textColor}>{padEnd(tool.name, COL_TOOL_NAME)}</Text>
        <Text color={detailColor}>{padEnd(detail, detailWidth)}</Text>

        {showTiming && <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>}

        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Hidden nested count indicator */}
      {showNested && hiddenCount > 0 && (
        <Box flexDirection='row'>
          <Text color={colors.dim}></Text>
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
    icon: '\u25B8',
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
  let itemsStr = shownItems.join(', ');
  if (moreCount > 0) {
    itemsStr += `, +${moreCount} more`;
  }

  const durationStr = formatDurationMs(group.totalDuration);

  return (
    <Box flexDirection='column'>
      {/* Group header */}
      <Box flexDirection='row' marginLeft={2}>
        {isRunning
          ? <SpinnerIcon color={iconColor} />
          : <Text color={dimRow ? colors.dim : iconColor}>{icon}</Text>}
        <Text> </Text>

        <Text color={textColor} bold={isRunning}>
          {padEnd(nameWithCount, COL_TOOL_NAME + 4)}
        </Text>

        {showTiming && <Text color={colors.dim}>{padEnd(durationStr, COL_TIMING)}</Text>}

        <Text>  </Text>
        <Text color={statusInfo.color}>{statusInfo.char}</Text>
      </Box>

      {/* Items list - indented */}
      <Box flexDirection='row' marginLeft={4}>
        <Text color={colors.dim}>└─ </Text>
        <Text color={colors.dim}>
          {truncate(itemsStr, detailWidth + COL_TOOL_NAME - 4)}
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
    <Box flexDirection='column'>
      <Box flexDirection='row'>
        <Text color={colors.dim}>Tools</Text>

        {/* Connection line and dots */}
        {visibleTools.map((tool, index) => {
          const statusColor = tool.status === 'error'
            ? colors.error
            : tool.status === 'running'
            ? colors.accent
            : tool.status === 'success'
            ? colors.success
            : colors.dim;

          const dotChar = tool.status === 'running' ? '\u25CF' : '\u25CF'; // "●"
          const lineChar = index < visibleTools.length - 1 ? '\u2500\u2500' : ''; // "──"

          return (
            <React.Fragment key={tool.id}>
              <Text color={statusColor}>{dotChar}</Text>
              {lineChar && <Text color={colors.dim}>{lineChar}</Text>}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Tool names below (abbreviated) */}
      <Box flexDirection='row'>
        <Text color={colors.dim}></Text>

        {visibleTools.map((tool, index) => {
          const abbrev = tool.name.slice(0, 4);
          const spacing = index < visibleTools.length - 1 ? '  ' : '';

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
    totalTokens: number;
    totalCacheReadTokens: number;
    totalCacheWriteTokens: number;
    avgCacheEfficiency: number;
    totalCost: number;
  };
  width: number;
}

/**
 * Stats summary row showing operation counts, tokens, cache efficiency, and cost
 * Format: 42 operations · 3m 28s · 1.2M tokens (87% cached) · $2.34
 */
function StatsSummary({ stats, width }: StatsSummaryProps): React.ReactElement {
  const summaryParts: string[] = [];

  // Operations count
  summaryParts.push(`${stats.total} operations`);

  // Duration
  if (stats.totalDuration > 0) {
    summaryParts.push(formatDurationMs(stats.totalDuration));
  }

  // Token usage with cache efficiency
  if (stats.totalTokens > 0) {
    const tokenStr = formatTokenCount(stats.totalTokens);
    if (stats.avgCacheEfficiency > 0) {
      summaryParts.push(`${tokenStr} tokens (${stats.avgCacheEfficiency}% cached)`);
    } else {
      summaryParts.push(`${tokenStr} tokens`);
    }
  }

  // Cost
  if (stats.totalCost > 0) {
    summaryParts.push(`$${stats.totalCost.toFixed(4)}`);
  }

  const summary = summaryParts.join(' · ');
  const maxWidth = width - 4; // Account for borders

  return (
    <Box flexDirection='row'>
      <Text color={colors.dim}></Text>
      <Text color={colors.muted}>{truncate(summary, maxWidth)}</Text>
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
  const isRunning = tool.status === 'running';

  // Build the display text
  const parts: React.ReactNode[] = [];

  // Icon
  parts.push(
    <Text key='icon' color={iconColor}>
      {icon}
    </Text>,
  );

  // Tool name or input preview
  if (showInputPreview) {
    const preview = getInputPreview(tool, maxWidth - 20);
    parts.push(
      <Text key='preview' color={colors.text}>
        {' '}
        {tool.name} {preview}
      </Text>,
    );
  } else {
    parts.push(
      <Text key='name' color={colors.text}>
        {' '}
        {tool.name}
      </Text>,
    );
  }

  // Subagent model badge for Task
  if (showSubagents && tool.name === 'Task' && tool.subagentModel) {
    const badge = getModelBadge(tool.subagentModel);
    const badgeColor = getModelBadgeColor(tool.subagentModel);
    parts.push(
      <Text key='badge' color={badgeColor}>
        {' '}
        {badge}
      </Text>,
    );
  }

  // Spacer before status
  parts.push(
    <Text key='spacer' color={colors.dim}>
      {' '}
    </Text>,
  );

  // Status indicator or spinner
  if (isRunning) {
    parts.push(
      <Box key='status'>
        <SpinnerIcon color={statusInfo.color} />
      </Box>,
    );
  } else {
    parts.push(
      <Text key='status' color={statusInfo.color}>
        {statusInfo.char}
      </Text>,
    );
  }

  // Duration
  if (tool.startTime) {
    if (isRunning && !tool.endTime) {
      parts.push(<Text key='duration-space'></Text>);
      parts.push(
        <Box key='duration'>
          <LiveDuration startTime={tool.startTime} />
        </Box>,
      );
    } else {
      const duration = formatTimestampDuration(tool.startTime, tool.endTime);
      parts.push(
        <Text key='duration' color={colors.dim}>
          {' '}
          {duration}
        </Text>,
      );
    }
  }

  return (
    <Box flexDirection='row'>
      <Text color={colors.dim}>{connector}</Text>
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
  showTimeline: _showTimeline = true,
  showSubagents = true,
  showInputPreview = true,
  maxWidth = 80,
}: EnhancedToolActivityProps): React.ReactElement {
  const visibleTools = tools.slice(-maxVisible);
  const hiddenCount = tools.length - visibleTools.length;

  return (
    <Box flexDirection='column'>
      {hiddenCount > 0 && (
        <Box flexDirection='row'>
          <Text color={colors.dim}>... {hiddenCount} more tools above</Text>
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
  /** Show token usage badges (default: true) */
  showTokens?: boolean;
  /** Show expandable token detail rows (default: false) */
  showTokenDetails?: boolean;
  /** Show cache efficiency dots instead of percentage (default: false) */
  showCacheDots?: boolean;
  /** Show model badges for all tools (default: false) */
  showModels?: boolean;
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
  showTokens = true,
  showTokenDetails = false,
  showCacheDots = false,
  showModels = false,
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
    [normalizedTools],
  );

  // Use FULL terminal width for layout
  const effectiveWidth = width;

  // Fixed widths for calculating detail column (but row itself is full width)
  const fixedWidth = 2 + // left padding
    COL_ICON + // icon + space
    COL_TOOL_NAME + // tool name
    (showTiming ? COL_TIMING : 0) + // timing
    COL_TOKEN_BADGE + // token badge space
    2; // status with space

  const availableWidth = Math.max(effectiveWidth - fixedWidth - 10, 20);

  // Allocate remaining space between detail and result
  // Give detail column MORE space - 80% on wide terminals
  let detailWidth: number;
  let resultWidth: number;

  if (showResult) {
    // Less space for result, more for detail (paths/URLs need room)
    const resultRatio = effectiveWidth > 120 ? 0.15 : 0.2;
    resultWidth = Math.max(COL_RESULT_MIN, Math.floor(availableWidth * resultRatio));
    detailWidth = availableWidth - resultWidth;
  } else {
    // No result column - detail gets ALL remaining space
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
      // Get the count entry we just created
      const entry = counts[tool.name];
      if (entry) {
        entry.count++;
        if (tool.status === 'running') {
          entry.running++;
        }
      }
    }

    return (
      <Box flexDirection='row' gap={1}>
        <Text color={colors.dim}></Text>
        {Object.entries(counts).map(([name, { count, running }], i) => {
          const { icon, color } = TOOL_ICONS[name] ?? {
            icon: '\u25B8',
            color: colors.dim,
          };
          const isActive = running > 0;
          return (
            <React.Fragment key={name}>
              {i > 0 && <Text color={colors.dim}></Text>}
              <Text color={isActive ? color : colors.dim}>{icon}</Text>
              <Text color={isActive ? colors.muted : colors.dim}>{count}</Text>
              {running > 0 && <Text color={colors.accent}>({running})</Text>}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  // Check if any tools are currently running (to dim completed ones)
  const hasRunning = normalizedTools.some((t) => t.status === 'running');

  // Count completed vs running tools
  const completedCountGrouped =
    normalizedTools.filter((t) => t.status === 'success' || t.status === 'error').length;

  // Grouped mode: group consecutive tools of same type
  if (grouped) {
    const toolGroups = groupTools(normalizedTools);
    const visibleGroups = toolGroups.slice(-maxVisible);

    return (
      <Box flexDirection='column'>
        {/* Progress indicator - simple and clean */}
        {normalizedTools.length > 0 && (
          <Box marginBottom={1} marginLeft={2}>
            <Text color={colors.dim}>
              {completedCountGrouped}/{normalizedTools.length} operations
            </Text>
            {hasRunning && <Text color={colors.accent}> ●</Text>}
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
  const completedCount =
    normalizedTools.filter((t) => t.status === 'success' || t.status === 'error').length;

  return (
    <Box flexDirection='column'>
      {/* Progress indicator - simple and clean */}
      {normalizedTools.length > 0 && (
        <Box marginBottom={1} marginLeft={2}>
          <Text color={colors.dim}>
            {completedCount}/{normalizedTools.length} operations
          </Text>
          {hasRunning && <Text color={colors.accent}> ●</Text>}
        </Box>
      )}

      {/* Legacy Timeline (disabled by default) */}
      {showTimeline && <Timeline tools={normalizedTools} width={effectiveWidth} />}

      {/* Tool rows */}
      {visibleTools.map((tool) => {
        // Use TaskRowWithNested for Task tools that have nested operations
        if (
          tool.name === 'Task' &&
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
              terminalWidth={effectiveWidth}
              useNaturalLanguage={useNaturalLanguage}
              showTokens={showTokens}
              showTokenDetails={showTokenDetails}
              showCacheDots={showCacheDots}
              showModels={showModels}
            />
          </React.Fragment>
        );
      })}

      {/* Stats summary at bottom */}
      {showStats && <StatsSummary stats={stats} width={effectiveWidth} />}
    </Box>
  );
}
