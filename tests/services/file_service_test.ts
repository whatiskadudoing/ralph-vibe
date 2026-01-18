/**
 * @module tests/services/file_service_test
 *
 * Tests for services/file_service module.
 * Focuses on path functions that determine where Ralph files are created.
 */

import { assertEquals } from '@std/assert';
import {
  getAgentsMdPath,
  getBuildPromptPath,
  getConfigPath,
  getPlanPath,
  getPlanPromptPath,
  getRalphDir,
  getSpecsDir,
} from '../../src/services/file_service.ts';

// ============================================================================
// Path Function Tests
// ============================================================================

Deno.test('getRalphDir returns project root (not subdirectory)', () => {
  const result = getRalphDir('/test/project');
  assertEquals(result, '/test/project');
});

Deno.test('getConfigPath returns hidden .ralph.json at root', () => {
  const result = getConfigPath('/test/project');
  assertEquals(result, '/test/project/.ralph.json');
});

Deno.test('getSpecsDir returns specs/ at root', () => {
  const result = getSpecsDir('/test/project');
  assertEquals(result, '/test/project/specs');
});

Deno.test('getPlanPath returns IMPLEMENTATION_PLAN.md at root', () => {
  const result = getPlanPath('/test/project');
  assertEquals(result, '/test/project/IMPLEMENTATION_PLAN.md');
});

Deno.test('getBuildPromptPath returns PROMPT_build.md at root', () => {
  const result = getBuildPromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_build.md');
});

Deno.test('getPlanPromptPath returns PROMPT_plan.md at root', () => {
  const result = getPlanPromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_plan.md');
});

Deno.test('getAgentsMdPath returns AGENTS.md at root', () => {
  const result = getAgentsMdPath('/test/project');
  assertEquals(result, '/test/project/AGENTS.md');
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('path functions handle paths with trailing slash', () => {
  // Note: join() normalizes paths, so trailing slash behavior depends on implementation
  const config = getConfigPath('/test/project/');
  assertEquals(config.includes('.ralph.json'), true);
});

Deno.test('path functions handle relative-style paths', () => {
  const config = getConfigPath('./my-project');
  assertEquals(config, 'my-project/.ralph.json');
});
