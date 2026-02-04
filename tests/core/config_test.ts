/**
 * @module tests/core/config_test
 *
 * Tests for core/config module.
 */

import { assertEquals, assertNotEquals } from '@std/assert';
import {
  CONFIG_VERSION,
  createConfig,
  DEFAULT_PATHS,
  DEFAULT_WORK,
  isValidModel,
  mergeConfig,
  parseConfig,
  RECOMMENDED_MAX_ITERATIONS,
  serializeConfig,
  VALID_MODELS,
  validateConfig,
} from '../../src/core/config.ts';

// ============================================================================
// isValidModel tests
// ============================================================================

Deno.test('isValidModel returns true for opus', () => {
  assertEquals(isValidModel('opus'), true);
});

Deno.test('isValidModel returns true for sonnet', () => {
  assertEquals(isValidModel('sonnet'), true);
});

Deno.test('isValidModel returns true for adaptive', () => {
  assertEquals(isValidModel('adaptive'), true);
});

Deno.test('isValidModel returns false for invalid model', () => {
  assertEquals(isValidModel('invalid'), false);
});

Deno.test('isValidModel returns false for empty string', () => {
  assertEquals(isValidModel(''), false);
});

Deno.test('isValidModel returns false for number', () => {
  assertEquals(isValidModel(123), false);
});

Deno.test('isValidModel returns false for null', () => {
  assertEquals(isValidModel(null), false);
});

Deno.test('isValidModel returns false for undefined', () => {
  assertEquals(isValidModel(undefined), false);
});

Deno.test('isValidModel returns false for object', () => {
  assertEquals(isValidModel({ model: 'opus' }), false);
});

// ============================================================================
// createConfig tests
// ============================================================================

Deno.test('createConfig creates config with defaults', () => {
  const config = createConfig();

  assertEquals(config.version, CONFIG_VERSION);
  assertEquals(config.paths, DEFAULT_PATHS);
  assertEquals(config.work, DEFAULT_WORK);
});

Deno.test('createConfig allows path overrides', () => {
  const config = createConfig({
    paths: { specs: 'custom-specs' },
  });

  assertEquals(config.paths.specs, 'custom-specs');
  assertEquals(config.paths.plan, DEFAULT_PATHS.plan);
});

Deno.test('createConfig allows work overrides', () => {
  const config = createConfig({
    work: { model: 'sonnet', maxIterations: 100 },
  });

  assertEquals(config.work.model, 'sonnet');
  assertEquals(config.work.maxIterations, 100);
  assertEquals(config.work.autoPush, DEFAULT_WORK.autoPush);
});

Deno.test('createConfig allows multiple path overrides', () => {
  const config = createConfig({
    paths: {
      specs: 'my-specs',
      plan: 'my-plan.md',
      agents: 'my-agents.md',
    },
  });

  assertEquals(config.paths.specs, 'my-specs');
  assertEquals(config.paths.plan, 'my-plan.md');
  assertEquals(config.paths.agents, 'my-agents.md');
  assertEquals(config.paths.research, DEFAULT_PATHS.research);
});

Deno.test('createConfig allows all work overrides', () => {
  const config = createConfig({
    work: {
      model: 'adaptive',
      maxIterations: 50,
      maxSlcIterations: 10,
      autoPush: false,
      stopOnFailure: true,
      cooldown: 10,
    },
  });

  assertEquals(config.work.model, 'adaptive');
  assertEquals(config.work.maxIterations, 50);
  assertEquals(config.work.maxSlcIterations, 10);
  assertEquals(config.work.autoPush, false);
  assertEquals(config.work.stopOnFailure, true);
  assertEquals(config.work.cooldown, 10);
});

Deno.test('createConfig with empty overrides uses defaults', () => {
  const config = createConfig({});

  assertEquals(config.version, CONFIG_VERSION);
  assertEquals(config.paths, DEFAULT_PATHS);
  assertEquals(config.work, DEFAULT_WORK);
});

// ============================================================================
// validateConfig tests
// ============================================================================

Deno.test('validateConfig returns empty array for valid config', () => {
  const config = createConfig();
  const errors = validateConfig(config);

  assertEquals(errors.length, 0);
});

Deno.test('validateConfig returns errors for missing version', () => {
  const config = { paths: DEFAULT_PATHS, work: DEFAULT_WORK };
  const errors = validateConfig(config);

  assertEquals(errors.length > 0, true);
  assertEquals(errors.some((e) => e.path === 'version'), true);
});

Deno.test('validateConfig returns errors for invalid model', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, model: 'invalid' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.model'), true);
});

Deno.test('validateConfig returns error for null config', () => {
  const errors = validateConfig(null);

  assertEquals(errors.length, 1);
  assertEquals(errors[0]?.path, '');
  assertEquals(errors[0]?.message, 'Config must be an object');
});

Deno.test('validateConfig returns error for non-object config', () => {
  const errors = validateConfig('string');

  assertEquals(errors.length, 1);
  assertEquals(errors[0]?.message, 'Config must be an object');
});

Deno.test('validateConfig returns error for missing paths', () => {
  const config = { version: '0.1.0', work: DEFAULT_WORK };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'paths'), true);
});

Deno.test('validateConfig returns error for null paths', () => {
  const config = { version: '0.1.0', paths: null, work: DEFAULT_WORK };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'paths'), true);
});

Deno.test('validateConfig returns error for missing work', () => {
  const config = { version: '0.1.0', paths: DEFAULT_PATHS };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work'), true);
});

Deno.test('validateConfig returns error for null work', () => {
  const config = { version: '0.1.0', paths: DEFAULT_PATHS, work: null };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work'), true);
});

Deno.test('validateConfig returns error for missing path field', () => {
  const partialPaths = { ...DEFAULT_PATHS };
  // @ts-expect-error - intentionally removing required field for test
  delete partialPaths.specs;

  const config = { version: '0.1.0', paths: partialPaths, work: DEFAULT_WORK };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'paths.specs'), true);
});

Deno.test('validateConfig returns error for non-string path field', () => {
  const config = {
    version: '0.1.0',
    paths: { ...DEFAULT_PATHS, specs: 123 },
    work: DEFAULT_WORK,
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'paths.specs'), true);
});

Deno.test('validateConfig returns error for invalid maxIterations', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, maxIterations: 0 },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.maxIterations'), true);
});

Deno.test('validateConfig returns error for negative maxIterations', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, maxIterations: -5 },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.maxIterations'), true);
});

Deno.test('validateConfig returns error for non-number maxIterations', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, maxIterations: 'many' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.maxIterations'), true);
});

Deno.test('validateConfig returns error for non-boolean autoPush', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, autoPush: 'yes' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.autoPush'), true);
});

Deno.test('validateConfig returns error for non-boolean stopOnFailure', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, stopOnFailure: 'no' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.stopOnFailure'), true);
});

Deno.test('validateConfig returns error for negative cooldown', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, cooldown: -1 },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.cooldown'), true);
});

Deno.test('validateConfig returns error for non-number cooldown', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, cooldown: '5' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.cooldown'), true);
});

Deno.test('validateConfig accepts zero cooldown', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, cooldown: 0 },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.cooldown'), false);
});

Deno.test('validateConfig returns error for invalid maxSlcIterations', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, maxSlcIterations: 0 },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.maxSlcIterations'), true);
});

Deno.test('validateConfig returns error for non-number maxSlcIterations', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, maxSlcIterations: 'five' },
  };
  const errors = validateConfig(config);

  assertEquals(errors.some((e) => e.path === 'work.maxSlcIterations'), true);
});

Deno.test('validateConfig returns multiple errors', () => {
  const config = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: {
      model: 'invalid',
      maxIterations: -1,
      maxSlcIterations: 0,
      autoPush: 'yes',
      stopOnFailure: 'no',
      cooldown: -5,
    },
  };
  const errors = validateConfig(config);

  assertEquals(errors.length >= 5, true);
});

// ============================================================================
// parseConfig tests
// ============================================================================

Deno.test('parseConfig parses valid JSON', () => {
  const config = createConfig();
  const json = serializeConfig(config);
  const result = parseConfig(json);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.version, CONFIG_VERSION);
  }
});

Deno.test('parseConfig returns error for invalid JSON', () => {
  const result = parseConfig('not valid json');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error[0]?.message, 'Invalid JSON');
  }
});

Deno.test('parseConfig returns error for empty string', () => {
  const result = parseConfig('');

  assertEquals(result.ok, false);
});

Deno.test('parseConfig returns validation errors for invalid config', () => {
  const result = parseConfig('{"version": 123}');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.some((e) => e.path === 'version'), true);
  }
});

Deno.test('parseConfig returns validation errors for missing fields', () => {
  const result = parseConfig('{"version": "0.1.0"}');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.some((e) => e.path === 'paths'), true);
    assertEquals(result.error.some((e) => e.path === 'work'), true);
  }
});

Deno.test('parseConfig handles well-formed but invalid config', () => {
  const invalidConfig = {
    version: '0.1.0',
    paths: DEFAULT_PATHS,
    work: { ...DEFAULT_WORK, model: 'gpt-4' },
  };
  const result = parseConfig(JSON.stringify(invalidConfig));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.some((e) => e.path === 'work.model'), true);
  }
});

// ============================================================================
// serializeConfig tests
// ============================================================================

Deno.test('serializeConfig produces valid JSON', () => {
  const config = createConfig();
  const json = serializeConfig(config);
  const parsed = JSON.parse(json);

  assertEquals(parsed.version, CONFIG_VERSION);
});

Deno.test('serializeConfig produces formatted JSON', () => {
  const config = createConfig();
  const json = serializeConfig(config);

  // Check that it's formatted (has newlines and indentation)
  assertEquals(json.includes('\n'), true);
  assertEquals(json.includes('  '), true);
});

Deno.test('serializeConfig preserves all fields', () => {
  const config = createConfig({
    paths: { specs: 'custom-specs' },
    work: { model: 'sonnet', maxIterations: 100 },
  });
  const json = serializeConfig(config);
  const parsed = JSON.parse(json);

  assertEquals(parsed.paths.specs, 'custom-specs');
  assertEquals(parsed.work.model, 'sonnet');
  assertEquals(parsed.work.maxIterations, 100);
});

// ============================================================================
// config roundtrip tests
// ============================================================================

Deno.test('config roundtrip preserves data', () => {
  const original = createConfig({
    paths: { specs: 'my-specs' },
    work: { model: 'sonnet', maxIterations: 25 },
  });

  const json = serializeConfig(original);
  const result = parseConfig(json);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.paths.specs, 'my-specs');
    assertEquals(result.value.work.model, 'sonnet');
    assertEquals(result.value.work.maxIterations, 25);
  }
});

Deno.test('config roundtrip preserves all default values', () => {
  const original = createConfig();
  const json = serializeConfig(original);
  const result = parseConfig(json);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.version, original.version);
    assertEquals(result.value.paths, original.paths);
    assertEquals(result.value.work, original.work);
  }
});

// ============================================================================
// mergeConfig tests
// ============================================================================

Deno.test('mergeConfig merges updates correctly', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {
    work: { model: 'sonnet' },
  });

  assertEquals(updated.work.model, 'sonnet');
  assertEquals(updated.work.maxIterations, base.work.maxIterations);
  assertEquals(updated.paths, base.paths);
});

Deno.test('mergeConfig preserves base values when not overridden', () => {
  const base = createConfig({
    paths: { specs: 'original-specs' },
    work: { model: 'opus', maxIterations: 50 },
  });

  const updated = mergeConfig(base, {
    work: { model: 'sonnet' },
  });

  assertEquals(updated.paths.specs, 'original-specs');
  assertEquals(updated.work.maxIterations, 50);
  assertEquals(updated.work.model, 'sonnet');
});

Deno.test('mergeConfig merges nested paths correctly', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {
    paths: { specs: 'new-specs', plan: 'new-plan.md' },
  });

  assertEquals(updated.paths.specs, 'new-specs');
  assertEquals(updated.paths.plan, 'new-plan.md');
  assertEquals(updated.paths.agents, DEFAULT_PATHS.agents);
});

Deno.test('mergeConfig merges nested work correctly', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {
    work: { autoPush: false, cooldown: 10 },
  });

  assertEquals(updated.work.autoPush, false);
  assertEquals(updated.work.cooldown, 10);
  assertEquals(updated.work.model, DEFAULT_WORK.model);
});

Deno.test('mergeConfig allows version override', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {
    version: '1.0.0',
  });

  assertEquals(updated.version, '1.0.0');
});

Deno.test('mergeConfig with empty updates returns base', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {});

  assertEquals(updated.version, base.version);
  assertEquals(updated.paths, base.paths);
  assertEquals(updated.work, base.work);
});

Deno.test('mergeConfig creates new object (immutability)', () => {
  const base = createConfig();
  const updated = mergeConfig(base, { work: { model: 'sonnet' } });

  assertNotEquals(base, updated);
  assertEquals(base.work.model, 'opus');
  assertEquals(updated.work.model, 'sonnet');
});

// ============================================================================
// Constants tests
// ============================================================================

Deno.test('VALID_MODELS contains all expected models', () => {
  assertEquals(VALID_MODELS.includes('opus'), true);
  assertEquals(VALID_MODELS.includes('sonnet'), true);
  assertEquals(VALID_MODELS.includes('adaptive'), true);
  assertEquals(VALID_MODELS.length, 3);
});

Deno.test('RECOMMENDED_MAX_ITERATIONS is 25', () => {
  assertEquals(RECOMMENDED_MAX_ITERATIONS, 25);
});

Deno.test('DEFAULT_WORK.maxIterations equals RECOMMENDED_MAX_ITERATIONS', () => {
  assertEquals(DEFAULT_WORK.maxIterations, RECOMMENDED_MAX_ITERATIONS);
});

Deno.test('DEFAULT_PATHS has all required fields', () => {
  const requiredFields = [
    'specs',
    'research',
    'plan',
    'agents',
    'audienceJtbd',
    'buildPrompt',
    'planPrompt',
    'researchPrompt',
    'startPrompt',
    'specPrompt',
    'audiencePrompt',
  ];

  for (const field of requiredFields) {
    assertEquals(
      typeof DEFAULT_PATHS[field as keyof typeof DEFAULT_PATHS],
      'string',
      `Expected ${field} to be a string`,
    );
  }
});

Deno.test('DEFAULT_WORK has all required fields', () => {
  assertEquals(typeof DEFAULT_WORK.model, 'string');
  assertEquals(typeof DEFAULT_WORK.maxIterations, 'number');
  assertEquals(typeof DEFAULT_WORK.maxSlcIterations, 'number');
  assertEquals(typeof DEFAULT_WORK.autoPush, 'boolean');
  assertEquals(typeof DEFAULT_WORK.stopOnFailure, 'boolean');
  assertEquals(typeof DEFAULT_WORK.cooldown, 'number');
});
