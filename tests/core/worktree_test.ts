/**
 * @module tests/core/worktree_test
 *
 * Tests for core/worktree module.
 */

import { assertEquals } from '@std/assert';
import { generateWorkerBranchName, getWorkerWorktreePath } from '../../src/core/worktree.ts';

// ============================================================================
// generateWorkerBranchName tests
// ============================================================================

Deno.test('generateWorkerBranchName generates valid branch name', () => {
  const branchName = generateWorkerBranchName(1);

  assertEquals(branchName.startsWith('ralph-parallel-'), true);
  assertEquals(branchName.endsWith('-worker-1'), true);
});

Deno.test('generateWorkerBranchName includes worker id', () => {
  const branch1 = generateWorkerBranchName(1);
  const branch2 = generateWorkerBranchName(2);
  const branch5 = generateWorkerBranchName(5);

  assertEquals(branch1.endsWith('-worker-1'), true);
  assertEquals(branch2.endsWith('-worker-2'), true);
  assertEquals(branch5.endsWith('-worker-5'), true);
});

Deno.test('generateWorkerBranchName generates unique timestamps', async () => {
  const branch1 = generateWorkerBranchName(1);
  await new Promise((resolve) => setTimeout(resolve, 2));
  const branch2 = generateWorkerBranchName(1);

  // The timestamps should be different
  assertEquals(branch1 !== branch2, true);
});

// ============================================================================
// getWorkerWorktreePath tests
// ============================================================================

Deno.test('getWorkerWorktreePath generates correct path', () => {
  const path = getWorkerWorktreePath('.ralph-workers', 1);

  assertEquals(path, '.ralph-workers/worker-1');
});

Deno.test('getWorkerWorktreePath handles different base dirs', () => {
  const path1 = getWorkerWorktreePath('.worktrees', 1);
  const path2 = getWorkerWorktreePath('/tmp/workers', 3);

  assertEquals(path1, '.worktrees/worker-1');
  assertEquals(path2, '/tmp/workers/worker-3');
});

Deno.test('getWorkerWorktreePath handles different worker ids', () => {
  const base = '.ralph-workers';

  assertEquals(getWorkerWorktreePath(base, 1), '.ralph-workers/worker-1');
  assertEquals(getWorkerWorktreePath(base, 2), '.ralph-workers/worker-2');
  assertEquals(getWorkerWorktreePath(base, 8), '.ralph-workers/worker-8');
});
