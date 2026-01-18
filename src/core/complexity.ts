/**
 * @module core/complexity
 *
 * Task complexity assessment for adaptive model selection.
 * Uses heuristics to classify tasks as simple or complex,
 * allowing optimal model selection (Sonnet for simple, Opus for complex).
 */

// ============================================================================
// Types
// ============================================================================

export type Complexity = 'simple' | 'complex';

export interface ComplexityResult {
  readonly complexity: Complexity;
  readonly model: 'sonnet' | 'opus';
  readonly reason: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Keywords that indicate a simple task (Sonnet-appropriate).
 */
const SIMPLE_KEYWORDS = [
  // Typos and comments
  'fix typo',
  'add comment',
  'update comment',
  'rename',
  'remove unused',
  'update docs',
  'add docs',
  'fix lint',
  'cleanup',
  'polish',
  'update readme',
  'bump version',
  'add export',
  'fix import',
  'add type',
  // Tests - running tests is mechanical, doesn't need Opus
  'run test',
  'run tests',
  'execute test',
  'fix test',
  'update test',
  'add test',
  'write test',
  'test for',
];

/**
 * Keywords that indicate a complex task (Opus-appropriate).
 */
const COMPLEX_KEYWORDS = [
  'refactor',
  'redesign',
  'architect',
  'implement new',
  'create new',
  'design',
  'integrate',
  'migrate',
  'rewrite',
  'add feature',
  'implement feature',
  'api',
  'database',
  'authentication',
  'authorization',
  'security',
];

// ============================================================================
// Functions
// ============================================================================

/**
 * Assesses the complexity of a task description.
 *
 * Uses heuristics based on:
 * - Keywords (simple vs complex actions)
 * - Phase names (cleanup/testing vs core/architecture)
 * - Task length (short vs long descriptions)
 * - Multiple actions (compound tasks)
 * - Multiple files (cross-file changes)
 *
 * Defaults to complex (Opus) when uncertain - safer choice.
 *
 * @param task - The task description to assess
 * @param phase - Optional phase name for additional context
 * @returns ComplexityResult with model recommendation and reason
 */
export function assessComplexity(
  task: string,
  phase?: string | null,
): ComplexityResult {
  const taskLower = task.toLowerCase();
  const phaseLower = phase?.toLowerCase() ?? '';

  let simpleScore = 0;
  let complexScore = 0;
  const reasons: string[] = [];

  // Check simple keywords
  for (const kw of SIMPLE_KEYWORDS) {
    if (taskLower.includes(kw)) {
      simpleScore += 2;
      reasons.push(`"${kw}"`);
    }
  }

  // Check complex keywords
  for (const kw of COMPLEX_KEYWORDS) {
    if (taskLower.includes(kw)) {
      complexScore += 2;
      reasons.push(`"${kw}"`);
    }
  }

  // Check phase names (testing phases are simple - just running tests)
  if (/cleanup|polish|docs|testing|test/.test(phaseLower)) {
    simpleScore += 1;
  }
  if (/core|architecture|foundation/.test(phaseLower)) {
    complexScore += 1;
  }

  // Multiple actions = complex
  if (taskLower.includes(' and ') || (task.match(/,/g) || []).length >= 2) {
    complexScore += 1;
  }

  // Multiple files = complex
  if (/\[file:\s*[^,\]]+,/.test(task)) {
    complexScore += 1;
  }

  // Task length
  if (task.length < 50) {
    simpleScore += 1;
  }
  if (task.length > 150) {
    complexScore += 1;
  }

  // Default to complex if uncertain (safer choice)
  const complexity: Complexity = simpleScore > complexScore ? 'simple' : 'complex';

  return {
    complexity,
    model: complexity === 'simple' ? 'sonnet' : 'opus',
    reason: reasons.slice(0, 2).join(', ') || 'default',
  };
}
