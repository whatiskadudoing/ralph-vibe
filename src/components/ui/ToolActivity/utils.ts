/**
 * @module components/ui/ToolActivity/utils
 *
 * Utility functions for ToolActivity components.
 */

import type { EnhancedToolCall, ToolCall, ToolGroup, ToolStats } from './types.ts';
import { MODEL_COLORS, TOOL_ICONS } from './constants.ts';
import { colors } from '../theme.ts';
import { formatDuration as formatDurationMs } from '@/utils/formatting.ts';

// ============================================================================
// Type Conversion Utilities
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

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format duration between two timestamps using the shared formatter.
 */
export function formatDuration(startTime?: number, endTime?: number): string {
  if (!startTime) return '';
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  return formatDurationMs(ms);
}

// Re-export formatDurationMs for backward compatibility with other modules
export { formatDuration as formatDurationMs } from '@/utils/formatting.ts';

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Truncate string to fit in column width
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Pad string to exact width
 */
export function padEnd(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

/**
 * Smart path formatting based on available width
 */
export function formatPathSmart(path: string, maxWidth: number): string {
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

// ============================================================================
// Icon and Badge Utilities
// ============================================================================

/**
 * Get icon for tool name
 */
export function getToolIcon(name: string): string {
  return TOOL_ICONS[name]?.icon ?? '\u25B8';
}

/**
 * Get color for tool name
 */
export function getToolColor(name: string): string {
  return TOOL_ICONS[name]?.color ?? colors.dim;
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

// ============================================================================
// Tool Input Formatting
// ============================================================================

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
        return { primary: shortPath, secondary: `"${oldPreview}..." \u2192 "${newPreview}..."` };
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
 * Extract detail string from tool input
 */
export function extractDetail(tool: EnhancedToolCall): string {
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
 * Extract detail with smart path formatting
 */
export function extractDetailSmart(tool: EnhancedToolCall, maxWidth: number): string {
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
// Result Formatting
// ============================================================================

/**
 * Format result metadata based on tool type
 */
export function formatResult(tool: EnhancedToolCall): string {
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

// ============================================================================
// Grouping and Stats
// ============================================================================

/**
 * Group consecutive tools by type
 */
export function groupTools(tools: EnhancedToolCall[]): ToolGroup[] {
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
export function getToolStats(tools: EnhancedToolCall[]): ToolStats {
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
