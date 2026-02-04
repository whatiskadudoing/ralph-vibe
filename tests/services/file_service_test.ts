/**
 * @module tests/services/file_service_test
 *
 * Tests for services/file_service module.
 * Covers path functions and file I/O operations.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';
import {
  copyFile,
  createDirectory,
  deleteDirectory,
  deleteFile,
  exists,
  getAgentsMdPath,
  getAudienceJtbdPath,
  getAudiencePromptPath,
  getBuildPromptPath,
  getConfigPath,
  getCwd,
  getPlanPath,
  getPlanPromptPath,
  getRalphDir,
  getResearchDir,
  getResearchPromptPath,
  getSpecPromptPath,
  getSpecsDir,
  getStartPromptPath,
  isDirectory,
  isFile,
  joinPath,
  listDirectory,
  listDirectoryPaths,
  readTextFile,
  writeTextFile,
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

// ============================================================================
// Additional Path Function Tests
// ============================================================================

Deno.test('getStartPromptPath returns PROMPT_start.md at root', () => {
  const result = getStartPromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_start.md');
});

Deno.test('getSpecPromptPath returns PROMPT_spec.md at root', () => {
  const result = getSpecPromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_spec.md');
});

Deno.test('getAudiencePromptPath returns PROMPT_audience.md at root', () => {
  const result = getAudiencePromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_audience.md');
});

Deno.test('getAudienceJtbdPath returns AUDIENCE_JTBD.md at root', () => {
  const result = getAudienceJtbdPath('/test/project');
  assertEquals(result, '/test/project/AUDIENCE_JTBD.md');
});

Deno.test('getResearchPromptPath returns PROMPT_research.md at root', () => {
  const result = getResearchPromptPath('/test/project');
  assertEquals(result, '/test/project/PROMPT_research.md');
});

Deno.test('getResearchDir returns research/ at root', () => {
  const result = getResearchDir('/test/project');
  assertEquals(result, '/test/project/research');
});

Deno.test('path functions use cwd when no projectDir provided', () => {
  const cwd = Deno.cwd();
  assertEquals(getRalphDir(), cwd);
  assertEquals(getConfigPath(), join(cwd, '.ralph.json'));
  assertEquals(getSpecsDir(), join(cwd, 'specs'));
});

// ============================================================================
// Utility Function Tests
// ============================================================================

Deno.test('getCwd returns current working directory', () => {
  assertEquals(getCwd(), Deno.cwd());
});

Deno.test('joinPath joins path segments correctly', () => {
  assertEquals(joinPath('a', 'b', 'c'), 'a/b/c');
  assertEquals(joinPath('/root', 'sub', 'file.txt'), '/root/sub/file.txt');
  assertEquals(joinPath('/root/', '/sub/', 'file.txt'), '/root/sub/file.txt');
});

// ============================================================================
// File I/O Tests - Test Utilities
// ============================================================================

async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: 'ralph-file-service-test-' });
}

async function cleanupTempDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// exists Tests
// ============================================================================

Deno.test('exists returns true for existing file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'test.txt');
    await Deno.writeTextFile(filePath, 'content');

    assertEquals(await exists(filePath), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('exists returns true for existing directory', async () => {
  const tempDir = await createTempDir();
  try {
    assertEquals(await exists(tempDir), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('exists returns false for non-existent path', async () => {
  const result = await exists('/non/existent/path/abc123');
  assertEquals(result, false);
});

// ============================================================================
// isDirectory Tests
// ============================================================================

Deno.test('isDirectory returns true for directory', async () => {
  const tempDir = await createTempDir();
  try {
    assertEquals(await isDirectory(tempDir), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isDirectory returns false for file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'test.txt');
    await Deno.writeTextFile(filePath, 'content');

    assertEquals(await isDirectory(filePath), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isDirectory returns false for non-existent path', async () => {
  assertEquals(await isDirectory('/non/existent/path'), false);
});

// ============================================================================
// isFile Tests
// ============================================================================

Deno.test('isFile returns true for file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'test.txt');
    await Deno.writeTextFile(filePath, 'content');

    assertEquals(await isFile(filePath), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isFile returns false for directory', async () => {
  const tempDir = await createTempDir();
  try {
    assertEquals(await isFile(tempDir), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isFile returns false for non-existent path', async () => {
  assertEquals(await isFile('/non/existent/path'), false);
});

// ============================================================================
// readTextFile Tests
// ============================================================================

Deno.test('readTextFile reads file content successfully', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'test.txt');
    const content = 'Hello, World!';
    await Deno.writeTextFile(filePath, content);

    const result = await readTextFile(filePath);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, content);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('readTextFile reads multi-line content', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'multi.txt');
    const content = 'Line 1\nLine 2\nLine 3';
    await Deno.writeTextFile(filePath, content);

    const result = await readTextFile(filePath);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, content);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('readTextFile reads UTF-8 content', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'utf8.txt');
    const content = 'Hello, World! Emoji test: \u2764\uFE0F \uD83D\uDE80';
    await Deno.writeTextFile(filePath, content);

    const result = await readTextFile(filePath);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, content);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('readTextFile returns error for non-existent file', async () => {
  const result = await readTextFile('/non/existent/file.txt');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'read');
    assertEquals(result.error.path, '/non/existent/file.txt');
  }
});

Deno.test('readTextFile returns error for directory', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await readTextFile(tempDir);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, 'file_error');
      assertEquals(result.error.operation, 'read');
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// writeTextFile Tests
// ============================================================================

Deno.test('writeTextFile creates new file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'new.txt');
    const content = 'New file content';

    const result = await writeTextFile(filePath, content);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(filePath), content);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('writeTextFile overwrites existing file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'existing.txt');
    await Deno.writeTextFile(filePath, 'Original content');

    const newContent = 'New content';
    const result = await writeTextFile(filePath, newContent);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(filePath), newContent);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('writeTextFile creates parent directories', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'nested', 'deep', 'file.txt');
    const content = 'Nested content';

    const result = await writeTextFile(filePath, content);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(filePath), content);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('writeTextFile handles empty content', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'empty.txt');

    const result = await writeTextFile(filePath, '');

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(filePath), '');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('writeTextFile handles UTF-8 content', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'utf8.txt');
    const content = '\u4F60\u597D\u4E16\u754C \uD83C\uDF1F';

    const result = await writeTextFile(filePath, content);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(filePath), content);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// createDirectory Tests
// ============================================================================

Deno.test('createDirectory creates new directory', async () => {
  const tempDir = await createTempDir();
  try {
    const newDir = join(tempDir, 'newdir');

    const result = await createDirectory(newDir);

    assertEquals(result.ok, true);
    assertEquals(await isDirectory(newDir), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('createDirectory creates nested directories', async () => {
  const tempDir = await createTempDir();
  try {
    const nestedDir = join(tempDir, 'a', 'b', 'c', 'd');

    const result = await createDirectory(nestedDir);

    assertEquals(result.ok, true);
    assertEquals(await isDirectory(nestedDir), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('createDirectory succeeds if directory already exists', async () => {
  const tempDir = await createTempDir();
  try {
    // ensureDir doesn't fail if directory exists
    const result = await createDirectory(tempDir);
    assertEquals(result.ok, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// deleteFile Tests
// ============================================================================

Deno.test('deleteFile removes existing file', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'to-delete.txt');
    await Deno.writeTextFile(filePath, 'delete me');

    const result = await deleteFile(filePath);

    assertEquals(result.ok, true);
    assertEquals(await exists(filePath), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('deleteFile returns error for non-existent file', async () => {
  const result = await deleteFile('/non/existent/file.txt');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'delete');
  }
});

// ============================================================================
// deleteDirectory Tests
// ============================================================================

Deno.test('deleteDirectory removes empty directory', async () => {
  const tempDir = await createTempDir();
  const subDir = join(tempDir, 'subdir');
  await Deno.mkdir(subDir);

  try {
    const result = await deleteDirectory(subDir);

    assertEquals(result.ok, true);
    assertEquals(await exists(subDir), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('deleteDirectory removes directory with contents', async () => {
  const tempDir = await createTempDir();
  const subDir = join(tempDir, 'subdir-with-files');
  await Deno.mkdir(subDir);
  await Deno.writeTextFile(join(subDir, 'file1.txt'), 'content1');
  await Deno.writeTextFile(join(subDir, 'file2.txt'), 'content2');
  await Deno.mkdir(join(subDir, 'nested'));
  await Deno.writeTextFile(join(subDir, 'nested', 'deep.txt'), 'deep');

  try {
    const result = await deleteDirectory(subDir);

    assertEquals(result.ok, true);
    assertEquals(await exists(subDir), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('deleteDirectory returns error for non-existent directory', async () => {
  const result = await deleteDirectory('/non/existent/directory');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'delete');
  }
});

// ============================================================================
// listDirectory Tests
// ============================================================================

Deno.test('listDirectory lists files and directories', async () => {
  const tempDir = await createTempDir();
  try {
    await Deno.writeTextFile(join(tempDir, 'file1.txt'), 'content1');
    await Deno.writeTextFile(join(tempDir, 'file2.txt'), 'content2');
    await Deno.mkdir(join(tempDir, 'subdir'));

    const result = await listDirectory(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.length, 3);
      assertEquals(result.value.includes('file1.txt'), true);
      assertEquals(result.value.includes('file2.txt'), true);
      assertEquals(result.value.includes('subdir'), true);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('listDirectory returns empty array for empty directory', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await listDirectory(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.length, 0);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('listDirectory returns error for non-existent directory', async () => {
  const result = await listDirectory('/non/existent/directory');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'list');
  }
});

Deno.test('listDirectory returns error for file path', async () => {
  const tempDir = await createTempDir();
  try {
    const filePath = join(tempDir, 'file.txt');
    await Deno.writeTextFile(filePath, 'content');

    const result = await listDirectory(filePath);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, 'file_error');
      assertEquals(result.error.operation, 'list');
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// listDirectoryPaths Tests
// ============================================================================

Deno.test('listDirectoryPaths returns full paths', async () => {
  const tempDir = await createTempDir();
  try {
    await Deno.writeTextFile(join(tempDir, 'file1.txt'), 'content1');
    await Deno.mkdir(join(tempDir, 'subdir'));

    const result = await listDirectoryPaths(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.length, 2);
      assertEquals(result.value.includes(join(tempDir, 'file1.txt')), true);
      assertEquals(result.value.includes(join(tempDir, 'subdir')), true);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('listDirectoryPaths returns empty array for empty directory', async () => {
  const tempDir = await createTempDir();
  try {
    const result = await listDirectoryPaths(tempDir);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.length, 0);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('listDirectoryPaths returns error for non-existent directory', async () => {
  const result = await listDirectoryPaths('/non/existent/directory');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'list');
  }
});

// ============================================================================
// copyFile Tests
// ============================================================================

Deno.test('copyFile copies file to new location', async () => {
  const tempDir = await createTempDir();
  try {
    const source = join(tempDir, 'source.txt');
    const dest = join(tempDir, 'dest.txt');
    const content = 'Copy this content';
    await Deno.writeTextFile(source, content);

    const result = await copyFile(source, dest);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(dest), content);
    // Source should still exist
    assertEquals(await exists(source), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('copyFile creates parent directories for destination', async () => {
  const tempDir = await createTempDir();
  try {
    const source = join(tempDir, 'source.txt');
    const dest = join(tempDir, 'nested', 'deep', 'dest.txt');
    const content = 'Nested copy';
    await Deno.writeTextFile(source, content);

    const result = await copyFile(source, dest);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(dest), content);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('copyFile overwrites existing destination', async () => {
  const tempDir = await createTempDir();
  try {
    const source = join(tempDir, 'source.txt');
    const dest = join(tempDir, 'dest.txt');
    await Deno.writeTextFile(source, 'New content');
    await Deno.writeTextFile(dest, 'Old content');

    const result = await copyFile(source, dest);

    assertEquals(result.ok, true);
    assertEquals(await Deno.readTextFile(dest), 'New content');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('copyFile returns error for non-existent source', async () => {
  const tempDir = await createTempDir();
  try {
    const source = join(tempDir, 'nonexistent.txt');
    const dest = join(tempDir, 'dest.txt');

    const result = await copyFile(source, dest);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, 'file_error');
      assertEquals(result.error.operation, 'write');
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// ============================================================================
// FileError Structure Tests
// ============================================================================

Deno.test('FileError contains correct error information', async () => {
  const result = await readTextFile('/nonexistent/path/file.txt');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.type, 'file_error');
    assertEquals(result.error.operation, 'read');
    assertEquals(result.error.path, '/nonexistent/path/file.txt');
    assertEquals(typeof result.error.message, 'string');
    assertStringIncludes(result.error.message.toLowerCase(), 'no such file');
  }
});
