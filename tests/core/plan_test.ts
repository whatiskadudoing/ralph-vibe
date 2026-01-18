/**
 * @module tests/core/plan_test
 *
 * Tests for core/plan module.
 */

import { assertEquals } from '@std/assert';
import {
  addTask,
  getCompletedTasks,
  getCompletionPercent,
  getNextTask,
  getPendingTasks,
  isComplete,
  markTaskComplete,
  parsePhaseHeader,
  parsePlan,
  parseTaskLine,
} from '../../src/core/plan.ts';

// ============================================================================
// parseTaskLine tests
// ============================================================================

Deno.test('parseTaskLine parses pending task', () => {
  const task = parseTaskLine('- [ ] Implement feature', 1);

  assertEquals(task?.text, 'Implement feature');
  assertEquals(task?.status, 'pending');
  assertEquals(task?.lineNumber, 1);
});

Deno.test('parseTaskLine parses completed task with lowercase x', () => {
  const task = parseTaskLine('- [x] Done task', 5);

  assertEquals(task?.text, 'Done task');
  assertEquals(task?.status, 'completed');
});

Deno.test('parseTaskLine parses completed task with uppercase X', () => {
  const task = parseTaskLine('- [X] Another done', 3);

  assertEquals(task?.status, 'completed');
});

Deno.test('parseTaskLine handles indented tasks', () => {
  const task = parseTaskLine('  - [ ] Indented task', 2);

  assertEquals(task?.text, 'Indented task');
});

Deno.test('parseTaskLine returns null for non-task lines', () => {
  assertEquals(parseTaskLine('Some text', 1), null);
  assertEquals(parseTaskLine('## Header', 1), null);
  assertEquals(parseTaskLine('', 1), null);
});

Deno.test('parseTaskLine includes phase when provided', () => {
  const task = parseTaskLine('- [ ] Task in phase', 1, 'Phase 1');

  assertEquals(task?.phase, 'Phase 1');
});

// ============================================================================
// parsePhaseHeader tests
// ============================================================================

Deno.test('parsePhaseHeader parses ## header', () => {
  assertEquals(parsePhaseHeader('## Phase 1'), 'Phase 1');
});

Deno.test('parsePhaseHeader parses ### header', () => {
  assertEquals(parsePhaseHeader('### Sub Phase'), 'Sub Phase');
});

Deno.test('parsePhaseHeader returns null for non-headers', () => {
  assertEquals(parsePhaseHeader('Not a header'), null);
  assertEquals(parsePhaseHeader('# Too few hashes'), null);
  assertEquals(parsePhaseHeader(''), null);
});

// ============================================================================
// parsePlan tests
// ============================================================================

Deno.test('parsePlan parses simple plan', () => {
  const content = `
# Implementation Plan

## Phase 1
- [ ] First task
- [x] Second task

## Phase 2
- [ ] Third task
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 2);
  assertEquals(plan.totalCount, 3);
  assertEquals(plan.completedCount, 1);
});

Deno.test('parsePlan handles empty content', () => {
  const plan = parsePlan('');

  assertEquals(plan.phases.length, 0);
  assertEquals(plan.totalCount, 0);
});

Deno.test('parsePlan handles tasks without phases', () => {
  const content = `
- [ ] Orphan task 1
- [ ] Orphan task 2
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 1);
  const firstPhase = plan.phases[0];
  if (firstPhase) {
    assertEquals(firstPhase.name, 'Tasks');
  }
  assertEquals(plan.totalCount, 2);
});

// ============================================================================
// Query function tests
// ============================================================================

Deno.test('getNextTask returns first pending task', () => {
  const content = `
## Phase 1
- [x] Done
- [ ] Next one
- [ ] After
`.trim();

  const plan = parsePlan(content);
  const next = getNextTask(plan);

  assertEquals(next?.text, 'Next one');
});

Deno.test('getNextTask returns null when all done', () => {
  const content = `
- [x] Done 1
- [x] Done 2
`.trim();

  const plan = parsePlan(content);
  assertEquals(getNextTask(plan), null);
});

Deno.test('getPendingTasks returns all pending', () => {
  const content = `
- [ ] Pending 1
- [x] Done
- [ ] Pending 2
`.trim();

  const plan = parsePlan(content);
  const pending = getPendingTasks(plan);

  assertEquals(pending.length, 2);
});

Deno.test('getCompletedTasks returns all completed', () => {
  const content = `
- [ ] Pending
- [x] Done 1
- [x] Done 2
`.trim();

  const plan = parsePlan(content);
  const completed = getCompletedTasks(plan);

  assertEquals(completed.length, 2);
});

Deno.test('isComplete returns true when all done', () => {
  const content = `
- [x] Done 1
- [x] Done 2
`.trim();

  const plan = parsePlan(content);
  assertEquals(isComplete(plan), true);
});

Deno.test('isComplete returns false with pending tasks', () => {
  const content = `
- [x] Done
- [ ] Not done
`.trim();

  const plan = parsePlan(content);
  assertEquals(isComplete(plan), false);
});

Deno.test('getCompletionPercent calculates correctly', () => {
  const content = `
- [x] Done
- [ ] Pending
- [ ] Pending
- [ ] Pending
`.trim();

  const plan = parsePlan(content);
  assertEquals(getCompletionPercent(plan), 25);
});

// ============================================================================
// Modification function tests
// ============================================================================

Deno.test('markTaskComplete marks task as done', () => {
  const content = '- [ ] My task';
  const updated = markTaskComplete(content, 'My task');

  assertEquals(updated, '- [x] My task');
});

Deno.test('markTaskComplete only marks matching task', () => {
  const content = `
- [ ] First task
- [ ] Second task
`.trim();

  const updated = markTaskComplete(content, 'Second task');

  assertEquals(updated.includes('- [ ] First task'), true);
  assertEquals(updated.includes('- [x] Second task'), true);
});

Deno.test('addTask adds task at end without phase', () => {
  const content = '- [ ] Existing task';
  const updated = addTask(content, 'New task');

  assertEquals(updated.includes('- [ ] New task'), true);
});

Deno.test('addTask adds task to specific phase', () => {
  const content = `
## Phase 1
- [ ] Task 1

## Phase 2
- [ ] Task 2
`.trim();

  const updated = addTask(content, 'New task', 'Phase 1');

  // New task should be added after Phase 1's existing tasks
  const lines = updated.split('\n');
  const phase1Index = lines.findIndex((l) => l.includes('Phase 1'));
  const newTaskIndex = lines.findIndex((l) => l.includes('New task'));
  const phase2Index = lines.findIndex((l) => l.includes('Phase 2'));

  assertEquals(newTaskIndex > phase1Index, true);
  assertEquals(newTaskIndex < phase2Index, true);
});
