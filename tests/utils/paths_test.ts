/**
 * @module tests/utils/paths_test
 *
 * Tests for utils/paths module.
 * Covers path resolution utilities.
 */

import { assertEquals } from '@std/assert';
import { createPathResolver, getCwd, resolveProjectPath } from '../../src/utils/paths.ts';

// ============================================================================
// getCwd Tests
// ============================================================================

Deno.test('getCwd returns current working directory', () => {
  const result = getCwd();
  assertEquals(result, Deno.cwd());
});

Deno.test('getCwd returns a non-empty string', () => {
  const result = getCwd();
  assertEquals(result.length > 0, true);
});

// ============================================================================
// resolveProjectPath Tests - Basic Usage
// ============================================================================

Deno.test('resolveProjectPath joins projectDir and relativePath', () => {
  const result = resolveProjectPath('/test/project', 'specs');
  assertEquals(result, '/test/project/specs');
});

Deno.test('resolveProjectPath handles file names', () => {
  const result = resolveProjectPath('/test/project', '.ralph.json');
  assertEquals(result, '/test/project/.ralph.json');
});

Deno.test('resolveProjectPath handles nested paths', () => {
  const result = resolveProjectPath('/test/project', 'src/utils/paths.ts');
  assertEquals(result, '/test/project/src/utils/paths.ts');
});

Deno.test('resolveProjectPath returns base path for empty relativePath', () => {
  const result = resolveProjectPath('/test/project', '');
  assertEquals(result, '/test/project');
});

// ============================================================================
// resolveProjectPath Tests - Undefined projectDir
// ============================================================================

Deno.test('resolveProjectPath uses cwd when projectDir is undefined', () => {
  const cwd = Deno.cwd();
  const result = resolveProjectPath(undefined, 'specs');
  assertEquals(result, `${cwd}/specs`);
});

Deno.test('resolveProjectPath returns cwd for undefined projectDir and empty relativePath', () => {
  const cwd = Deno.cwd();
  const result = resolveProjectPath(undefined, '');
  assertEquals(result, cwd);
});

// ============================================================================
// resolveProjectPath Tests - Edge Cases
// ============================================================================

Deno.test('resolveProjectPath handles trailing slash in projectDir', () => {
  const result = resolveProjectPath('/test/project/', 'specs');
  // join() normalizes paths
  assertEquals(result, '/test/project/specs');
});

Deno.test('resolveProjectPath handles leading slash in relativePath', () => {
  const result = resolveProjectPath('/test/project', '/specs');
  // join() normalizes this as well
  assertEquals(result, '/test/project/specs');
});

Deno.test('resolveProjectPath handles relative-style projectDir', () => {
  const result = resolveProjectPath('./my-project', 'specs');
  assertEquals(result, 'my-project/specs');
});

Deno.test('resolveProjectPath handles dots in relativePath', () => {
  const result = resolveProjectPath('/test/project', '../sibling/file.txt');
  assertEquals(result, '/test/sibling/file.txt');
});

Deno.test('resolveProjectPath handles hidden files', () => {
  const result = resolveProjectPath('/test/project', '.gitignore');
  assertEquals(result, '/test/project/.gitignore');
});

Deno.test('resolveProjectPath handles hidden directories', () => {
  const result = resolveProjectPath('/test/project', '.ralph/config.json');
  assertEquals(result, '/test/project/.ralph/config.json');
});

Deno.test('resolveProjectPath handles Windows-style separators gracefully', () => {
  // On non-Windows, backslashes are treated as part of the filename
  // This test documents the behavior
  const result = resolveProjectPath('/test/project', 'sub\\file.txt');
  // The exact result depends on the platform, but it should not throw
  assertEquals(typeof result, 'string');
});

// ============================================================================
// createPathResolver Tests - Basic Usage
// ============================================================================

Deno.test('createPathResolver returns a function', () => {
  const resolver = createPathResolver('/test/project');
  assertEquals(typeof resolver, 'function');
});

Deno.test('createPathResolver creates resolver that joins paths', () => {
  const resolve = createPathResolver('/test/project');
  assertEquals(resolve('specs'), '/test/project/specs');
});

Deno.test('createPathResolver handles file names', () => {
  const resolve = createPathResolver('/test/project');
  assertEquals(resolve('.ralph.json'), '/test/project/.ralph.json');
});

Deno.test('createPathResolver handles nested paths', () => {
  const resolve = createPathResolver('/test/project');
  assertEquals(resolve('src/utils/paths.ts'), '/test/project/src/utils/paths.ts');
});

Deno.test('createPathResolver returns base path for empty string', () => {
  const resolve = createPathResolver('/test/project');
  assertEquals(resolve(''), '/test/project');
});

// ============================================================================
// createPathResolver Tests - Multiple Resolutions
// ============================================================================

Deno.test('createPathResolver can resolve multiple paths', () => {
  const resolve = createPathResolver('/test/project');

  assertEquals(resolve('specs'), '/test/project/specs');
  assertEquals(resolve('.ralph.json'), '/test/project/.ralph.json');
  assertEquals(resolve('IMPLEMENTATION_PLAN.md'), '/test/project/IMPLEMENTATION_PLAN.md');
  assertEquals(resolve('PROMPT_build.md'), '/test/project/PROMPT_build.md');
});

Deno.test('createPathResolver maintains base path immutability', () => {
  const resolve = createPathResolver('/test/project');

  // Calling with different paths should not affect the base
  resolve('first');
  resolve('second');
  resolve('../third');

  // Base path should still work correctly
  assertEquals(resolve('target'), '/test/project/target');
});

// ============================================================================
// createPathResolver Tests - Edge Cases
// ============================================================================

Deno.test('createPathResolver handles trailing slash in base path', () => {
  const resolve = createPathResolver('/test/project/');
  assertEquals(resolve('specs'), '/test/project/specs');
});

Deno.test('createPathResolver handles relative base path', () => {
  const resolve = createPathResolver('./my-project');
  assertEquals(resolve('specs'), 'my-project/specs');
});

Deno.test('createPathResolver handles empty base path', () => {
  const resolve = createPathResolver('');
  assertEquals(resolve('specs'), 'specs');
});

// ============================================================================
// Integration Tests - Matching file_service.ts Patterns
// ============================================================================

Deno.test('resolveProjectPath matches getSpecsDir pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'specs'),
    '/test/project/specs',
  );
});

Deno.test('resolveProjectPath matches getConfigPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', '.ralph.json'),
    '/test/project/.ralph.json',
  );
});

Deno.test('resolveProjectPath matches getPlanPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'IMPLEMENTATION_PLAN.md'),
    '/test/project/IMPLEMENTATION_PLAN.md',
  );
});

Deno.test('resolveProjectPath matches getBuildPromptPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'PROMPT_build.md'),
    '/test/project/PROMPT_build.md',
  );
});

Deno.test('resolveProjectPath matches getPlanPromptPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'PROMPT_plan.md'),
    '/test/project/PROMPT_plan.md',
  );
});

Deno.test('resolveProjectPath matches getStartPromptPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'PROMPT_start.md'),
    '/test/project/PROMPT_start.md',
  );
});

Deno.test('resolveProjectPath matches getAgentsMdPath pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'AGENTS.md'),
    '/test/project/AGENTS.md',
  );
});

Deno.test('resolveProjectPath matches getResearchDir pattern', () => {
  assertEquals(
    resolveProjectPath('/test/project', 'research'),
    '/test/project/research',
  );
});

// ============================================================================
// createPathResolver Integration Tests
// ============================================================================

Deno.test('createPathResolver can replace all file_service path patterns', () => {
  const resolve = createPathResolver('/test/project');

  // All the paths that file_service.ts defines
  assertEquals(resolve(''), '/test/project'); // getRalphDir
  assertEquals(resolve('specs'), '/test/project/specs'); // getSpecsDir
  assertEquals(resolve('.ralph.json'), '/test/project/.ralph.json'); // getConfigPath
  assertEquals(resolve('IMPLEMENTATION_PLAN.md'), '/test/project/IMPLEMENTATION_PLAN.md'); // getPlanPath
  assertEquals(resolve('PROMPT_build.md'), '/test/project/PROMPT_build.md'); // getBuildPromptPath
  assertEquals(resolve('PROMPT_plan.md'), '/test/project/PROMPT_plan.md'); // getPlanPromptPath
  assertEquals(resolve('PROMPT_start.md'), '/test/project/PROMPT_start.md'); // getStartPromptPath
  assertEquals(resolve('PROMPT_spec.md'), '/test/project/PROMPT_spec.md'); // getSpecPromptPath
  assertEquals(resolve('PROMPT_audience.md'), '/test/project/PROMPT_audience.md'); // getAudiencePromptPath
  assertEquals(resolve('AGENTS.md'), '/test/project/AGENTS.md'); // getAgentsMdPath
  assertEquals(resolve('AUDIENCE_JTBD.md'), '/test/project/AUDIENCE_JTBD.md'); // getAudienceJtbdPath
  assertEquals(resolve('PROMPT_research.md'), '/test/project/PROMPT_research.md'); // getResearchPromptPath
  assertEquals(resolve('research'), '/test/project/research'); // getResearchDir
});
