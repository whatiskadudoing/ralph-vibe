/**
 * @module tests/services/project_service_test
 *
 * Tests for services/project_service module.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { exists } from '@std/fs';
import { join } from '@std/path';
import { getProjectInfo, initProject, isRalphProject } from '../../src/services/project_service.ts';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: 'ralph_test_' });
}

async function cleanupTempDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch {
    // Ignore
  }
}

// ============================================================================
// isRalphProject Tests
// ============================================================================

Deno.test('isRalphProject returns false for empty directory', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await isRalphProject(tempDir);
    assertEquals(result, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isRalphProject returns true after initialization', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const result = await isRalphProject(tempDir);
    assertEquals(result, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// initProject Tests - File Creation
// ============================================================================

Deno.test('initProject creates .ralph.json config file', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await initProject(tempDir);
    assertEquals(result.ok, true);
    assertEquals(await exists(join(tempDir, '.ralph.json')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates PROMPT_build.md', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'PROMPT_build.md')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates PROMPT_plan.md', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'PROMPT_plan.md')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates AGENTS.md', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'AGENTS.md')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates IMPLEMENTATION_PLAN.md', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'IMPLEMENTATION_PLAN.md')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates specs directory', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'specs')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject creates specs/.gitkeep', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    assertEquals(await exists(join(tempDir, 'specs', '.gitkeep')), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// initProject Tests - File Contents
// ============================================================================

Deno.test('initProject writes config with version', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const content = await Deno.readTextFile(join(tempDir, '.ralph.json'));
    const parsed = JSON.parse(content);
    assertEquals(typeof parsed.version, 'string');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject writes config with paths', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const content = await Deno.readTextFile(join(tempDir, '.ralph.json'));
    const parsed = JSON.parse(content);
    assertEquals(parsed.paths.specs, 'specs');
    assertEquals(parsed.paths.plan, 'IMPLEMENTATION_PLAN.md');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject writes config with work settings', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const content = await Deno.readTextFile(join(tempDir, '.ralph.json'));
    const parsed = JSON.parse(content);
    assertEquals(parsed.work.model, 'opus');
    assertEquals(typeof parsed.work.maxIterations, 'number');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject writes build prompt with key elements', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const content = await Deno.readTextFile(join(tempDir, 'PROMPT_build.md'));
    assertStringIncludes(content, 'specs/*');
    assertStringIncludes(content, 'IMPLEMENTATION_PLAN.md');
    assertStringIncludes(content, 'EXIT_SIGNAL');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initProject writes plan prompt with gap analysis', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const content = await Deno.readTextFile(join(tempDir, 'PROMPT_plan.md'));
    assertStringIncludes(content, 'GAP ANALYSIS');
    assertStringIncludes(content, 'Plan only');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// initProject Tests - Error Cases
// ============================================================================

Deno.test('initProject fails if already initialized', async () => {
  const tempDir = await createTempDir();
  try {
    const first = await initProject(tempDir);
    assertEquals(first.ok, true);

    const second = await initProject(tempDir);
    assertEquals(second.ok, false);
    if (!second.ok) {
      assertEquals(second.error.code, 'already_exists');
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// getProjectInfo Tests
// ============================================================================

Deno.test('getProjectInfo returns correct info after init', async () => {
  const tempDir = await createTempDir();
  try {
    await initProject(tempDir);
    const result = await getProjectInfo(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.root, tempDir);
      assertEquals(result.value.hasConfig, true);
      assertEquals(result.value.hasPlan, true);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('getProjectInfo returns hasConfig false for uninitialized dir', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await getProjectInfo(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.hasConfig, false);
      assertEquals(result.value.hasPlan, false);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});
