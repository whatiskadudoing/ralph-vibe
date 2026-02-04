/**
 * @module tests/cli/work_parser_test
 *
 * Tests for cli/work_parser module.
 * Tests the pure parsing functions for work command.
 */

import { assertEquals, assertExists } from '@std/assert';
import {
  formatDurationSec,
  getNextTaskFromPhases,
  hasExitSignal,
  parsePlanPhases,
  parseRalphStatus,
  parseStatusBlock,
  type PhaseInfo,
} from '../../src/cli/work_parser.ts';

// ============================================================================
// parseRalphStatus Tests
// ============================================================================

Deno.test('parseRalphStatus parses status with code block', () => {
  const output = `
Some text before

RALPH_STATUS:
task: "Implement feature"
phase: 2
validation: pass
exit_signal: false
slc_complete: false
\`\`\`

Some text after
`;

  const status = parseRalphStatus(output);

  assertExists(status);
  assertEquals(status?.task, 'Implement feature');
  assertEquals(status?.phase, 2);
  assertEquals(status?.validation, 'pass');
  assertEquals(status?.exitSignal, false);
  assertEquals(status?.slcComplete, false);
});

Deno.test('parseRalphStatus parses status without code block', () => {
  const output = `
RALPH_STATUS:
task: Fix bug
phase: 1
validation: pass
exit_signal: true
slc_complete: true

Next section...
`;

  const status = parseRalphStatus(output);

  assertExists(status);
  assertEquals(status?.task, 'Fix bug');
  assertEquals(status?.phase, 1);
  assertEquals(status?.exitSignal, true);
  assertEquals(status?.slcComplete, true);
});

Deno.test('parseRalphStatus returns null for no status block', () => {
  const output = 'Just some regular output without any status';
  const status = parseRalphStatus(output);
  assertEquals(status, null);
});

Deno.test('parseRalphStatus handles snake_case keys', () => {
  // The parser converts all keys to lowercase, then checks for snake_case variants
  // e.g., 'exit_signal' becomes 'exit_signal', 'exitSignal' becomes 'exitsignal'
  // Only snake_case format (exit_signal, slc_complete) is properly detected
  const output = `
RALPH_STATUS:
task: Test task
exit_signal: true
slc_complete: true
\`\`\`
`;

  const status = parseRalphStatus(output);
  assertEquals(status?.exitSignal, true);
  assertEquals(status?.slcComplete, true);
});

Deno.test('parseRalphStatus defaults phase to 0', () => {
  const output = `
RALPH_STATUS:
task: No phase specified

`;

  const status = parseRalphStatus(output);
  assertEquals(status?.phase, 0);
});

Deno.test('parseRalphStatus defaults validation to fail', () => {
  const output = `
RALPH_STATUS:
task: No validation

`;

  const status = parseRalphStatus(output);
  assertEquals(status?.validation, 'fail');
});

// ============================================================================
// parseStatusBlock Tests
// ============================================================================

Deno.test('parseStatusBlock parses valid block', () => {
  const block = `
task: Build feature
phase: 3
validation: pass
exit_signal: false
`;

  const status = parseStatusBlock(block);

  assertExists(status);
  assertEquals(status?.task, 'Build feature');
  assertEquals(status?.phase, 3);
  assertEquals(status?.validation, 'pass');
});

Deno.test('parseStatusBlock strips quotes from values', () => {
  const block = `
task: "Quoted task"
phase: 1
`;

  const status = parseStatusBlock(block);
  assertEquals(status?.task, 'Quoted task');
});

Deno.test('parseStatusBlock strips single quotes', () => {
  const block = `
task: 'Single quoted'
phase: 2
`;

  const status = parseStatusBlock(block);
  assertEquals(status?.task, 'Single quoted');
});

Deno.test('parseStatusBlock returns null without task', () => {
  const block = `
phase: 1
validation: pass
`;

  const status = parseStatusBlock(block);
  assertEquals(status, null);
});

Deno.test('parseStatusBlock handles empty block', () => {
  const status = parseStatusBlock('');
  assertEquals(status, null);
});

Deno.test('parseStatusBlock handles whitespace only', () => {
  const status = parseStatusBlock('   \n   \n   ');
  assertEquals(status, null);
});

// ============================================================================
// hasExitSignal Tests
// ============================================================================

Deno.test('hasExitSignal detects EXIT_SIGNAL: true', () => {
  const output = 'Some output EXIT_SIGNAL: true more text';
  assertEquals(hasExitSignal(output), true);
});

Deno.test('hasExitSignal detects EXIT_SIGNAL:true (no space)', () => {
  const output = 'EXIT_SIGNAL:true';
  assertEquals(hasExitSignal(output), true);
});

Deno.test('hasExitSignal returns false for EXIT_SIGNAL: false', () => {
  const output = 'EXIT_SIGNAL: false';
  assertEquals(hasExitSignal(output), false);
});

Deno.test('hasExitSignal returns false for no signal', () => {
  const output = 'Just regular output';
  assertEquals(hasExitSignal(output), false);
});

// ============================================================================
// parsePlanPhases Tests
// ============================================================================

Deno.test('parsePlanPhases parses simple plan', () => {
  const content = `
# Implementation Plan

## Phase 1: Setup
- [x] Create project structure
- [ ] Add dependencies

## Phase 2: Core
- [ ] Implement main logic
- [ ] Add tests
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases.length, 2);
  assertEquals(phases[0]?.name, 'Phase 1: Setup');
  assertEquals(phases[0]?.tasks.length, 2);
  assertEquals(phases[0]?.tasks[0]?.checked, true);
  assertEquals(phases[0]?.tasks[0]?.text, 'Create project structure');
  assertEquals(phases[0]?.tasks[1]?.checked, false);
});

Deno.test('parsePlanPhases skips Future Work section', () => {
  const content = `
## Phase 1: Core
- [ ] Main task

## Future Work
- [ ] This should be skipped
- [ ] And this too

## Phase 2: Should not exist after Future Work
- [ ] Also skipped
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases.length, 1);
  assertEquals(phases[0]?.name, 'Phase 1: Core');
  assertEquals(phases[0]?.tasks.length, 1);
});

Deno.test('parsePlanPhases handles ### phase headers', () => {
  const content = `
### Phase 1.1: Sub-phase
- [ ] Task A
- [x] Task B
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases.length, 1);
  assertEquals(phases[0]?.name, 'Phase 1.1: Sub-phase');
});

Deno.test('parsePlanPhases handles indented tasks', () => {
  const content = `
## Phase 1
  - [ ] Indented task
    - [x] Deeply indented
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases[0]?.tasks.length, 2);
  assertEquals(phases[0]?.tasks[0]?.text, 'Indented task');
  assertEquals(phases[0]?.tasks[1]?.text, 'Deeply indented');
});

Deno.test('parsePlanPhases handles case-insensitive [X]', () => {
  const content = `
## Phase 1
- [X] Upper case X
- [x] Lower case x
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases[0]?.tasks[0]?.checked, true);
  assertEquals(phases[0]?.tasks[1]?.checked, true);
});

Deno.test('parsePlanPhases returns empty array for no phases', () => {
  const content = 'Just some text without phases';
  const phases = parsePlanPhases(content);
  assertEquals(phases.length, 0);
});

Deno.test('parsePlanPhases handles phase with no tasks', () => {
  const content = `
## Phase 1: Empty
Some description text

## Phase 2: Has tasks
- [ ] One task
`;

  const phases = parsePlanPhases(content);

  assertEquals(phases.length, 2);
  assertEquals(phases[0]?.tasks.length, 0);
  assertEquals(phases[1]?.tasks.length, 1);
});

// ============================================================================
// getNextTaskFromPhases Tests
// ============================================================================

Deno.test('getNextTaskFromPhases returns first unchecked in WIP phase', () => {
  const phases: PhaseInfo[] = [
    {
      name: 'Phase 1',
      tasks: [
        { checked: true, text: 'Done task' },
        { checked: false, text: 'Next task' },
        { checked: false, text: 'Future task' },
      ],
    },
    {
      name: 'Phase 2',
      tasks: [{ checked: false, text: 'Phase 2 task' }],
    },
  ];

  const next = getNextTaskFromPhases(phases);

  assertExists(next);
  assertEquals(next?.phase, 'Phase 1');
  assertEquals(next?.task, 'Next task');
});

Deno.test('getNextTaskFromPhases moves to next phase when previous complete', () => {
  const phases: PhaseInfo[] = [
    {
      name: 'Phase 1',
      tasks: [
        { checked: true, text: 'Done 1' },
        { checked: true, text: 'Done 2' },
      ],
    },
    {
      name: 'Phase 2',
      tasks: [{ checked: false, text: 'First in Phase 2' }],
    },
  ];

  const next = getNextTaskFromPhases(phases);

  assertEquals(next?.phase, 'Phase 2');
  assertEquals(next?.task, 'First in Phase 2');
});

Deno.test('getNextTaskFromPhases prioritizes WIP over sequential', () => {
  const phases: PhaseInfo[] = [
    {
      name: 'Phase 1',
      tasks: [{ checked: false, text: 'Phase 1 unchecked' }],
    },
    {
      name: 'Phase 2',
      tasks: [
        { checked: true, text: 'Phase 2 done' },
        { checked: false, text: 'Phase 2 WIP' },
      ],
    },
  ];

  const next = getNextTaskFromPhases(phases);

  // Should prioritize Phase 2 because it has WIP (both checked and unchecked)
  assertEquals(next?.phase, 'Phase 2');
  assertEquals(next?.task, 'Phase 2 WIP');
});

Deno.test('getNextTaskFromPhases returns null when all complete', () => {
  const phases: PhaseInfo[] = [
    {
      name: 'Phase 1',
      tasks: [{ checked: true, text: 'Done' }],
    },
  ];

  const next = getNextTaskFromPhases(phases);
  assertEquals(next, null);
});

Deno.test('getNextTaskFromPhases returns null for empty phases', () => {
  const phases: PhaseInfo[] = [];
  const next = getNextTaskFromPhases(phases);
  assertEquals(next, null);
});

Deno.test('getNextTaskFromPhases skips empty phases', () => {
  const phases: PhaseInfo[] = [
    { name: 'Phase 1', tasks: [] },
    { name: 'Phase 2', tasks: [{ checked: false, text: 'Task' }] },
  ];

  const next = getNextTaskFromPhases(phases);

  assertEquals(next?.phase, 'Phase 2');
  assertEquals(next?.task, 'Task');
});

Deno.test('getNextTaskFromPhases fallback to first unchecked anywhere', () => {
  // Phase 1 not complete, but Phase 2 has unchecked - should still find it
  const phases: PhaseInfo[] = [
    { name: 'Phase 1', tasks: [{ checked: false, text: 'Incomplete phase 1' }] },
  ];

  const next = getNextTaskFromPhases(phases);

  assertEquals(next?.phase, 'Phase 1');
  assertEquals(next?.task, 'Incomplete phase 1');
});

// ============================================================================
// formatDurationSec Tests
// ============================================================================

Deno.test('formatDurationSec formats seconds only', () => {
  assertEquals(formatDurationSec(0), '0ms');
  assertEquals(formatDurationSec(1), '1.0s');
  assertEquals(formatDurationSec(30), '30.0s');
  assertEquals(formatDurationSec(59), '59.0s');
});

Deno.test('formatDurationSec formats minutes and seconds', () => {
  assertEquals(formatDurationSec(60), '1m 0s');
  assertEquals(formatDurationSec(61), '1m 1s');
  assertEquals(formatDurationSec(90), '1m 30s');
  assertEquals(formatDurationSec(125), '2m 5s');
});

Deno.test('formatDurationSec handles large values', () => {
  assertEquals(formatDurationSec(3600), '1h 0m 0s');
  assertEquals(formatDurationSec(3661), '1h 1m 1s');
});
