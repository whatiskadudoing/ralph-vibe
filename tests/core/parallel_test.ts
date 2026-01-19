/**
 * @module tests/core/parallel_test
 *
 * Tests for core/parallel module.
 */

import { assertEquals } from '@std/assert';
import {
  parseTaskDependency,
  stripDependencyMetadata,
  DependencyGraph,
} from '../../src/core/parallel.ts';
import type { Task } from '../../src/core/plan.ts';

// ============================================================================
// parseTaskDependency tests
// ============================================================================

Deno.test('parseTaskDependency parses depends on single task', () => {
  const dep = parseTaskDependency('Add authentication [depends: 1]');

  assertEquals(dep.dependsOn, [1]);
  assertEquals(dep.parallelizable, false);
});

Deno.test('parseTaskDependency parses depends on multiple tasks', () => {
  const dep = parseTaskDependency('Final task [depends: 1, 2, 3]');

  assertEquals(dep.dependsOn, [1, 2, 3]);
  assertEquals(dep.parallelizable, false);
});

Deno.test('parseTaskDependency parses parallel flag true', () => {
  const dep = parseTaskDependency('Parallel task [parallel: true]');

  assertEquals(dep.dependsOn, []);
  assertEquals(dep.parallelizable, true);
});

Deno.test('parseTaskDependency parses parallel flag false', () => {
  const dep = parseTaskDependency('Sequential task [parallel: false]');

  assertEquals(dep.dependsOn, []);
  assertEquals(dep.parallelizable, false);
});

Deno.test('parseTaskDependency parses both depends and parallel', () => {
  // When depends is present, parallelizable should be false regardless
  const dep = parseTaskDependency('Task [depends: 1] [parallel: true]');

  assertEquals(dep.dependsOn, [1]);
  assertEquals(dep.parallelizable, false);
});

Deno.test('parseTaskDependency returns defaults for no metadata', () => {
  const dep = parseTaskDependency('Simple task without metadata');

  assertEquals(dep.dependsOn, []);
  assertEquals(dep.parallelizable, true);
});

Deno.test('parseTaskDependency handles case insensitive syntax', () => {
  const dep1 = parseTaskDependency('Task [DEPENDS: 1, 2]');
  const dep2 = parseTaskDependency('Task [Parallel: TRUE]');

  assertEquals(dep1.dependsOn, [1, 2]);
  assertEquals(dep2.parallelizable, true);
});

// ============================================================================
// stripDependencyMetadata tests
// ============================================================================

Deno.test('stripDependencyMetadata removes depends tag', () => {
  const result = stripDependencyMetadata('Add auth [depends: 1, 2]');

  assertEquals(result, 'Add auth');
});

Deno.test('stripDependencyMetadata removes parallel tag', () => {
  const result = stripDependencyMetadata('Task [parallel: true]');

  assertEquals(result, 'Task');
});

Deno.test('stripDependencyMetadata removes both tags', () => {
  const result = stripDependencyMetadata('Task [depends: 1] [parallel: true]');

  assertEquals(result, 'Task');
});

Deno.test('stripDependencyMetadata preserves non-metadata brackets', () => {
  const result = stripDependencyMetadata('Implement [Feature] API');

  assertEquals(result, 'Implement [Feature] API');
});

Deno.test('stripDependencyMetadata trims whitespace', () => {
  const result = stripDependencyMetadata('  Task [depends: 1]  ');

  assertEquals(result, 'Task');
});

// ============================================================================
// DependencyGraph tests
// ============================================================================

function createTask(text: string, status: 'pending' | 'completed' = 'pending'): Task {
  return { text, status, lineNumber: 1 };
}

Deno.test('DependencyGraph initializes with tasks', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [parallel: true]'),
    createTask('Task 3 [depends: 1, 2]'),
  ];

  const graph = new DependencyGraph(tasks);
  const allTasks = graph.getAllTasks();

  assertEquals(allTasks.length, 3);
  assertEquals(allTasks[0]?.id, 1);
  assertEquals(allTasks[1]?.id, 2);
  assertEquals(allTasks[2]?.id, 3);
});

Deno.test('DependencyGraph marks independent tasks as ready', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [parallel: true]'),
  ];

  const graph = new DependencyGraph(tasks);
  const ready = graph.getReadyTasks();

  assertEquals(ready.length, 2);
});

Deno.test('DependencyGraph respects dependencies', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [depends: 1]'),
  ];

  const graph = new DependencyGraph(tasks);
  const ready = graph.getReadyTasks();

  // Only task 1 should be ready initially
  assertEquals(ready.length, 1);
  assertEquals(ready[0]?.id, 1);
});

Deno.test('DependencyGraph updates ready tasks when dependency completes', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [depends: 1]'),
  ];

  const graph = new DependencyGraph(tasks);

  // Claim and complete task 1
  const task1 = graph.claimTask(1);
  assertEquals(task1?.id, 1);

  graph.completeTask(1, {
    success: true,
    duration: 10,
    inputTokens: 100,
    outputTokens: 50,
    modelUsed: 'opus',
  });

  // Now task 2 should be ready
  const ready = graph.getReadyTasks();
  assertEquals(ready.length, 1);
  assertEquals(ready[0]?.id, 2);
});

Deno.test('DependencyGraph marks dependent tasks as blocked when dependency fails', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [depends: 1]'),
  ];

  const graph = new DependencyGraph(tasks);

  // Claim and fail task 1
  graph.claimTask(1);
  graph.completeTask(1, {
    success: false,
    error: 'Failed',
    duration: 5,
    inputTokens: 50,
    outputTokens: 25,
    modelUsed: 'opus',
  });

  // Task 2 should be blocked
  const task2 = graph.getTask(2);
  assertEquals(task2?.status, 'blocked');
});

Deno.test('DependencyGraph getStats returns correct counts', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
    createTask('Task 2 [parallel: true]'),
    createTask('Task 3 [depends: 1, 2]'),
  ];

  const graph = new DependencyGraph(tasks);
  const stats = graph.getStats();

  assertEquals(stats.total, 3);
  assertEquals(stats.ready, 2);
  assertEquals(stats.pending, 1); // Task 3 is pending (waiting on deps)
});

Deno.test('DependencyGraph isComplete returns true when all done', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
  ];

  const graph = new DependencyGraph(tasks);

  assertEquals(graph.isComplete(), false);

  graph.claimTask(1);
  graph.completeTask(1, {
    success: true,
    duration: 10,
    inputTokens: 100,
    outputTokens: 50,
    modelUsed: 'opus',
  });

  assertEquals(graph.isComplete(), true);
});

Deno.test('DependencyGraph hasDeadlock detects circular dependencies', () => {
  // This tests the deadlock detection when no tasks can make progress
  const tasks = [
    createTask('Task 1 [depends: 2]'),
    createTask('Task 2 [depends: 1]'),
  ];

  const graph = new DependencyGraph(tasks);

  // Both tasks depend on each other, so neither should be ready
  assertEquals(graph.getReadyTasks().length, 0);
  assertEquals(graph.hasDeadlock(), true);
});

Deno.test('DependencyGraph claimTask marks task as running', () => {
  const tasks = [
    createTask('Task 1 [parallel: true]'),
  ];

  const graph = new DependencyGraph(tasks);
  const claimed = graph.claimTask(1);

  assertEquals(claimed?.status, 'running');
  assertEquals(claimed?.workerId, 1);
});

Deno.test('DependencyGraph claimTask returns null when no ready tasks', () => {
  const tasks = [
    createTask('Task 1 [depends: 2]'),
  ];

  const graph = new DependencyGraph(tasks);
  const claimed = graph.claimTask(1);

  assertEquals(claimed, null);
});
