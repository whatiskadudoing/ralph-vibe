/**
 * @module tests/core/templates_test
 *
 * Tests for core/templates module.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import {
  renderAgentsMd,
  renderAnalysisPrompt,
  renderAudiencePrompt,
  renderBuildPrompt,
  renderBuildPromptForked,
  renderInitialAudienceJtbd,
  renderInitialPlan,
  renderInitialResearchReadme,
  renderPlanCommandPrompt,
  renderPlanPrompt,
  renderResearchPrompt,
  renderSpecInterviewPrompt,
  renderStartPrompt,
  renderSynthesisPrompt,
} from '../../src/core/templates.ts';
import { RALPH_DONE_MARKER, RALPH_EXIT_SIGNAL } from '../../src/core/constants.ts';

// ============================================================================
// renderBuildPrompt Tests
// ============================================================================

Deno.test('renderBuildPrompt includes specs/* reference', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'specs/*');
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

  assertStringIncludes(result, '1 Sonnet subagent');
  assertStringIncludes(result, 'backpressure');
});

Deno.test('renderBuildPrompt includes subagent guidance', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, '500 parallel');
  assertStringIncludes(result, 'Sonnet');
});

Deno.test('renderBuildPrompt includes EXIT_SIGNAL', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'EXIT_SIGNAL');
});

Deno.test('renderBuildPrompt includes SLC_COMPLETE', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'SLC_COMPLETE');
});

Deno.test('renderBuildPrompt includes UI changes protocol', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'UI Changes Protocol');
  assertStringIncludes(result, 'screenshot');
});

Deno.test('renderBuildPrompt includes numbered guardrails', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, '999999');
  assertStringIncludes(result, 'ONE TASK ONLY');
});

Deno.test('renderBuildPrompt includes RALPH_STATUS format', () => {
  const result = renderBuildPrompt();

  assertStringIncludes(result, 'RALPH_STATUS');
  assertStringIncludes(result, 'task:');
  assertStringIncludes(result, 'validation:');
});

// ============================================================================
// renderBuildPromptForked Tests
// ============================================================================

Deno.test('renderBuildPromptForked includes cached context note', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, 'Cached Context');
  assertStringIncludes(result, 'already have specs in context');
});

Deno.test('renderBuildPromptForked references IMPLEMENTATION_PLAN.md', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
});

Deno.test('renderBuildPromptForked references AGENTS.md', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, 'AGENTS.md');
});

Deno.test('renderBuildPromptForked includes guardrails', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, '999999');
  assertStringIncludes(result, 'ONE TASK ONLY');
});

Deno.test('renderBuildPromptForked includes EXIT_SIGNAL', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, 'EXIT_SIGNAL');
});

Deno.test('renderBuildPromptForked includes SLC_COMPLETE', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, 'SLC_COMPLETE');
});

Deno.test('renderBuildPromptForked is shorter than full build prompt', () => {
  const full = renderBuildPrompt();
  const forked = renderBuildPromptForked();

  // Forked should be shorter (no spec study instructions)
  assertEquals(forked.length < full.length, true);
});

Deno.test('renderBuildPromptForked includes backpressure', () => {
  const result = renderBuildPromptForked();

  assertStringIncludes(result, '500 parallel');
  assertStringIncludes(result, '1 Sonnet subagent');
});

// ============================================================================
// renderPlanPrompt Tests
// ============================================================================

Deno.test('renderPlanPrompt focuses on gap analysis and SLC', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'GAP ANALYSIS');
  assertStringIncludes(result, 'SLC RELEASE PLANNING');
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

Deno.test('renderPlanPrompt includes AUDIENCE_JTBD.md reference', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
});

Deno.test('renderPlanPrompt includes task sizing guidance', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Task Sizing');
  assertStringIncludes(result, 'DO NOT create micro-tasks');
});

Deno.test('renderPlanPrompt includes phase structure', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Phase 1');
  assertStringIncludes(result, 'CHECKPOINT');
});

Deno.test('renderPlanPrompt includes future work section', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'Future Work');
});

Deno.test('renderPlanPrompt includes research folder reference', () => {
  const result = renderPlanPrompt();

  assertStringIncludes(result, 'research/');
});

// ============================================================================
// renderAnalysisPrompt Tests
// ============================================================================

Deno.test('renderAnalysisPrompt is for codebase analysis', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'analyzing a codebase');
  assertStringIncludes(result, 'SLC release planning');
});

Deno.test('renderAnalysisPrompt includes audience context', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
  assertStringIncludes(result, 'audience');
});

Deno.test('renderAnalysisPrompt includes spec reading', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'specs/');
  assertStringIncludes(result, 'activity spec');
});

Deno.test('renderAnalysisPrompt includes tech stack analysis', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'Tech Stack');
  assertStringIncludes(result, 'package.json');
});

Deno.test('renderAnalysisPrompt includes implementation status', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'Implementation Status');
  assertStringIncludes(result, 'Gaps Identified');
});

Deno.test('renderAnalysisPrompt includes output format', () => {
  const result = renderAnalysisPrompt();

  assertStringIncludes(result, 'OUTPUT FORMAT');
  assertStringIncludes(result, 'Codebase Analysis');
});

// ============================================================================
// renderSynthesisPrompt Tests
// ============================================================================

Deno.test('renderSynthesisPrompt accepts analysis input', () => {
  const analysis = 'Sample analysis content';
  const result = renderSynthesisPrompt(analysis);

  assertStringIncludes(result, 'Sample analysis content');
});

Deno.test('renderSynthesisPrompt generates implementation plan', () => {
  const result = renderSynthesisPrompt('analysis');

  assertStringIncludes(result, 'IMPLEMENTATION_PLAN.md');
  assertStringIncludes(result, 'implementation plan');
});

Deno.test('renderSynthesisPrompt includes SLC recommendation', () => {
  const result = renderSynthesisPrompt('analysis');

  assertStringIncludes(result, 'SLC release');
  assertStringIncludes(result, 'Recommend');
});

Deno.test('renderSynthesisPrompt includes task sizing', () => {
  const result = renderSynthesisPrompt('analysis');

  assertStringIncludes(result, 'TASK SIZING');
  assertStringIncludes(result, 'micro-tasks');
});

Deno.test('renderSynthesisPrompt includes audience reference', () => {
  const result = renderSynthesisPrompt('analysis');

  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
});

Deno.test('renderSynthesisPrompt includes completion message', () => {
  const result = renderSynthesisPrompt('analysis');

  assertStringIncludes(result, 'Plan generated');
  assertStringIncludes(result, 'ralph work');
});

// ============================================================================
// renderPlanCommandPrompt Tests
// ============================================================================

Deno.test('renderPlanCommandPrompt is for gap analysis', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'GAP ANALYSIS');
  assertStringIncludes(result, 'SLC RELEASE PLANNING');
});

Deno.test('renderPlanCommandPrompt includes phase structure', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'PHASE 0');
  assertStringIncludes(result, 'PHASE 1');
  assertStringIncludes(result, 'PHASE 2');
  assertStringIncludes(result, 'PHASE 3');
  assertStringIncludes(result, 'PHASE 4');
});

Deno.test('renderPlanCommandPrompt includes audience understanding', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
  assertStringIncludes(result, "WHO WE'RE BUILDING FOR");
});

Deno.test('renderPlanCommandPrompt includes journey sequencing', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'JOURNEY SEQUENCING');
  assertStringIncludes(result, 'user journey');
});

Deno.test('renderPlanCommandPrompt includes critical rules', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'CRITICAL RULES');
  assertStringIncludes(result, 'Plan only');
  assertStringIncludes(result, 'Do NOT implement');
});

Deno.test('renderPlanCommandPrompt includes output format', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'OUTPUT FORMAT');
  assertStringIncludes(result, '# Implementation Plan');
});

Deno.test('renderPlanCommandPrompt includes completion message', () => {
  const result = renderPlanCommandPrompt();

  assertStringIncludes(result, 'Plan generated');
  assertStringIncludes(result, 'ralph work');
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

Deno.test('renderAgentsMd includes backpressure', () => {
  const result = renderAgentsMd();

  assertStringIncludes(result, 'Backpressure');
});

Deno.test('renderAgentsMd is reasonably short', () => {
  const result = renderAgentsMd();
  const lineCount = result.split('\n').length;

  // Should be under 60 lines as mentioned
  assertEquals(lineCount < 60, true);
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

Deno.test('renderInitialPlan is parseable', () => {
  const result = renderInitialPlan();

  // Should be valid markdown that parsePlan can handle
  assertEquals(result.includes('# Implementation Plan'), true);
  assertEquals(result.includes('- [ ]'), true);
});

// ============================================================================
// renderSpecInterviewPrompt Tests
// ============================================================================

Deno.test('renderSpecInterviewPrompt works without hint', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'Activity Spec Interview Mode');
  assertStringIncludes(result, 'user wants to add a new activity');
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

Deno.test('renderSpecInterviewPrompt includes activity-based principles', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'ACTIVITIES (verbs)');
  assertStringIncludes(result, 'not topics (nouns)');
});

Deno.test('renderSpecInterviewPrompt includes capability depths', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'Basic');
  assertStringIncludes(result, 'Standard');
  assertStringIncludes(result, 'Advanced');
});

Deno.test('renderSpecInterviewPrompt includes RALPH_EXIT_SIGNAL', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, RALPH_EXIT_SIGNAL);
});

Deno.test('renderSpecInterviewPrompt includes RALPH_DONE_MARKER', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, RALPH_DONE_MARKER);
});

Deno.test('renderSpecInterviewPrompt includes restrictions', () => {
  const result = renderSpecInterviewPrompt();

  assertStringIncludes(result, 'SPEC WRITER');
  assertStringIncludes(result, 'CANNOT');
});

// ============================================================================
// renderStartPrompt Tests
// ============================================================================

Deno.test('renderStartPrompt includes activity spec interview header', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, '# Activity Spec Interview');
});

Deno.test('renderStartPrompt includes deep requirements note', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, 'deep requirements gathering');
  assertStringIncludes(result, '20-40 questions');
});

Deno.test('renderStartPrompt includes activity-based principles', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, 'Activity-Based Specs');
  assertStringIncludes(result, 'verbs');
});

Deno.test('renderStartPrompt includes spec format', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, '## Overview');
  assertStringIncludes(result, '## Job-to-be-Done');
  assertStringIncludes(result, '## Capability Depths');
});

Deno.test('renderStartPrompt includes RALPH_EXIT_SIGNAL', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, RALPH_EXIT_SIGNAL);
});

Deno.test('renderStartPrompt includes RALPH_DONE_MARKER', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, RALPH_DONE_MARKER);
});

Deno.test('renderStartPrompt includes phase 0 for audience', () => {
  const result = renderStartPrompt();

  assertStringIncludes(result, 'Phase 0');
  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
});

// ============================================================================
// renderAudiencePrompt Tests
// ============================================================================

Deno.test('renderAudiencePrompt includes interview header', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'Audience & Jobs-to-be-Done Interview');
});

Deno.test('renderAudiencePrompt includes why this matters', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'Why This Matters');
  assertStringIncludes(result, 'map back to a user job');
});

Deno.test('renderAudiencePrompt includes interview guidelines', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'ONE question at a time');
  assertStringIncludes(result, 'Be conversational');
});

Deno.test('renderAudiencePrompt includes audience discovery', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'Audience Discovery');
  assertStringIncludes(result, 'primary user');
});

Deno.test('renderAudiencePrompt includes JTBD discovery', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'Jobs-to-be-Done Discovery');
  assertStringIncludes(result, 'When [situation]');
});

Deno.test('renderAudiencePrompt includes file format', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
  assertStringIncludes(result, '## Primary Audience');
  assertStringIncludes(result, '## Jobs-to-be-Done');
});

Deno.test('renderAudiencePrompt includes RALPH_EXIT_SIGNAL', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, RALPH_EXIT_SIGNAL);
});

Deno.test('renderAudiencePrompt includes RALPH_DONE_MARKER', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, RALPH_DONE_MARKER);
});

Deno.test('renderAudiencePrompt includes restrictions', () => {
  const result = renderAudiencePrompt();

  assertStringIncludes(result, 'You CAN');
  assertStringIncludes(result, 'You CANNOT');
});

// ============================================================================
// renderInitialAudienceJtbd Tests
// ============================================================================

Deno.test('renderInitialAudienceJtbd includes header', () => {
  const result = renderInitialAudienceJtbd();

  assertStringIncludes(result, '# Audience & Jobs-to-be-Done');
});

Deno.test('renderInitialAudienceJtbd includes instructions', () => {
  const result = renderInitialAudienceJtbd();

  assertStringIncludes(result, 'ralph audience');
  assertStringIncludes(result, 'ralph start');
});

Deno.test('renderInitialAudienceJtbd includes placeholder sections', () => {
  const result = renderInitialAudienceJtbd();

  assertStringIncludes(result, '## Primary Audience');
  assertStringIncludes(result, 'To be discovered');
});

Deno.test('renderInitialAudienceJtbd includes activity map', () => {
  const result = renderInitialAudienceJtbd();

  assertStringIncludes(result, '## Activity Map');
  assertStringIncludes(result, '| Activity |');
});

// ============================================================================
// renderResearchPrompt Tests
// ============================================================================

Deno.test('renderResearchPrompt includes research header', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, '# Research Mode');
  assertStringIncludes(result, 'Discovery & Validation');
});

Deno.test('renderResearchPrompt includes prerequisites', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Pre-Requisites');
  assertStringIncludes(result, 'AUDIENCE_JTBD.md');
  assertStringIncludes(result, 'specs/');
});

Deno.test('renderResearchPrompt includes model strategy', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Model Strategy');
  assertStringIncludes(result, 'parallel Sonnet');
  assertStringIncludes(result, 'Opus');
});

Deno.test('renderResearchPrompt includes competitive research', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Competitive & Inspiration Research');
  assertStringIncludes(result, 'Similar Products');
});

Deno.test('renderResearchPrompt includes API discovery', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'API Discovery');
  assertStringIncludes(result, 'llms.txt');
});

Deno.test('renderResearchPrompt includes API validation', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'API Validation');
  assertStringIncludes(result, 'curl');
});

Deno.test('renderResearchPrompt includes technical approach research', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Technical Approach Research');
  assertStringIncludes(result, 'Algorithm');
});

Deno.test('renderResearchPrompt includes readiness assessment', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Readiness Assessment');
  assertStringIncludes(result, 'readiness.md');
});

Deno.test('renderResearchPrompt includes output structure', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'research/');
  assertStringIncludes(result, 'inspiration.md');
  assertStringIncludes(result, 'api-validation.md');
  assertStringIncludes(result, 'apis/');
  assertStringIncludes(result, 'approaches/');
});

Deno.test('renderResearchPrompt includes critical rules', () => {
  const result = renderResearchPrompt();

  assertStringIncludes(result, 'Research only');
  assertStringIncludes(result, 'Do NOT implement');
});

// ============================================================================
// renderInitialResearchReadme Tests
// ============================================================================

Deno.test('renderInitialResearchReadme includes header', () => {
  const result = renderInitialResearchReadme();

  assertStringIncludes(result, '# Research & Discovery');
});

Deno.test('renderInitialResearchReadme includes folder structure', () => {
  const result = renderInitialResearchReadme();

  assertStringIncludes(result, 'Folder Structure');
  assertStringIncludes(result, 'research/');
  assertStringIncludes(result, 'inspiration.md');
  assertStringIncludes(result, 'apis/');
});

Deno.test('renderInitialResearchReadme includes usage instructions', () => {
  const result = renderInitialResearchReadme();

  assertStringIncludes(result, 'How to Use');
  assertStringIncludes(result, 'ralph plan');
  assertStringIncludes(result, 'ralph work');
});

Deno.test('renderInitialResearchReadme mentions sources', () => {
  const result = renderInitialResearchReadme();

  assertStringIncludes(result, 'Sources');
  assertStringIncludes(result, 'URLs');
});

// ============================================================================
// Template trimming and formatting tests
// ============================================================================

Deno.test('all templates are trimmed (no leading/trailing whitespace)', () => {
  const templates = [
    renderBuildPrompt(),
    renderBuildPromptForked(),
    renderPlanPrompt(),
    renderAnalysisPrompt(),
    renderSynthesisPrompt('test'),
    renderPlanCommandPrompt(),
    renderAgentsMd(),
    renderInitialPlan(),
    renderSpecInterviewPrompt(),
    renderSpecInterviewPrompt('hint'),
    renderStartPrompt(),
    renderAudiencePrompt(),
    renderInitialAudienceJtbd(),
    renderResearchPrompt(),
    renderInitialResearchReadme(),
  ];

  for (const template of templates) {
    assertEquals(template, template.trim(), 'Template should be trimmed');
  }
});

Deno.test('all templates return non-empty strings', () => {
  const templates = [
    renderBuildPrompt(),
    renderBuildPromptForked(),
    renderPlanPrompt(),
    renderAnalysisPrompt(),
    renderSynthesisPrompt('test'),
    renderPlanCommandPrompt(),
    renderAgentsMd(),
    renderInitialPlan(),
    renderSpecInterviewPrompt(),
    renderStartPrompt(),
    renderAudiencePrompt(),
    renderInitialAudienceJtbd(),
    renderResearchPrompt(),
    renderInitialResearchReadme(),
  ];

  for (const template of templates) {
    assertEquals(template.length > 0, true, 'Template should not be empty');
  }
});
