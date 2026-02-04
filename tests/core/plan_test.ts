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

Deno.test('parseTaskLine handles task with extra whitespace', () => {
  const task = parseTaskLine('- [ ]   Task with spaces   ', 1);

  assertEquals(task?.text, 'Task with spaces');
});

Deno.test('parseTaskLine handles deeply indented tasks', () => {
  const task = parseTaskLine('        - [ ] Very indented', 1);

  assertEquals(task?.text, 'Very indented');
});

Deno.test('parseTaskLine returns null for malformed checkbox', () => {
  // Missing character in brackets - no space, x, or X
  assertEquals(parseTaskLine('- [] Missing space', 1), null);
  // Two spaces in brackets - only single space, x, or X allowed
  assertEquals(parseTaskLine('- [  ] Extra space', 1), null);
  // Note: '-[ ] text' IS valid - the regex allows zero spaces after dash
  // This is intentionally permissive to handle various markdown styles
});

Deno.test('parseTaskLine returns null for task without text', () => {
  assertEquals(parseTaskLine('- [ ]', 1), null);
  assertEquals(parseTaskLine('- [ ]   ', 1), null);
});

Deno.test('parseTaskLine handles task with special characters', () => {
  const task = parseTaskLine('- [ ] Task with `code` and **bold**', 1);

  assertEquals(task?.text, 'Task with `code` and **bold**');
});

Deno.test('parseTaskLine handles task with links', () => {
  const task = parseTaskLine('- [ ] Task [spec: feature.md] [file: src/]', 1);

  assertEquals(task?.text, 'Task [spec: feature.md] [file: src/]');
});

Deno.test('parseTaskLine does not add phase when undefined', () => {
  const task = parseTaskLine('- [ ] Task without phase', 1, undefined);

  assertEquals(task?.phase, undefined);
  assertEquals('phase' in (task ?? {}), false);
});

Deno.test('parseTaskLine preserves exact line number', () => {
  const task1 = parseTaskLine('- [ ] Task', 42);
  const task2 = parseTaskLine('- [ ] Task', 1000);

  assertEquals(task1?.lineNumber, 42);
  assertEquals(task2?.lineNumber, 1000);
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

Deno.test('parsePhaseHeader returns null for single hash', () => {
  assertEquals(parsePhaseHeader('# Title'), null);
});

Deno.test('parsePhaseHeader returns null for #### header', () => {
  // The regex only matches 2-3 # (## or ###), not more
  // #### headers are typically sub-sub-sections and not treated as phases
  assertEquals(parsePhaseHeader('#### Deep Nested'), null);
});

Deno.test('parsePhaseHeader handles header with extra whitespace', () => {
  assertEquals(parsePhaseHeader('##    Phase with spaces   '), 'Phase with spaces');
});

Deno.test('parsePhaseHeader handles header with special characters', () => {
  assertEquals(parsePhaseHeader('## Phase 1: Setup & Config'), 'Phase 1: Setup & Config');
});

Deno.test('parsePhaseHeader returns null for header without text', () => {
  assertEquals(parsePhaseHeader('##'), null);
  assertEquals(parsePhaseHeader('##   '), null);
});

Deno.test('parsePhaseHeader handles indented header', () => {
  assertEquals(parsePhaseHeader('  ## Indented Header'), 'Indented Header');
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

Deno.test('parsePlan preserves task order within phases', () => {
  const content = `
## Phase 1
- [ ] First
- [ ] Second
- [ ] Third
`.trim();

  const plan = parsePlan(content);
  const phase = plan.phases[0];

  assertEquals(phase?.tasks[0]?.text, 'First');
  assertEquals(phase?.tasks[1]?.text, 'Second');
  assertEquals(phase?.tasks[2]?.text, 'Third');
});

Deno.test('parsePlan handles multiple phases', () => {
  const content = `
## Phase 1
- [ ] Task 1

## Phase 2
- [ ] Task 2

## Phase 3
- [ ] Task 3
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 3);
  assertEquals(plan.phases[0]?.name, 'Phase 1');
  assertEquals(plan.phases[1]?.name, 'Phase 2');
  assertEquals(plan.phases[2]?.name, 'Phase 3');
});

Deno.test('parsePlan correctly counts completed tasks', () => {
  const content = `
## Phase 1
- [x] Done 1
- [x] Done 2
- [ ] Pending 1

## Phase 2
- [x] Done 3
- [ ] Pending 2
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.totalCount, 5);
  assertEquals(plan.completedCount, 3);
});

Deno.test('parsePlan assigns correct phase to each task', () => {
  const content = `
## Alpha
- [ ] Task in Alpha

## Beta
- [ ] Task in Beta
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.tasks[0]?.phase, 'Alpha');
  assertEquals(plan.tasks[1]?.phase, 'Beta');
});

Deno.test('parsePlan handles empty phases', () => {
  const content = `
## Phase 1
- [ ] Task

## Phase 2

## Phase 3
- [ ] Another task
`.trim();

  const plan = parsePlan(content);

  // Empty phases are not added (only phases with tasks)
  assertEquals(plan.phases.length, 2);
  assertEquals(plan.phases[0]?.name, 'Phase 1');
  assertEquals(plan.phases[1]?.name, 'Phase 3');
});

Deno.test('parsePlan handles plan with only headers', () => {
  const content = `
## Phase 1
## Phase 2
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 0);
  assertEquals(plan.totalCount, 0);
});

Deno.test('parsePlan handles nested headers', () => {
  const content = `
## Main Phase
- [ ] Task 1

### Sub Phase
- [ ] Task 2
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 2);
  assertEquals(plan.phases[0]?.name, 'Main Phase');
  assertEquals(plan.phases[1]?.name, 'Sub Phase');
});

Deno.test('parsePlan handles mixed content', () => {
  const content = `
# Implementation Plan

Some intro text.

## Phase 1
- [ ] Task 1

More text between phases.

## Phase 2
- [ ] Task 2

Final text.
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.phases.length, 2);
  assertEquals(plan.totalCount, 2);
});

Deno.test('parsePlan preserves line numbers', () => {
  const content = `## Phase 1
- [ ] First task
- [ ] Second task`;

  const plan = parsePlan(content);

  assertEquals(plan.tasks[0]?.lineNumber, 2);
  assertEquals(plan.tasks[1]?.lineNumber, 3);
});

Deno.test('parsePlan flattens all tasks correctly', () => {
  const content = `
## Phase 1
- [ ] Task 1
- [x] Task 2

## Phase 2
- [ ] Task 3
`.trim();

  const plan = parsePlan(content);

  assertEquals(plan.tasks.length, 3);
  assertEquals(plan.tasks[0]?.text, 'Task 1');
  assertEquals(plan.tasks[1]?.text, 'Task 2');
  assertEquals(plan.tasks[2]?.text, 'Task 3');
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

Deno.test('getNextTask returns null for empty plan', () => {
  const plan = parsePlan('');
  assertEquals(getNextTask(plan), null);
});

Deno.test('getNextTask returns first task when none completed', () => {
  const content = `
- [ ] First
- [ ] Second
`.trim();

  const plan = parsePlan(content);
  const next = getNextTask(plan);

  assertEquals(next?.text, 'First');
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

Deno.test('getPendingTasks returns empty array when all done', () => {
  const content = `
- [x] Done 1
- [x] Done 2
`.trim();

  const plan = parsePlan(content);
  const pending = getPendingTasks(plan);

  assertEquals(pending.length, 0);
});

Deno.test('getPendingTasks returns empty array for empty plan', () => {
  const plan = parsePlan('');
  const pending = getPendingTasks(plan);

  assertEquals(pending.length, 0);
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

Deno.test('getCompletedTasks returns empty array when none done', () => {
  const content = `
- [ ] Pending 1
- [ ] Pending 2
`.trim();

  const plan = parsePlan(content);
  const completed = getCompletedTasks(plan);

  assertEquals(completed.length, 0);
});

Deno.test('getCompletedTasks returns empty array for empty plan', () => {
  const plan = parsePlan('');
  const completed = getCompletedTasks(plan);

  assertEquals(completed.length, 0);
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

Deno.test('isComplete returns false for empty plan', () => {
  const plan = parsePlan('');
  assertEquals(isComplete(plan), false);
});

Deno.test('isComplete returns false when none completed', () => {
  const content = `
- [ ] Pending 1
- [ ] Pending 2
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

Deno.test('getCompletionPercent returns 0 for empty plan', () => {
  const plan = parsePlan('');
  assertEquals(getCompletionPercent(plan), 0);
});

Deno.test('getCompletionPercent returns 100 when all done', () => {
  const content = `
- [x] Done 1
- [x] Done 2
`.trim();

  const plan = parsePlan(content);
  assertEquals(getCompletionPercent(plan), 100);
});

Deno.test('getCompletionPercent returns 0 when none done', () => {
  const content = `
- [ ] Pending 1
- [ ] Pending 2
`.trim();

  const plan = parsePlan(content);
  assertEquals(getCompletionPercent(plan), 0);
});

Deno.test('getCompletionPercent rounds correctly', () => {
  const content = `
- [x] Done
- [ ] Pending
- [ ] Pending
`.trim();

  const plan = parsePlan(content);
  // 1/3 = 33.33%, rounds to 33
  assertEquals(getCompletionPercent(plan), 33);
});

Deno.test('getCompletionPercent handles 50%', () => {
  const content = `
- [x] Done 1
- [x] Done 2
- [ ] Pending 1
- [ ] Pending 2
`.trim();

  const plan = parsePlan(content);
  assertEquals(getCompletionPercent(plan), 50);
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

Deno.test('markTaskComplete does not change already completed task', () => {
  const content = '- [x] Already done';
  const updated = markTaskComplete(content, 'Already done');

  // Task is already [x], should remain unchanged
  assertEquals(updated, '- [x] Already done');
});

Deno.test('markTaskComplete does not change unmatched tasks', () => {
  const content = '- [ ] Some task';
  const updated = markTaskComplete(content, 'Different task');

  assertEquals(updated, '- [ ] Some task');
});

Deno.test('markTaskComplete handles multiple matching patterns', () => {
  const content = `
- [ ] Task one
- [ ] Task
- [ ] Task two
`.trim();

  // Should only match "Task" exactly
  const updated = markTaskComplete(content, 'Task');

  assertEquals(updated.includes('- [ ] Task one'), true);
  assertEquals(updated.includes('- [x] Task'), true);
  assertEquals(updated.includes('- [ ] Task two'), true);
});

Deno.test('markTaskComplete preserves indentation', () => {
  const content = '  - [ ] Indented task';
  const updated = markTaskComplete(content, 'Indented task');

  assertEquals(updated, '  - [x] Indented task');
});

Deno.test('markTaskComplete handles task with special characters', () => {
  const content = '- [ ] Task with [spec: feature.md]';
  const updated = markTaskComplete(content, 'Task with [spec: feature.md]');

  assertEquals(updated, '- [x] Task with [spec: feature.md]');
});

Deno.test('addTask adds task at end without phase', () => {
  const content = '- [ ] Existing task';
  const updated = addTask(content, 'New task');

  assertEquals(updated.includes('- [ ] New task'), true);
  assertEquals(updated.endsWith('- [ ] New task'), true);
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

Deno.test('addTask creates new phase when not found', () => {
  const content = `
## Phase 1
- [ ] Task 1
`.trim();

  const updated = addTask(content, 'New task', 'Phase 2');

  assertEquals(updated.includes('## Phase 2'), true);
  assertEquals(updated.includes('- [ ] New task'), true);
});

Deno.test('addTask adds task to empty content', () => {
  const updated = addTask('', 'First task');

  assertEquals(updated, '\n- [ ] First task');
});

Deno.test('addTask adds task to phase with multiple tasks', () => {
  const content = `
## Phase 1
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Phase 2
- [ ] Task 4
`.trim();

  const updated = addTask(content, 'New task', 'Phase 1');

  const lines = updated.split('\n');
  const newTaskIndex = lines.findIndex((l) => l.includes('New task'));
  const phase2Index = lines.findIndex((l) => l.includes('Phase 2'));

  // New task should be before Phase 2
  assertEquals(newTaskIndex < phase2Index, true);
  // New task should be after task 3
  const task3Index = lines.findIndex((l) => l.includes('Task 3'));
  assertEquals(newTaskIndex > task3Index, true);
});

Deno.test('addTask handles phase at end of content', () => {
  const content = `
## Phase 1
- [ ] Task 1
`.trim();

  const updated = addTask(content, 'New task', 'Phase 1');

  assertEquals(updated.includes('- [ ] New task'), true);
});

Deno.test('addTask formats new task correctly', () => {
  const content = '## Phase 1';
  const updated = addTask(content, 'Test task', 'Phase 1');

  assertEquals(updated.includes('- [ ] Test task'), true);
});

Deno.test('addTask handles content with trailing newline', () => {
  const content = '- [ ] Task 1\n';
  const updated = addTask(content, 'Task 2');

  assertEquals(updated.includes('- [ ] Task 2'), true);
});

Deno.test('addTask to nested phase (###)', () => {
  const content = `
## Main Phase
- [ ] Task 1

### Sub Phase
- [ ] Task 2
`.trim();

  const updated = addTask(content, 'New task', 'Sub Phase');

  assertEquals(updated.includes('- [ ] New task'), true);
  const lines = updated.split('\n');
  const subPhaseIndex = lines.findIndex((l) => l.includes('Sub Phase'));
  const newTaskIndex = lines.findIndex((l) => l.includes('New task'));
  assertEquals(newTaskIndex > subPhaseIndex, true);
});
