/**
 * @module tests/core/complexity_test
 *
 * Tests for core/complexity module.
 */

import { assertEquals } from '@std/assert';
import { assessComplexity } from '../../src/core/complexity.ts';

// ============================================================================
// Simple Tasks (Should use Sonnet)
// ============================================================================

Deno.test('simple task - fix typo', () => {
  const result = assessComplexity('Fix typo in README');
  assertEquals(result.model, 'sonnet');
  assertEquals(result.complexity, 'simple');
});

Deno.test('simple task - add comment', () => {
  const result = assessComplexity('Add comment explaining the function');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - rename variable', () => {
  const result = assessComplexity('Rename variable foo to bar');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - update docs', () => {
  const result = assessComplexity('Update docs for config module');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - fix lint', () => {
  const result = assessComplexity('Fix lint errors in utils.ts');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - run tests', () => {
  const result = assessComplexity('Run tests for the module');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - add test', () => {
  const result = assessComplexity('Add test for edge case');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - write test', () => {
  const result = assessComplexity('Write test for the function');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - fix test', () => {
  const result = assessComplexity('Fix test that is failing');
  assertEquals(result.model, 'sonnet');
});

Deno.test('simple task - short description', () => {
  const result = assessComplexity('Update file');
  // Short + no keywords = slightly favors simple
  assertEquals(result.complexity, 'simple');
});

// ============================================================================
// Complex Tasks (Should use Opus)
// ============================================================================

Deno.test('complex task - refactor', () => {
  const result = assessComplexity('Refactor authentication system');
  assertEquals(result.model, 'opus');
  assertEquals(result.complexity, 'complex');
});

Deno.test('complex task - implement new feature', () => {
  const result = assessComplexity('Implement new caching mechanism');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - design', () => {
  const result = assessComplexity('Design the API structure');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - integrate', () => {
  const result = assessComplexity('Integrate OAuth provider');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - migrate', () => {
  const result = assessComplexity('Migrate database schema');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - security keyword', () => {
  const result = assessComplexity('Update security headers');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - database keyword', () => {
  const result = assessComplexity('Add database connection pool');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - long description', () => {
  const result = assessComplexity(
    'This is a very long task description that goes into great detail about ' +
      'what needs to be done, including multiple aspects of the work and ' +
      'various edge cases that need to be considered during implementation.',
  );
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - multiple actions with and', () => {
  const result = assessComplexity('Update the config and restart the service');
  assertEquals(result.model, 'opus');
});

Deno.test('complex task - multiple actions with commas', () => {
  // Needs clear complex keywords to outweigh the comma penalty alone
  const result = assessComplexity('Refactor module, migrate database, redesign API');
  assertEquals(result.model, 'opus');
});

// ============================================================================
// Phase Influence
// ============================================================================

Deno.test('phase influence - cleanup phase favors sonnet', () => {
  const result = assessComplexity('Update styles', 'Phase 5: Cleanup');
  assertEquals(result.model, 'sonnet');
});

Deno.test('phase influence - polish phase favors sonnet', () => {
  const result = assessComplexity('Adjust margins', 'Phase 6: Polish');
  assertEquals(result.model, 'sonnet');
});

Deno.test('phase influence - testing phase favors sonnet', () => {
  const result = assessComplexity('Verify output', 'Phase 4: Testing');
  assertEquals(result.model, 'sonnet');
});

Deno.test('phase influence - docs phase favors sonnet', () => {
  const result = assessComplexity('Update examples', 'Phase 7: Docs');
  assertEquals(result.model, 'sonnet');
});

Deno.test('phase influence - core phase favors opus', () => {
  const result = assessComplexity('Update styles', 'Phase 1: Core Architecture');
  assertEquals(result.model, 'opus');
});

Deno.test('phase influence - foundation phase favors opus', () => {
  const result = assessComplexity('Setup config', 'Phase 1: Foundation');
  assertEquals(result.model, 'opus');
});

// ============================================================================
// Default Behavior
// ============================================================================

Deno.test('defaults to opus when scores are tied (medium-length task)', () => {
  // Medium-length task (50-150 chars) with no keywords = tied scores, defaults to opus
  const result = assessComplexity('This is a medium length task without any specific keywords matched');
  assertEquals(result.model, 'opus');
});

Deno.test('short tasks without keywords favor sonnet', () => {
  // Short tasks get +1 simple score, making them lean toward sonnet
  const result = assessComplexity('Do something');
  assertEquals(result.model, 'sonnet');
});

Deno.test('short tasks with null phase favor sonnet', () => {
  const result = assessComplexity('Some task', null);
  assertEquals(result.model, 'sonnet');
});

// ============================================================================
// Reason Field
// ============================================================================

Deno.test('reason contains matched keyword', () => {
  const result = assessComplexity('Fix typo in readme');
  assertEquals(result.reason.includes('fix typo'), true);
});

Deno.test('reason shows default when no keywords match', () => {
  const result = assessComplexity('Do something');
  assertEquals(result.reason, 'default');
});

Deno.test('reason limits to 2 keywords', () => {
  const result = assessComplexity('Fix typo, add comment, update docs');
  const parts = result.reason.split(', ');
  assertEquals(parts.length <= 2, true);
});
