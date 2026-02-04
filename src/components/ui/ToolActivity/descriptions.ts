/**
 * @module components/ui/ToolActivity/descriptions
 *
 * Natural language activity descriptions for tools.
 * Inspired by Cursor's approach: "never show tool names, describe what it's doing"
 */

import type { EnhancedToolCall } from './types.ts';

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
