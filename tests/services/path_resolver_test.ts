/**
 * @module tests/services/path_resolver_test
 *
 * Tests for services/path_resolver module.
 * Verifies that paths are correctly resolved from .ralph.json config
 * and that project root can be found from subdirectories.
 */

import { assertEquals, assertRejects } from '@std/assert';
import { join } from '@std/path';
import {
  findProjectRoot,
  getPathsConfig,
  requireProjectRoot,
  resolveDefaultPaths,
  resolvePaths,
  resolvePathsFromConfig,
  tryResolvePaths,
} from '../../src/services/path_resolver.ts';
import { createConfig, DEFAULT_PATHS } from '../../src/core/config.ts';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a temporary directory structure with optional .ralph.json
 */
async function createTestProject(options: {
  withConfig?: boolean;
  configContent?: string;
  subdirs?: string[];
}): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const tempDir = await Deno.makeTempDir({ prefix: 'ralph-test-' });

  if (options.withConfig) {
    const configContent = options.configContent ?? JSON.stringify(createConfig(), null, 2);
    await Deno.writeTextFile(join(tempDir, '.ralph.json'), configContent);
  }

  if (options.subdirs) {
    for (const subdir of options.subdirs) {
      await Deno.mkdir(join(tempDir, subdir), { recursive: true });
    }
  }

  return {
    root: tempDir,
    cleanup: async () => {
      await Deno.remove(tempDir, { recursive: true });
    },
  };
}

// ============================================================================
// findProjectRoot Tests
// ============================================================================

Deno.test('findProjectRoot finds .ralph.json in current directory', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: true });

  try {
    const foundRoot = await findProjectRoot(root);
    assertEquals(foundRoot, root);
  } finally {
    await cleanup();
  }
});

Deno.test('findProjectRoot finds .ralph.json from subdirectory', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: true,
    subdirs: ['src/components/ui'],
  });

  try {
    const subdir = join(root, 'src/components/ui');
    const foundRoot = await findProjectRoot(subdir);
    assertEquals(foundRoot, root);
  } finally {
    await cleanup();
  }
});

Deno.test('findProjectRoot finds .ralph.json from deeply nested subdirectory', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: true,
    subdirs: ['a/b/c/d/e/f/g'],
  });

  try {
    const deepSubdir = join(root, 'a/b/c/d/e/f/g');
    const foundRoot = await findProjectRoot(deepSubdir);
    assertEquals(foundRoot, root);
  } finally {
    await cleanup();
  }
});

Deno.test('findProjectRoot returns null when no .ralph.json exists', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: false,
    subdirs: ['src'],
  });

  try {
    const foundRoot = await findProjectRoot(root);
    assertEquals(foundRoot, null);
  } finally {
    await cleanup();
  }
});

Deno.test('findProjectRoot stops at nearest .ralph.json (nested projects)', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: true,
    subdirs: ['packages/sub-project'],
  });

  // Create a nested project with its own .ralph.json
  const subProjectDir = join(root, 'packages/sub-project');
  await Deno.writeTextFile(
    join(subProjectDir, '.ralph.json'),
    JSON.stringify(createConfig(), null, 2),
  );

  try {
    // From nested project, should find the nested .ralph.json, not parent
    const foundRoot = await findProjectRoot(subProjectDir);
    assertEquals(foundRoot, subProjectDir);

    // From parent, should find parent .ralph.json
    const parentRoot = await findProjectRoot(root);
    assertEquals(parentRoot, root);
  } finally {
    await cleanup();
  }
});

// ============================================================================
// requireProjectRoot Tests
// ============================================================================

Deno.test('requireProjectRoot returns root when project exists', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: true });

  try {
    const foundRoot = await requireProjectRoot(root);
    assertEquals(foundRoot, root);
  } finally {
    await cleanup();
  }
});

Deno.test('requireProjectRoot throws when no project found', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: false });

  try {
    await assertRejects(
      async () => await requireProjectRoot(root),
      Error,
      'Not in a Ralph project',
    );
  } finally {
    await cleanup();
  }
});

// ============================================================================
// resolvePaths Tests
// ============================================================================

Deno.test('resolvePaths returns correct default paths', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: true });

  try {
    const paths = await resolvePaths(root);

    assertEquals(paths.root, root);
    assertEquals(paths.specs, join(root, 'specs'));
    assertEquals(paths.plan, join(root, 'IMPLEMENTATION_PLAN.md'));
    assertEquals(paths.agents, join(root, 'AGENTS.md'));
    assertEquals(paths.audienceJtbd, join(root, 'AUDIENCE_JTBD.md'));
    assertEquals(paths.buildPrompt, join(root, 'PROMPT_build.md'));
    assertEquals(paths.planPrompt, join(root, 'PROMPT_plan.md'));
    assertEquals(paths.startPrompt, join(root, 'PROMPT_start.md'));
    assertEquals(paths.specPrompt, join(root, 'PROMPT_spec.md'));
    assertEquals(paths.audiencePrompt, join(root, 'PROMPT_audience.md'));
    assertEquals(paths.config, join(root, '.ralph.json'));
  } finally {
    await cleanup();
  }
});

Deno.test('resolvePaths uses custom paths from config', async () => {
  const customConfig = createConfig({
    paths: {
      specs: 'custom-specs',
      plan: 'docs/PLAN.md',
      agents: 'docs/AGENTS.md',
      buildPrompt: 'prompts/build.md',
      planPrompt: 'prompts/plan.md',
      startPrompt: 'prompts/start.md',
      specPrompt: 'prompts/spec.md',
      audiencePrompt: 'prompts/audience.md',
      audienceJtbd: 'docs/audience.md',
    },
  });

  const { root, cleanup } = await createTestProject({
    withConfig: true,
    configContent: JSON.stringify(customConfig, null, 2),
  });

  try {
    const paths = await resolvePaths(root);

    assertEquals(paths.specs, join(root, 'custom-specs'));
    assertEquals(paths.plan, join(root, 'docs/PLAN.md'));
    assertEquals(paths.agents, join(root, 'docs/AGENTS.md'));
    assertEquals(paths.buildPrompt, join(root, 'prompts/build.md'));
    assertEquals(paths.planPrompt, join(root, 'prompts/plan.md'));
    assertEquals(paths.startPrompt, join(root, 'prompts/start.md'));
    assertEquals(paths.specPrompt, join(root, 'prompts/spec.md'));
    assertEquals(paths.audiencePrompt, join(root, 'prompts/audience.md'));
    assertEquals(paths.audienceJtbd, join(root, 'docs/audience.md'));
  } finally {
    await cleanup();
  }
});

Deno.test('resolvePaths works from subdirectory', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: true,
    subdirs: ['src/components'],
  });

  try {
    const subdir = join(root, 'src/components');
    const paths = await resolvePaths(subdir);

    // All paths should be relative to root, not subdir
    assertEquals(paths.root, root);
    assertEquals(paths.specs, join(root, 'specs'));
    assertEquals(paths.buildPrompt, join(root, 'PROMPT_build.md'));
  } finally {
    await cleanup();
  }
});

Deno.test('resolvePaths throws when not in project', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: false });

  try {
    await assertRejects(
      async () => await resolvePaths(root),
      Error,
      'Not in a Ralph project',
    );
  } finally {
    await cleanup();
  }
});

// ============================================================================
// tryResolvePaths Tests
// ============================================================================

Deno.test('tryResolvePaths returns paths when project exists', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: true });

  try {
    const paths = await tryResolvePaths(root);
    assertEquals(paths !== null, true);
    assertEquals(paths?.root, root);
  } finally {
    await cleanup();
  }
});

Deno.test('tryResolvePaths returns null when no project', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: false });

  try {
    const paths = await tryResolvePaths(root);
    assertEquals(paths, null);
  } finally {
    await cleanup();
  }
});

// ============================================================================
// resolvePathsFromConfig Tests
// ============================================================================

Deno.test('resolvePathsFromConfig resolves paths from provided config', () => {
  const config = createConfig({
    paths: { specs: 'features', plan: 'docs/plan.md' },
  });

  const paths = resolvePathsFromConfig(config, '/project');

  assertEquals(paths.root, '/project');
  assertEquals(paths.specs, '/project/features');
  assertEquals(paths.plan, '/project/docs/plan.md');
});

// ============================================================================
// resolveDefaultPaths Tests
// ============================================================================

Deno.test('resolveDefaultPaths uses default paths', () => {
  const paths = resolveDefaultPaths('/project');

  assertEquals(paths.root, '/project');
  assertEquals(paths.specs, join('/project', DEFAULT_PATHS.specs));
  assertEquals(paths.plan, join('/project', DEFAULT_PATHS.plan));
  assertEquals(paths.buildPrompt, join('/project', DEFAULT_PATHS.buildPrompt));
});

// ============================================================================
// getPathsConfig Tests
// ============================================================================

Deno.test('getPathsConfig returns config paths when config exists', async () => {
  const customConfig = createConfig({
    paths: { specs: 'my-specs' },
  });

  const { root, cleanup } = await createTestProject({
    withConfig: true,
    configContent: JSON.stringify(customConfig, null, 2),
  });

  try {
    const pathsConfig = await getPathsConfig(root);
    assertEquals(pathsConfig.specs, 'my-specs');
  } finally {
    await cleanup();
  }
});

Deno.test('getPathsConfig returns default paths when config missing', async () => {
  const { root, cleanup } = await createTestProject({ withConfig: false });

  try {
    const pathsConfig = await getPathsConfig(root);
    assertEquals(pathsConfig, DEFAULT_PATHS);
  } finally {
    await cleanup();
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('paths handle special characters in directory names', async () => {
  const { root, cleanup } = await createTestProject({
    withConfig: true,
    subdirs: ['src with spaces/components'],
  });

  try {
    const subdir = join(root, 'src with spaces/components');
    const paths = await resolvePaths(subdir);
    assertEquals(paths.root, root);
  } finally {
    await cleanup();
  }
});

Deno.test('invalid config falls back to default paths', async () => {
  // Config with missing required paths - should fail validation
  // and fall back entirely to defaults
  const invalidConfig = {
    version: '0.1.0',
    paths: {
      specs: 'custom-specs',
      // Other required paths missing - validation will fail
    },
    work: {
      model: 'opus',
      maxIterations: 50,
      autoPush: false,
    },
  };

  const { root, cleanup } = await createTestProject({
    withConfig: true,
    configContent: JSON.stringify(invalidConfig, null, 2),
  });

  try {
    // getPathsConfig should return defaults when config is invalid
    const pathsConfig = await getPathsConfig(root);
    assertEquals(pathsConfig, DEFAULT_PATHS);
  } finally {
    await cleanup();
  }
});
