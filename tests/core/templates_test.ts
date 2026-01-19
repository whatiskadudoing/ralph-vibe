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

Deno.test('renderBuildPrompt includes specs/README.md reference', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'specs/README.md');
  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
});

Deno.test('renderBuildPrompt includes task selection', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'most important');
  assertStringIncludes(result, 'AGENTS.md');
});

Deno.test('renderBuildPrompt includes validation instructions', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Run validation commands');
  assertStringIncludes(result, 'tests pass');
});

Deno.test('renderBuildPrompt includes commit instructions', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Commit');
  assertStringIncludes(result, 'Push to remote');
});

Deno.test('renderBuildPrompt includes key guardrails', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Search codebase first');
  assertStringIncludes(result, 'One task per iteration');
});

Deno.test('renderBuildPrompt includes implementation quality rules', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'Implement completely');
  assertStringIncludes(result, 'No placeholders');
});

Deno.test('renderBuildPrompt includes backpressure control', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, '1 subagent');
  assertStringIncludes(result, 'backpressure');
});

Deno.test('renderBuildPrompt includes subagent guidance', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, '500 parallel subagents');
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

Deno.test('renderPlanPrompt includes linked task requirement', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Linked');
  assertStringIncludes(result, '[spec:');
  assertStringIncludes(result, '[file:');
});

Deno.test('renderPlanPrompt references IMPLEMENTATION_PLAN.md', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
});

Deno.test('renderPlanPrompt references specs/README.md', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'specs/README.md');
});

// ============================================================================
// renderAgentsMd Tests
// ============================================================================

Deno.test('renderAgentsMd includes commands section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Commands');
  assertStringIncludes(result, 'Build:');
  assertStringIncludes(result, 'Test:');
  assertStringIncludes(result, 'Lint:');
});

Deno.test('renderAgentsMd tells Claude to discover commands', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'discover');
});

Deno.test('renderAgentsMd includes validation section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Validation');
  assertStringIncludes(result, 'Tests pass');
  assertStringIncludes(result, 'Lint passes');
});

Deno.test('renderAgentsMd includes patterns section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Patterns');
});

Deno.test('renderAgentsMd includes notes section', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Notes');
});

Deno.test('renderAgentsMd emphasizes brevity', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'BRIEF');
  assertStringIncludes(result, '60 lines');
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

Deno.test('renderSpecInterviewPrompt includes specs/README.md update instruction', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'specs/README.md');
});
