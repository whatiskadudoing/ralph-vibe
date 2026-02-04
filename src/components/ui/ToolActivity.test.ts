/**
 * @module components/ui/ToolActivity.test
 *
 * Tests for ToolActivity helper functions
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  type EnhancedToolCall,
  formatToolInput,
  getInputPreview,
  getModelBadge,
  getModelBadgeColor,
  getToolColor,
  getToolIcon,
} from './ToolActivity.tsx';
import { colors } from './theme.ts';

Deno.test('getToolIcon - returns correct icons', () => {
  assertEquals(getToolIcon('Read'), '○');
  assertEquals(getToolIcon('Write'), '+');
  assertEquals(getToolIcon('Edit'), '~');
  assertEquals(getToolIcon('Bash'), '$');
  assertEquals(getToolIcon('Glob'), '○');
  assertEquals(getToolIcon('Grep'), '○');
  assertEquals(getToolIcon('Task'), '●');
  assertEquals(getToolIcon('WebFetch'), '↗');
  assertEquals(getToolIcon('Unknown'), '▸');
});

Deno.test('getToolColor - returns correct colors', () => {
  assertEquals(getToolColor('Read'), colors.info);
  assertEquals(getToolColor('Write'), colors.success);
  assertEquals(getToolColor('Edit'), colors.accent);
  assertEquals(getToolColor('Bash'), colors.accent);
  assertEquals(getToolColor('Unknown'), colors.dim);
});

Deno.test('getInputPreview - Read tool shows last two path segments', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Read',
    status: 'success',
    input: {
      file_path: '/Users/kadu/project/src/auth/session.ts',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, 'auth/session.ts');
});

Deno.test('getInputPreview - Bash tool shows command', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Bash',
    status: 'running',
    input: {
      command: 'npm test',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, 'npm test');
});

Deno.test('getInputPreview - Bash tool truncates long commands', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Bash',
    status: 'running',
    input: {
      command:
        'This is a very long command that should be truncated because it exceeds the maximum length',
    },
  };

  const preview = getInputPreview(tool, 40);
  assertEquals(preview.length, 40);
  assertEquals(preview.endsWith('...'), true);
});

Deno.test('getInputPreview - Task tool shows description in quotes', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Task',
    status: 'running',
    input: {
      description: 'analyze code structure',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, '"analyze code structure"');
});

Deno.test('getInputPreview - Glob tool shows pattern', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Glob',
    status: 'success',
    input: {
      pattern: '**/*.ts',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, '**/*.ts');
});

Deno.test('getInputPreview - WebFetch tool shows full URL', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebFetch',
    status: 'running',
    input: {
      url: 'https://api.github.com/repos/user/repo',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, 'https://api.github.com/repos/user/repo');
});

Deno.test('getModelBadge - returns correct badges', () => {
  assertEquals(getModelBadge('claude-opus-4'), '[opus]');
  assertEquals(getModelBadge('claude-sonnet-4'), '[sonnet]');
  assertEquals(getModelBadge('claude-haiku-4'), '[haiku]');
  assertEquals(getModelBadge('some-other-model'), '[some-o]');
  assertEquals(getModelBadge(undefined), '');
});

Deno.test('getModelBadgeColor - returns correct colors', () => {
  assertEquals(getModelBadgeColor('opus'), colors.accent);
  assertEquals(getModelBadgeColor('sonnet'), colors.info);
  assertEquals(getModelBadgeColor('haiku'), colors.success);
  assertEquals(getModelBadgeColor('unknown'), colors.dim);
  assertEquals(getModelBadgeColor(undefined), colors.dim);
});

Deno.test('getInputPreview - handles short paths', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Read',
    status: 'success',
    input: {
      file_path: 'file.ts',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, 'file.ts');
});

Deno.test('getInputPreview - handles empty input gracefully', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'Read',
    status: 'success',
    input: {},
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, '');
});

// ============================================================================
// Tests for formatToolInput - new centralized formatting function
// ============================================================================

Deno.test('formatToolInput - WebFetch returns URL and prompt separately', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebFetch',
    status: 'running',
    input: {
      url: 'https://docs.example.com/api/reference',
      prompt: 'What are the authentication methods?',
    },
  };

  const formatted = formatToolInput(tool);
  assertEquals(formatted.primary, 'https://docs.example.com/api/reference');
  assertEquals(formatted.secondary, 'Q: What are the authentication methods?');
});

Deno.test('formatToolInput - WebFetch without prompt has no secondary', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebFetch',
    status: 'running',
    input: {
      url: 'https://example.com',
    },
  };

  const formatted = formatToolInput(tool);
  assertEquals(formatted.primary, 'https://example.com');
  assertEquals(formatted.secondary, undefined);
});

Deno.test('formatToolInput - WebSearch shows full query', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebSearch',
    status: 'running',
    input: {
      query: 'How to implement OAuth2 authentication in Node.js applications',
    },
  };

  const formatted = formatToolInput(tool);
  assertEquals(
    formatted.primary,
    '"How to implement OAuth2 authentication in Node.js applications"',
  );
  assertEquals(formatted.secondary, undefined);
});

Deno.test('getInputPreview - WebFetch with prompt combines both', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebFetch',
    status: 'running',
    input: {
      url: 'https://api.github.com',
      prompt: 'Get repository info',
    },
  };

  const preview = getInputPreview(tool, 100);
  assertEquals(preview, 'https://api.github.com - Q: Get repository info');
});

Deno.test('getInputPreview - WebFetch with long prompt truncates', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebFetch',
    status: 'running',
    input: {
      url: 'https://example.com/very/long/path/to/some/resource',
      prompt:
        'Extract all the detailed information about authentication methods and security policies',
    },
  };

  const preview = getInputPreview(tool, 50);
  assertEquals(preview.length, 50);
  assertEquals(preview.endsWith('...'), true);
});

Deno.test('getInputPreview - WebSearch shows full query without truncation by default', () => {
  const tool: EnhancedToolCall = {
    id: '1',
    name: 'WebSearch',
    status: 'running',
    input: {
      query: 'React hooks tutorial',
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, '"React hooks tutorial"');
});
