/**
 * @module cli/work_parser
 *
 * Pure parsing functions for work command output.
 * Extracted for testability.
 */

import { formatDuration } from '@/utils/formatting.ts';

// ============================================================================
// Types
// ============================================================================

export interface RalphStatus {
  readonly task: string;
  readonly phase: number;
  readonly validation: 'pass' | 'fail';
  readonly exitSignal: boolean;
  readonly slcComplete: boolean;
}

export interface NextTask {
  readonly phase: string | null;
  readonly task: string;
}

export interface PhaseInfo {
  readonly name: string;
  readonly tasks: Array<{ checked: boolean; text: string }>;
}

// ============================================================================
// Status Parsing
// ============================================================================

/**
 * Parses RALPH_STATUS block from Claude's output.
 * Pure function - no side effects.
 */
export function parseRalphStatus(output: string): RalphStatus | null {
  const statusMatch = output.match(/RALPH_STATUS:\s*\n([\s\S]*?)```/);
  if (!statusMatch) {
    // Try alternate format without code block
    const altMatch = output.match(/RALPH_STATUS:\s*\n([\s\S]*?)(?:\n\n|$)/);
    if (!altMatch) return null;
    return parseStatusBlock(altMatch[1] ?? '');
  }
  return parseStatusBlock(statusMatch[1] ?? '');
}

/**
 * Parses the content of a status block.
 */
export function parseStatusBlock(block: string): RalphStatus | null {
  const lines = block.trim().split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1]?.toLowerCase() ?? '';
      const value = match[2]?.trim().replace(/^["']|["']$/g, '') ?? '';
      data[key] = value;
    }
  }

  if (!data.task) return null;

  return {
    task: data.task,
    phase: parseInt(data.phase ?? '0', 10),
    validation: data.validation === 'pass' ? 'pass' : 'fail',
    exitSignal: data.exit_signal === 'true' || data.exitSignal === 'true',
    slcComplete: data.slc_complete === 'true' || data.slcComplete === 'true',
  };
}

/**
 * Checks for EXIT_SIGNAL in output (fallback if status block not found).
 */
export function hasExitSignal(output: string): boolean {
  return output.includes('EXIT_SIGNAL: true') || output.includes('EXIT_SIGNAL:true');
}

// ============================================================================
// Plan Parsing
// ============================================================================

/**
 * Parses phases from implementation plan content.
 * Returns an array of phases with their tasks.
 */
export function parsePlanPhases(content: string): PhaseInfo[] {
  const lines = content.split('\n');
  const phases: PhaseInfo[] = [];
  let currentPhase: { name: string; tasks: Array<{ checked: boolean; text: string }> } | null =
    null;
  let inFutureWork = false;

  for (const line of lines) {
    // Skip Future Work section entirely
    if (/^#{2,3}\s*Future\s*Work/i.test(line)) {
      inFutureWork = true;
      continue;
    }
    if (inFutureWork) continue;

    // Match phase header: ## Phase N or ## Phase N.M or ### Phase N: Title
    const phaseMatch = line.match(/^#{2,3}\s*(Phase\s*[\d.]+[^#\n]*)/i);
    if (phaseMatch && phaseMatch[1]) {
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        name: phaseMatch[1].trim(),
        tasks: [],
      };
      continue;
    }

    // Match tasks (checked or unchecked)
    if (currentPhase) {
      const checkedMatch = line.match(/^[\s]*-\s*\[x\]\s*(.+)$/i);
      const uncheckedMatch = line.match(/^[\s]*-\s*\[\s*\]\s*(.+)$/);

      if (checkedMatch && checkedMatch[1]) {
        currentPhase.tasks.push({ checked: true, text: checkedMatch[1].trim() });
      } else if (uncheckedMatch && uncheckedMatch[1]) {
        currentPhase.tasks.push({ checked: false, text: uncheckedMatch[1].trim() });
      }
    }
  }

  // Add last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

/**
 * Gets the next unchecked task from parsed phases.
 * Uses smart detection to find the most likely "current" task:
 * 1. Prioritize phases with work-in-progress (has both checked and unchecked)
 * 2. Fall back to first unchecked task in sequential flow
 */
export function getNextTaskFromPhases(phases: PhaseInfo[]): NextTask | null {
  // Priority 1: Find phase with work-in-progress (has both checked and unchecked)
  for (const phase of phases) {
    const hasChecked = phase.tasks.some((t) => t.checked);
    const uncheckedTask = phase.tasks.find((t) => !t.checked);
    if (hasChecked && uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
    }
  }

  // Priority 2: First phase with unchecked tasks where previous phases are complete
  let previousComplete = true;
  for (const phase of phases) {
    const allChecked = phase.tasks.length > 0 && phase.tasks.every((t) => t.checked);
    const uncheckedTask = phase.tasks.find((t) => !t.checked);

    if (previousComplete && uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
    }

    previousComplete = allChecked || phase.tasks.length === 0;
  }

  // Priority 3: Fallback - first unchecked task anywhere
  for (const phase of phases) {
    const uncheckedTask = phase.tasks.find((t) => !t.checked);
    if (uncheckedTask) {
      return { phase: phase.name, task: uncheckedTask.text };
    }
  }

  return null;
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Wrapper for formatDuration that takes seconds instead of milliseconds.
 * Re-exported for backward compatibility.
 */
export function formatDurationSec(seconds: number): string {
  return formatDuration(seconds * 1000);
}

// Re-export formatDuration for any external consumers that import it from here
export { formatDuration } from '@/utils/formatting.ts';
