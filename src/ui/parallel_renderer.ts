/**
 * @module ui/parallel_renderer
 *
 * Vertical terminal UI for parallel execution mode.
 * Renders worker panels as full-width boxes, matching the regular iteration style.
 */

import {
  amber,
  bold,
  dim,
  error as errorColor,
  muted,
  orange,
  success as successColor,
  visibleLength,
} from './colors.ts';
import { BOX, BOX_ROUNDED, CHECK, SPINNER_DOTS } from './symbols.ts';
import type { ParallelSummary, Worker, WorkerState } from '@/core/parallel.ts';

// ============================================================================
// Types
// ============================================================================

export interface WorkerPanel {
  /** Worker ID */
  workerId: number;
  /** Current state */
  state: WorkerState;
  /** Current task description */
  currentTask?: string;
  /** Current task number (1-indexed) */
  currentTaskNumber: number;
  /** Total tasks assigned to this worker */
  totalTasks: number;
  /** Recent tool calls */
  recentTools: string[];
  /** Tasks completed */
  tasksCompleted: number;
  /** Tasks failed */
  tasksFailed: number;
  /** Current status message */
  status: string;
}

export interface GlobalStatus {
  tasksTotal: number;
  completed: number;
  failed: number;
  running: number;
  elapsedTime: number;
}

export interface ParallelRendererOptions {
  /** Number of workers */
  workerCount: number;
  /** Terminal width (auto-detected if not provided) */
  terminalWidth?: number;
}

// ============================================================================
// Constants
// ============================================================================

const ROUNDED = BOX_ROUNDED;
const MAX_TOOLS_PER_WORKER = 5;

// Tool icons (matching Claude renderer)
const TOOL_ICONS: Record<string, string> = {
  Read: '○',
  Write: '●',
  Edit: '●',
  Bash: '⚡',
  Glob: '◎',
  Grep: '◎',
  Task: '◈',
  TodoWrite: '◈',
  WebFetch: '◎',
  WebSearch: '◎',
  NotebookEdit: '●',
  AskUserQuestion: '?',
};

// State indicators
const STATE_ICONS: Record<WorkerState, string> = {
  idle: '○',
  initializing: '◐',
  running: '●',
  merging: '◐',
  error: '✗',
  done: '✓',
};

const STATE_COLORS: Record<WorkerState, (s: string) => string> = {
  idle: dim,
  initializing: amber,
  running: orange,
  merging: amber,
  error: errorColor,
  done: successColor,
};

// ============================================================================
// Utility Functions
// ============================================================================

function getTerminalWidth(): number {
  try {
    const { columns } = Deno.consoleSize();
    return Math.max(60, columns);
  } catch {
    return 100;
  }
}

// ============================================================================
// Parallel Renderer
// ============================================================================

/**
 * Renders a vertical terminal UI for parallel execution.
 * Each worker gets a full-width box matching the regular iteration style.
 */
export class ParallelRenderer {
  private workerCount: number;
  private terminalWidth: number;
  private boxWidth: number;
  private contentWidth: number;
  private panels: WorkerPanel[];
  private globalStatus: GlobalStatus;
  private startTime: number;
  private frameIndex: number;
  private intervalId: number | null;
  private initialized: boolean;
  private fixedHeight: number;

  // Each worker box:
  // - Top border (1)
  // - [Worker N] Title (1)
  // - Task description (1)
  // - Empty line (1)
  // - Spinner line (1)
  // - Separator (1)
  // - Tools (MAX_TOOLS_PER_WORKER = 5)
  // - Bottom border (1)
  // Total: 12 lines per worker
  private readonly workerBoxHeight = 12;

  constructor(options: ParallelRendererOptions) {
    this.workerCount = options.workerCount;
    this.terminalWidth = options.terminalWidth ?? getTerminalWidth();
    this.boxWidth = this.terminalWidth - 2;
    this.contentWidth = this.boxWidth - 4;
    this.panels = [];
    this.globalStatus = { tasksTotal: 0, completed: 0, failed: 0, running: 0, elapsedTime: 0 };
    this.startTime = Date.now();
    this.frameIndex = 0;
    this.intervalId = null;
    this.initialized = false;

    // Header (3) + workers (12 each) + footer (2)
    this.fixedHeight = 3 + (this.workerCount * this.workerBoxHeight) + 2;

    // Initialize panels
    for (let i = 1; i <= this.workerCount; i++) {
      this.panels.push({
        workerId: i,
        state: 'idle',
        currentTask: undefined,
        currentTaskNumber: 0,
        totalTasks: 0,
        recentTools: [],
        tasksCompleted: 0,
        tasksFailed: 0,
        status: 'Waiting...',
      });
    }
  }

  /**
   * Starts the renderer and begins the animation loop.
   */
  start(): void {
    this.startTime = Date.now();
    this.frameIndex = 0;
    this.initialized = false;

    // Allocate fixed space
    for (let i = 0; i < this.fixedHeight; i++) {
      console.log('');
    }
    this.initialized = true;

    this.render();
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_DOTS.length;
      this.globalStatus.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      this.render();
    }, 100);
  }

  /**
   * Stops the renderer.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.initialized) return;

    // Clear the render area
    const encoder = new TextEncoder();
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.fixedHeight}A`));
    for (let i = 0; i < this.fixedHeight; i++) {
      Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
    }
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.fixedHeight}A`));
  }

  /**
   * Updates a worker's state from a Worker object.
   */
  updateWorker(worker: Worker): void {
    const panel = this.panels.find((p) => p.workerId === worker.id);
    if (!panel) return;

    panel.state = worker.state;
    panel.currentTask = worker.currentTask?.displayText;
    panel.tasksCompleted = worker.stats.tasksCompleted;
    panel.tasksFailed = worker.stats.tasksFailed;

    // Update task numbers and status
    if (worker.currentTask) {
      panel.currentTaskNumber = panel.tasksCompleted + 1;
      panel.status = 'Implementing...';
    } else if (worker.state === 'merging') {
      panel.status = 'Merging changes...';
    } else if (worker.state === 'done') {
      panel.status = 'Complete';
    } else if (worker.state === 'error') {
      panel.status = 'Error';
    } else {
      panel.status = 'Waiting...';
    }

    this.render();
  }

  /**
   * Adds a tool call to a worker's panel.
   */
  addToolCall(workerId: number, tool: string): void {
    const panel = this.panels.find((p) => p.workerId === workerId);
    if (!panel) return;

    panel.recentTools.push(tool);
    if (panel.recentTools.length > MAX_TOOLS_PER_WORKER) {
      panel.recentTools.shift();
    }

    this.render();
  }

  /**
   * Updates the global status.
   */
  updateStatus(status: Partial<GlobalStatus>): void {
    this.globalStatus = { ...this.globalStatus, ...status };

    // Distribute tasks to workers for display
    if (status.tasksTotal !== undefined) {
      const tasksPerWorker = Math.ceil(status.tasksTotal / this.workerCount);
      for (const panel of this.panels) {
        panel.totalTasks = tasksPerWorker;
      }
    }

    this.render();
  }

  /**
   * Main render function.
   */
  private render(): void {
    if (!this.initialized) return;

    const encoder = new TextEncoder();

    // Move cursor to top of render area
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.fixedHeight}A`));

    // Render header
    this.renderHeader(encoder);

    // Render each worker box
    for (const panel of this.panels) {
      this.renderWorkerBox(panel, encoder);
    }

    // Render footer
    this.renderFooter(encoder);
  }

  private renderHeader(encoder: TextEncoder): void {
    const elapsed = this.formatDuration(this.globalStatus.elapsedTime);
    const frame = this.globalStatus.running > 0
      ? orange(SPINNER_DOTS[this.frameIndex] ?? '◆')
      : dim('◆');

    // Header line (no box, just info)
    const header = `${frame} ${bold('Ralph Parallel Mode')} · ${
      this.workerCount
    } workers · Tasks: ${successColor(String(this.globalStatus.completed))}/${
      this.globalStatus.tasksTotal
    } · ${dim(elapsed)}`;
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${header}\n`));

    // Empty line
    Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
    Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
  }

  private renderWorkerBox(panel: WorkerPanel, encoder: TextEncoder): void {
    const stateColor = STATE_COLORS[panel.state];
    const stateIcon = STATE_ICONS[panel.state];

    // Determine border color based on state
    let borderColor: (s: string) => string;
    switch (panel.state) {
      case 'running':
        borderColor = orange;
        break;
      case 'merging':
        borderColor = amber;
        break;
      case 'done':
        borderColor = successColor;
        break;
      case 'error':
        borderColor = errorColor;
        break;
      default:
        borderColor = dim;
    }

    // Line 0: Top border
    const topBorder = borderColor(
      BOX.topLeft + BOX.horizontal.repeat(this.boxWidth - 2) + BOX.topRight,
    );
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${topBorder}\n`));

    // Line 1: [Worker N] Title with task count
    const taskCount = panel.totalTasks > 0
      ? ` · Task ${panel.currentTaskNumber}/${panel.totalTasks}`
      : '';
    const completedStr = panel.tasksCompleted > 0
      ? ` · ${successColor(CHECK)} ${panel.tasksCompleted} done`
      : '';
    const failedStr = panel.tasksFailed > 0
      ? ` · ${errorColor('✗')} ${panel.tasksFailed} fail`
      : '';
    const titleLine = `${amber(`[Worker ${panel.workerId}]`)} ${
      stateColor(stateIcon)
    } ${this.getStateLabel(panel.state)}${taskCount}${completedStr}${failedStr}`;
    this.renderContentLine(titleLine, borderColor, encoder);

    // Line 2: Task description
    const taskDesc = panel.currentTask
      ? dim(this.truncate(panel.currentTask, this.contentWidth))
      : dim('No task assigned');
    this.renderContentLine(taskDesc, borderColor, encoder);

    // Line 3: Empty
    this.renderContentLine('', borderColor, encoder);

    // Line 4: Spinner/status line
    const frame = panel.state === 'running' || panel.state === 'merging'
      ? orange(SPINNER_DOTS[this.frameIndex] ?? '◆')
      : dim('◆');
    const statusLine = `${frame} ${this.truncate(panel.status, this.contentWidth - 4)}`;
    this.renderContentLine(statusLine, borderColor, encoder);

    // Line 5: Separator
    this.renderContentLine(dim('│'), borderColor, encoder);

    // Lines 6-10: Tool slots
    for (let i = 0; i < MAX_TOOLS_PER_WORKER; i++) {
      const tool = panel.recentTools[i];
      if (tool) {
        const formatted = this.formatTool(tool, this.contentWidth - 4);
        this.renderContentLine(`${dim('│')}  ${formatted}`, borderColor, encoder);
      } else {
        this.renderContentLine(dim('│'), borderColor, encoder);
      }
    }

    // Line 11: Bottom border
    const bottomBorder = borderColor(
      BOX.bottomLeft + BOX.horizontal.repeat(this.boxWidth - 2) + BOX.bottomRight,
    );
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${bottomBorder}\n`));
  }

  private renderContentLine(
    content: string,
    borderColor: (s: string) => string,
    encoder: TextEncoder,
  ): void {
    const visLen = visibleLength(content);
    let finalContent = content;
    if (visLen > this.contentWidth) {
      finalContent = this.truncate(content, this.contentWidth);
    }
    const padding = ' '.repeat(Math.max(0, this.contentWidth - visibleLength(finalContent)));
    const line = `${borderColor(BOX.vertical)} ${finalContent}${padding} ${
      borderColor(BOX.vertical)
    }`;
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${line}\n`));
  }

  private renderFooter(encoder: TextEncoder): void {
    const status = this.globalStatus.failed > 0
      ? `${errorColor(`${this.globalStatus.failed} failed`)} · ${dim('Press Ctrl+C to stop')}`
      : dim('Press Ctrl+C to stop');
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K\n`));
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${status}\n`));
  }

  private formatTool(toolDisplay: string, maxWidth: number): string {
    const colonIndex = toolDisplay.indexOf(':');
    let toolName: string;
    let detail: string;

    if (colonIndex > 0) {
      toolName = toolDisplay.slice(0, colonIndex);
      detail = toolDisplay.slice(colonIndex + 1).trim();
    } else {
      toolName = toolDisplay;
      detail = '';
    }

    const icon = TOOL_ICONS[toolName] ?? '◆';

    if (detail) {
      const truncatedDetail = this.truncate(detail, maxWidth - toolName.length - 5);
      return `${amber(icon)} ${dim(toolName + ':')} ${muted(truncatedDetail)}`;
    }
    return `${amber(icon)} ${muted(toolName)}`;
  }

  private getStateLabel(state: WorkerState): string {
    const labels: Record<WorkerState, string> = {
      idle: 'Idle',
      initializing: 'Initializing',
      running: 'Running',
      merging: 'Merging',
      error: 'Error',
      done: 'Done',
    };
    return labels[state];
  }

  private truncate(str: string, maxLen: number): string {
    if (maxLen < 4) return '...';
    if (visibleLength(str) <= maxLen) return str;

    let result = '';
    let len = 0;
    for (const char of str) {
      if (len >= maxLen - 3) {
        result += '...';
        break;
      }
      result += char;
      if (char !== '\x1b' && !result.endsWith('m')) {
        len++;
      }
    }
    return result;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${
        String(secs).padStart(2, '0')
      }`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // ============================================================================
  // Summary Rendering
  // ============================================================================

  /**
   * Renders the final summary box after parallel execution completes.
   */
  renderSummary(summary: ParallelSummary): void {
    const width = this.boxWidth - 2;

    console.log();

    // Top border
    console.log(orange(ROUNDED.topLeft + ROUNDED.horizontal.repeat(width) + ROUNDED.topRight));

    // Title
    this.renderSummaryLine(`${successColor(CHECK)} ${bold('Parallel Work Complete')}`, width);

    // Separator
    console.log(orange(BOX.teeRight + ROUNDED.horizontal.repeat(width) + BOX.teeLeft));

    // Empty line
    this.renderSummaryLine('', width);

    // Stats
    const sequentialEstimate = summary.totalDuration * summary.workers.length;
    this.renderSummaryLine(
      `${dim('Workers:')} ${summary.workers.length} parallel instances`,
      width,
    );
    this.renderSummaryLine(
      `${dim('Duration:')} ${this.formatDurationLong(summary.totalDuration)} ${
        dim(`(vs ~${this.formatDurationLong(sequentialEstimate)} sequential)`)
      }`,
      width,
    );
    this.renderSummaryLine(
      `${dim('Tasks:')} ${successColor(String(summary.tasksCompleted))} completed, ${
        summary.tasksFailed > 0 ? errorColor(String(summary.tasksFailed)) : '0'
      } failed`,
      width,
    );

    // Empty line
    this.renderSummaryLine('', width);

    // Worker details box
    const detailWidth = width - 4;
    this.renderSummaryLine(dim('┌' + '─'.repeat(detailWidth) + '┐'), width);
    for (const worker of summary.workers) {
      const costStr = `$${worker.estimatedCost.toFixed(2)}`;
      const tokenStr = `${this.formatTokens(worker.inputTokens)} in / ${
        this.formatTokens(worker.outputTokens)
      } out`;
      const line =
        `Worker ${worker.id}: ${worker.tasksCompleted} tasks · ${worker.model} · ${tokenStr} · ${costStr}`;
      this.renderSummaryLine(
        `${dim('│')} ${this.padToWidth(line, detailWidth - 2)} ${dim('│')}`,
        width,
      );
    }
    this.renderSummaryLine(dim('└' + '─'.repeat(detailWidth) + '┘'), width);

    // Empty line
    this.renderSummaryLine('', width);

    // Merge stats
    this.renderSummaryLine(
      `${dim('Branches merged:')} ${summary.mergesSuccessful}/${summary.workers.length} ${
        summary.mergesSuccessful === summary.workers.length ? successColor(CHECK) : ''
      }`,
      width,
    );
    this.renderSummaryLine(
      `${dim('Merge conflicts:')} ${
        summary.mergeConflicts > 0 ? `${summary.mergeConflicts} ${dim('(auto-resolved)')}` : '0'
      }`,
      width,
    );
    this.renderSummaryLine(`${dim('Total cost:')} $${summary.totalCost.toFixed(2)}`, width);

    // Empty line
    this.renderSummaryLine('', width);

    // Target branch
    this.renderSummaryLine(
      `${dim('All changes merged to:')} ${amber(summary.targetBranch)}`,
      width,
    );

    // Empty line
    this.renderSummaryLine('', width);

    // Bottom border
    console.log(
      orange(ROUNDED.bottomLeft + ROUNDED.horizontal.repeat(width) + ROUNDED.bottomRight),
    );
    console.log();
  }

  private renderSummaryLine(content: string, width: number): void {
    const visLen = visibleLength(content);
    const padding = ' '.repeat(Math.max(0, width - visLen));
    console.log(`${orange(ROUNDED.vertical)} ${content}${padding} ${orange(ROUNDED.vertical)}`);
  }

  private padToWidth(content: string, width: number): string {
    const visLen = visibleLength(content);
    if (visLen >= width) {
      return this.truncate(content, width);
    }
    return content + ' '.repeat(width - visLen);
  }

  private formatDurationLong(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }

  private formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
    return String(tokens);
  }
}

// ============================================================================
// Quick Summary (for non-parallel use)
// ============================================================================

/**
 * Renders a quick summary box for completed parallel work.
 */
export function renderParallelSummary(summary: ParallelSummary): void {
  const renderer = new ParallelRenderer({ workerCount: summary.workers.length });
  renderer.renderSummary(summary);
}
