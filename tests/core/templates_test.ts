/**
 * @module tests/core/templates_test
 *
 * Tests for core/templates module.
 */

import { assertStringIncludes } from '@std/assert';
import {
  renderAgentsMd,
  renderBuildPrompt,
  renderInitialPlan,
  renderPlanPrompt,
  renderSpecInterviewPrompt,
} from '../../src/core/templates.ts';

// ============================================================================
// renderBuildPrompt Tests
// ============================================================================

Deno.test('renderBuildPrompt includes Phase 0 (Orientation)', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Phase 0: Orientation');
  assertStringIncludes(result, 'Study the specifications');
  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
});

Deno.test('renderBuildPrompt includes Phase 1 (Task Selection)', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Phase 1: Task Selection & Implementation');
  assertStringIncludes(result, 'MOST IMPORTANT');
  assertStringIncludes(result, 'AGENTS.md');
});

Deno.test('renderBuildPrompt includes Phase 2 (Validation)', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Phase 2: Validation');
  assertStringIncludes(result, 'Run all validation commands');
});

Deno.test('renderBuildPrompt includes Phase 3 (Documentation)', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Phase 3: Documentation');
  assertStringIncludes(result, 'Mark task `[x]` complete');
  assertStringIncludes(result, 'Add any learnings');
});

Deno.test('renderBuildPrompt includes Phase 4 (Commit)', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Phase 4: Commit');
  assertStringIncludes(result, 'Stage all changes');
  assertStringIncludes(result, 'Push to remote');
});

Deno.test('renderBuildPrompt includes Guardrails', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Guardrails');
  assertStringIncludes(result, 'Search codebase before assuming');
  assertStringIncludes(result, 'One task per iteration');
  assertStringIncludes(result, 'Tests must pass');
});

Deno.test('renderBuildPrompt includes original Ralph Wiggum guardrails', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Implement completely');
  assertStringIncludes(result, 'placeholders');
  assertStringIncludes(result, 'Single source of truth');
  assertStringIncludes(result, 'AGENTS.md operational only');
});

Deno.test('renderBuildPrompt includes backpressure control', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, '1 Sonnet subagent');
  assertStringIncludes(result, 'backpressure');
});

Deno.test('renderBuildPrompt uses Study for specs', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Study the specifications');
  assertStringIncludes(result, 'parallel Sonnet subagents');
});

Deno.test('renderBuildPrompt includes EXIT_SIGNAL', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'EXIT_SIGNAL');
});

// ============================================================================
// renderPlanPrompt Tests
// ============================================================================

Deno.test('renderPlanPrompt focuses on gap analysis', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'GAP ANALYSIS');
  assertStringIncludes(result, 'specifications and code');
});

Deno.test('renderPlanPrompt includes critical rules', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Plan only');
  assertStringIncludes(result, 'Do NOT implement');
  assertStringIncludes(result, 'Do NOT assume functionality is missing');
  assertStringIncludes(result, 'confirm with code search');
});

Deno.test('renderPlanPrompt uses Study and parallel subagents', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Study');
  assertStringIncludes(result, 'parallel Sonnet subagents');
});

Deno.test('renderPlanPrompt emphasizes no placeholders', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'no placeholders');
});

Deno.test('renderPlanPrompt references IMPLEMENTATION_PLAN.md', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
});

Deno.test('renderPlanPrompt references specs directory', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, '`specs/`');
});

// ============================================================================
// renderAgentsMd Tests
// ============================================================================

Deno.test('renderAgentsMd includes build section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Build & Run');
  assertStringIncludes(result, 'Build:');
  assertStringIncludes(result, 'Test:');
  assertStringIncludes(result, 'Lint:');
});

Deno.test('renderAgentsMd tells Claude to discover commands', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'discover from project files');
});

Deno.test('renderAgentsMd includes validation checklist', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Validation Checklist');
  assertStringIncludes(result, 'Tests pass');
  assertStringIncludes(result, 'Linting passes');
});

Deno.test('renderAgentsMd includes operational notes section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Operational Notes');
});

Deno.test('renderAgentsMd includes codebase patterns section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Codebase Patterns');
});

// ============================================================================
// renderInitialPlan Tests
// ============================================================================

Deno.test('renderInitialPlan includes header', () => {
  const result = renderInitialPlan();

  assertStringIncludes(result, '# Implementation Plan');
});

Deno.test('renderInitialPlan includes instructions', () => {
  const result = renderInitialPlan();

  assertStringIncludes(result, 'ralph plan');
});

Deno.test('renderInitialPlan includes placeholder phase', () => {
  const result = renderInitialPlan();

  assertStringIncludes(result, 'Phase 1');
  assertStringIncludes(result, '- [ ]');
});

// ============================================================================
// renderSpecInterviewPrompt Tests
// ============================================================================

Deno.test('renderSpecInterviewPrompt works without hint', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'Spec Interview Mode');
  assertStringIncludes(result, 'user wants to add a new feature');
});

Deno.test('renderSpecInterviewPrompt includes hint when provided', () => {
  const result = renderSpecInterviewPrompt('user authentication');

  assertStringIncludes(result, 'user authentication');
});

Deno.test('renderSpecInterviewPrompt includes interview guidelines', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'ONE AT A TIME');
  assertStringIncludes(result, 'What');
  assertStringIncludes(result, 'Who');
  assertStringIncludes(result, 'How');
  assertStringIncludes(result, 'Edge cases');
});
