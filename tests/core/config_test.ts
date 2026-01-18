/**
 * @module tests/core/config_test
 *
 * Tests for core/config module.
 */

import { assertEquals } from '@std/assert';
import {
  CONFIG_VERSION,
  createConfig,
  DEFAULT_PATHS,
  DEFAULT_WORK,
  mergeConfig,
  parseConfig,
  serializeConfig,
  validateConfig,
} from '../../src/core/config.ts';

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

Deno.test('validateConfig returns empty array for valid config', () => {
  const config = createConfig();
  const errors = validateConfig(config);

  assertEquals(errors.length, 0);
});

Deno.test('validateConfig returns errors for missing version', () => {
  const config = { paths: DEFAULT_PATHS, work: DEFAULT_WORK };
  const errors = validateConfig(config);

  assertEquals(errors.length > 0, true);
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
});

Deno.test('serializeConfig produces valid JSON', () => {
  const config = createConfig();
  const json = serializeConfig(config);
  const parsed = JSON.parse(json);

  assertEquals(parsed.version, CONFIG_VERSION);
});

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

Deno.test('mergeConfig merges updates correctly', () => {
  const base = createConfig();
  const updated = mergeConfig(base, {
    work: { model: 'sonnet' },
  });

  assertEquals(updated.work.model, 'sonnet');
  assertEquals(updated.work.maxIterations, base.work.maxIterations);
  assertEquals(updated.paths, base.paths);
});
