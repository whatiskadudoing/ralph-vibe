/**
 * @module core/plan
 *
 * Plan parsing and manipulation utilities.
 * All functions are pure - no I/O operations.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Status of a task in the plan.
 */
export type TaskStatus = 'pending' | 'completed';

/**
 * A single task extracted from the plan.
 */
export interface Task {
  /** The task description. */
  readonly text: string;
  /** Whether the task is completed. */
  readonly status: TaskStatus;
  /** The phase this task belongs to (if any). */
  readonly phase?: string;
  /** Line number in the original file (1-indexed). */
  readonly lineNumber: number;
}

/**
 * A phase/section in the plan.
 */
export interface Phase {
  /** Phase name/title. */
  readonly name: string;
  /** Tasks in this phase. */
  readonly tasks: readonly Task[];
}

/**
 * Parsed plan structure.
 */
export interface Plan {
  /** All phases in the plan. */
  readonly phases: readonly Phase[];
  /** All tasks (flattened). */
  readonly tasks: readonly Task[];
  /** Count of completed tasks. */
  readonly completedCount: number;
  /** Total task count. */
  readonly totalCount: number;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parses a task line and extracts the task info.
 * Returns null if the line is not a valid task.
 *
 * Supported formats:
 * - [ ] Task description
 * - [x] Completed task
 * - [X] Completed task
 */
export function parseTaskLine(
  line: string,
  lineNumber: number,
  currentPhase?: string,
): Task | null {
  const trimmed = line.trim();

  // Match checkbox pattern
  const match = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
  if (!match) {
    return null;
  }

  const checkbox = match[1];
  const text = match[2];

  if (text === undefined) {
    return null;
  }

  const status: TaskStatus = checkbox === ' ' ? 'pending' : 'completed';

  const task: Task = {
    text: text.trim(),
    status,
    lineNumber,
  };

  // Only add phase if it's defined
  if (currentPhase !== undefined) {
    return { ...task, phase: currentPhase };
  }

  return task;
}

/**
 * Parses a phase header line.
 * Returns the phase name or null if not a header.
 *
 * Supported formats:
 * - ## Phase Name
 * - ### Phase Name
 */
export function parsePhaseHeader(line: string): string | null {
  const trimmed = line.trim();

  // Match markdown header (## or ###)
  const match = trimmed.match(/^#{2,3}\s+(.+)$/);
  if (!match || match[1] === undefined) {
    return null;
  }

  return match[1].trim();
}

/**
 * Parses a plan markdown file into a structured Plan object.
 * Pure function - takes string content, returns parsed plan.
 */
export function parsePlan(content: string): Plan {
  const lines = content.split('\n');
  const phases: Phase[] = [];
  const allTasks: Task[] = [];

  let currentPhaseName: string | undefined;
  let currentPhaseTasks: Task[] = [];

  const finishCurrentPhase = (): void => {
    if (currentPhaseName && currentPhaseTasks.length > 0) {
      phases.push({
        name: currentPhaseName,
        tasks: [...currentPhaseTasks],
      });
    }
    currentPhaseTasks = [];
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for phase header
    const phaseName = parsePhaseHeader(line);
    if (phaseName) {
      finishCurrentPhase();
      currentPhaseName = phaseName;
      return;
    }

    // Check for task
    const task = parseTaskLine(line, lineNumber, currentPhaseName);
    if (task) {
      currentPhaseTasks.push(task);
      allTasks.push(task);
    }
  });

  // Don't forget the last phase
  finishCurrentPhase();

  // Handle tasks without a phase (orphan tasks)
  const orphanTasks = allTasks.filter((t) => !t.phase);
  if (orphanTasks.length > 0 && phases.length === 0) {
    phases.push({
      name: 'Tasks',
      tasks: orphanTasks,
    });
  }

  const completedCount = allTasks.filter((t) => t.status === 'completed').length;

  return {
    phases,
    tasks: allTasks,
    completedCount,
    totalCount: allTasks.length,
  };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Gets the next pending task from the plan.
 * Returns null if all tasks are completed.
 */
export function getNextTask(plan: Plan): Task | null {
  return plan.tasks.find((t) => t.status === 'pending') ?? null;
}

/**
 * Gets all pending tasks from the plan.
 */
export function getPendingTasks(plan: Plan): readonly Task[] {
  return plan.tasks.filter((t) => t.status === 'pending');
}

/**
 * Gets all completed tasks from the plan.
 */
export function getCompletedTasks(plan: Plan): readonly Task[] {
  return plan.tasks.filter((t) => t.status === 'completed');
}

/**
 * Checks if all tasks in the plan are completed.
 */
export function isComplete(plan: Plan): boolean {
  return plan.totalCount > 0 && plan.completedCount === plan.totalCount;
}

/**
 * Calculates the completion percentage.
 */
export function getCompletionPercent(plan: Plan): number {
  if (plan.totalCount === 0) return 0;
  return Math.round((plan.completedCount / plan.totalCount) * 100);
}

// ============================================================================
// Modification Functions
// ============================================================================

/**
 * Marks a task as completed in the plan content.
 * Returns the updated content string.
 *
 * @param content - The original plan content
 * @param taskText - The text of the task to mark complete
 */
export function markTaskComplete(content: string, taskText: string): string {
  const lines = content.split('\n');

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    // Match the specific task
    if (trimmed.includes(`[ ] ${taskText}`) || trimmed.includes(`[ ]${taskText}`)) {
      return line.replace('[ ]', '[x]');
    }
    return line;
  });

  return updatedLines.join('\n');
}

/**
 * Adds a new task to the plan content.
 * Adds to the specified phase or at the end if no phase specified.
 */
export function addTask(
  content: string,
  taskText: string,
  phaseName?: string,
): string {
  const newTask = `- [ ] ${taskText}`;
  const lines = content.split('\n');

  if (!phaseName) {
    // Add at the end
    return [...lines, newTask].join('\n');
  }

  // Find the phase and add after it
  let insertIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const header = parsePhaseHeader(line);
    if (header === phaseName) {
      // Find the end of this phase's tasks
      insertIndex = i + 1;
      while (insertIndex < lines.length) {
        const nextLine = lines[insertIndex];
        if (nextLine === undefined) break;
        // Stop at next header or empty line followed by header
        if (nextLine.trim().startsWith('#')) break;
        insertIndex++;
      }
      break;
    }
  }

  if (insertIndex === -1) {
    // Phase not found, add at end with new phase
    return [...lines, '', `## ${phaseName}`, newTask].join('\n');
  }

  lines.splice(insertIndex, 0, newTask);
  return lines.join('\n');
}
