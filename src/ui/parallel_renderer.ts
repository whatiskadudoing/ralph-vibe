/**
 * @module ui/parallel_renderer
 *
 * Vertical terminal UI for parallel execution mode.
 * Adapts box height based on terminal size and worker count.
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
import { BOX_ROUNDED, CHECK, SPINNER_DOTS } from './symbols.ts';
import type { ParallelSummary, Worker, WorkerState } from '@/core/parallel.ts';

// ============================================================================
// Types
// ============================================================================

export interface WorkerPanel {
  workerId: number;
  state: WorkerState;
  currentTask?: string;
  currentTaskNumber: number;
  totalTasks: number;
  recentTools: string[];
  tasksCompleted: number;
  tasksFailed: number;
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
  workerCount: number;
  terminalWidth?: number;
}

// ============================================================================
// Constants
// ============================================================================

const BOX = BOX_ROUNDED;

// Icons matching claude_renderer.ts
const ICONS = {
  read: '○',
  write: '●',
  bash: '⚡',
  search: '◎',
  task: '◈',
  default: '▸',
};

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

function isTTY(): boolean {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

function getTerminalSize(): { width: number; height: number } {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { width: Math.max(60, columns), height: rows };
  } catch {
    return { width: 100, height: 40 };
  }
}

function truncate(str: string, maxLen: number): string {
  if (maxLen < 4) return '...';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function getIcon(toolName: string): string {
  switch (toolName) {
    case 'Read':
      return ICONS.read;
    case 'Write':
    case 'Edit':
      return ICONS.write;
    case 'Bash':
      return ICONS.bash;
    case 'Glob':
    case 'Grep':
      return ICONS.search;
    case 'Task':
    case 'TodoWrite':
      return ICONS.task;
    default:
      return ICONS.default;
  }
}

// ============================================================================
// Parallel Renderer
// ============================================================================

/**
 * Renders parallel execution UI with adaptive box heights.
 * Automatically uses compact mode when terminal can't fit full boxes.
 */
export class ParallelRenderer {
  private workerCount: number;
  private terminalWidth: number;
  private terminalHeight: number;
  private boxWidth: number;
  private contentWidth: number;
  private panels: WorkerPanel[];
  private globalStatus: GlobalStatus;
  private startTime: number;
  private frameIndex: number;
  private intervalId: number | null;
  private initialized: boolean;
  private fixedHeight: number;
  private _isTTY: boolean;

  // Adaptive box heights
  private toolSlots: number; // 0, 3, or 6 tools per box
  private workerBoxHeight: number;

  constructor(options: ParallelRendererOptions) {
    this.workerCount = options.workerCount;
    this._isTTY = isTTY();

    const termSize = getTerminalSize();
    this.terminalWidth = options.terminalWidth ?? termSize.width;
    this.terminalHeight = termSize.height;
    this.boxWidth = this.terminalWidth - 2;
    this.contentWidth = this.boxWidth - 4;
    this.panels = [];
    this.globalStatus = { tasksTotal: 0, completed: 0, failed: 0, running: 0, elapsedTime: 0 };
    this.startTime = Date.now();
    this.frameIndex = 0;
    this.intervalId = null;
    this.initialized = false;

    // Calculate adaptive box height based on available terminal space
    // Reserved: header (2) + footer (2) + safety margin (2) = 6 lines
    const availableHeight = this.terminalHeight - 6;
    const heightPerWorker = Math.floor(availableHeight / this.workerCount);

    // Full box: 13 lines (border + title + task + empty + spinner + separator + 6 tools + border)
    // Medium box: 10 lines (border + title + task + empty + spinner + separator + 3 tools + border)
    // Compact box: 5 lines (border + title + task + spinner + border)
    if (heightPerWorker >= 13) {
      this.toolSlots = 6;
      this.workerBoxHeight = 13;
    } else if (heightPerWorker >= 10) {
      this.toolSlots = 3;
      this.workerBoxHeight = 10;
    } else if (heightPerWorker >= 5) {
      this.toolSlots = 0;
      this.workerBoxHeight = 5;
    } else {
      // Minimum: use 5 lines and let it scroll
      this.toolSlots = 0;
      this.workerBoxHeight = 5;
    }

    // Calculate actual fixed height
    this.fixedHeight = 2 + (this.workerCount * this.workerBoxHeight) + 2;

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

  start(): void {
    this.startTime = Date.now();
    this.frameIndex = 0;
    this.initialized = false;

    if (!this._isTTY) {
      console.log(`\n🔀 Ralph Parallel Mode · ${this.workerCount} workers`);
      this.initialized = true;
      return;
    }

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
    }, 80);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.initialized || !this._isTTY) return;

    const encoder = new TextEncoder();
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.fixedHeight}A`));
    for (let i = 0; i < this.fixedHeight; i++) {
      Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
    }
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.fixedHeight}A`));
  }

  updateWorker(worker: Worker): void {
    const panel = this.panels.find((p) => p.workerId === worker.id);
    if (!panel) return;

    const oldState = panel.state;
    panel.state = worker.state;
    panel.currentTask = worker.currentTask?.displayText;
    panel.tasksCompleted = worker.stats.tasksCompleted;
    panel.tasksFailed = worker.stats.tasksFailed;

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

    if (!this._isTTY && oldState !== panel.state) {
      console.log(
        `  Worker ${worker.id}: ${panel.state}${
          panel.currentTask ? ` - ${panel.currentTask}` : ''
        }`,
      );
    }
  }

  addToolCall(workerId: number, tool: string): void {
    const panel = this.panels.find((p) => p.workerId === workerId);
    if (!panel) return;

    panel.recentTools.push(tool);
    const maxTools = Math.max(this.toolSlots, 3); // Keep at least 3 for when we have space
    if (panel.recentTools.length > maxTools) {
      panel.recentTools.shift();
    }
  }

  updateStatus(status: Partial<GlobalStatus>): void {
    this.globalStatus = { ...this.globalStatus, ...status };

    if (status.tasksTotal !== undefined) {
      const tasksPerWorker = Math.ceil(status.tasksTotal / this.workerCount);
      for (const panel of this.panels) {
        panel.totalTasks = tasksPerWorker;
      }
    }
  }

  private render(): void {
    if (!this._isTTY || !this.initialized) return;

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

    const header = `${frame} ${
      bold('Ralph Parallel Mode')
    } · ${this.workerCount} workers · Tasks: ${
      successColor(String(this.globalStatus.completed))
    }/${this.globalStatus.tasksTotal} · ${dim(elapsed)}`;
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${header}\n`));
    Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
  }

  private renderWorkerBox(panel: WorkerPanel, encoder: TextEncoder): void {
    const stateColor = STATE_COLORS[panel.state];
    const stateIcon = STATE_ICONS[panel.state];

    // Border color based on state
    let bc: (s: string) => string;
    switch (panel.state) {
      case 'running':
        bc = orange;
        break;
      case 'merging':
        bc = amber;
        break;
      case 'done':
        bc = successColor;
        break;
      case 'error':
        bc = errorColor;
        break;
      default:
        bc = dim;
    }

    // Line 0: Top border
    const topBorder = bc(BOX.topLeft + BOX.horizontal.repeat(this.boxWidth - 2) + BOX.topRight);
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${topBorder}\n`));

    // Line 1: [Worker N] Title with stats
    const taskCount = panel.totalTasks > 0
      ? ` · Task ${panel.currentTaskNumber}/${panel.totalTasks}`
      : '';
    const completedStr = panel.tasksCompleted > 0
      ? ` · ${successColor(CHECK)} ${panel.tasksCompleted}`
      : '';
    const failedStr = panel.tasksFailed > 0 ? ` · ${errorColor('✗')} ${panel.tasksFailed}` : '';
    const titleLine = `${amber(`[Worker ${panel.workerId}]`)} ${stateColor(stateIcon)} ${
      stateColor(this.getStateLabel(panel.state))
    }${taskCount}${completedStr}${failedStr}`;
    this.renderContentLine(titleLine, bc, encoder);

    // Line 2: Task description
    const taskDesc = panel.currentTask
      ? dim(truncate(panel.currentTask, this.contentWidth))
      : dim('Waiting for task...');
    this.renderContentLine(taskDesc, bc, encoder);

    if (this.toolSlots > 0) {
      // Line 3: Empty (only in non-compact mode)
      this.renderContentLine('', bc, encoder);

      // Line 4: Spinner/status line
      const frame = panel.state === 'running' || panel.state === 'merging'
        ? orange(SPINNER_DOTS[this.frameIndex] ?? '◆')
        : dim('◆');
      const maxStatusLen = this.contentWidth - 12;
      const statusLine = `${frame} ${truncate(panel.status, maxStatusLen)}`;
      this.renderContentLine(statusLine, bc, encoder);

      // Line 5: Separator
      this.renderContentLine(dim('│'), bc, encoder);

      // Tool slots
      for (let i = 0; i < this.toolSlots; i++) {
        const tool = panel.recentTools[panel.recentTools.length - this.toolSlots + i];
        if (tool) {
          const formatted = this.formatTool(tool);
          this.renderContentLine(`${dim('│')}  ${formatted}`, bc, encoder);
        } else {
          this.renderContentLine(dim('│'), bc, encoder);
        }
      }
    } else {
      // Compact mode: just spinner line
      const frame = panel.state === 'running' || panel.state === 'merging'
        ? orange(SPINNER_DOTS[this.frameIndex] ?? '◆')
        : dim('◆');
      const maxStatusLen = this.contentWidth - 12;
      const statusLine = `${frame} ${truncate(panel.status, maxStatusLen)}`;
      this.renderContentLine(statusLine, bc, encoder);
    }

    // Bottom border
    const bottomBorder = bc(
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
      finalContent = truncate(content, this.contentWidth);
    }
    const finalVisLen = visibleLength(finalContent);
    const padding = ' '.repeat(Math.max(0, this.contentWidth - finalVisLen));

    const leftPart = `${borderColor(BOX.vertical)} ${finalContent}${padding} `;
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${leftPart}`));
    // Position cursor at boxWidth and draw right border
    Deno.stdout.writeSync(encoder.encode(`\x1b[${this.boxWidth}G${borderColor(BOX.vertical)}\n`));
  }

  private renderFooter(encoder: TextEncoder): void {
    const status = this.globalStatus.failed > 0
      ? `${errorColor(`${this.globalStatus.failed} failed`)} · ${dim('Press Ctrl+C to stop')}`
      : dim('Press Ctrl+C to stop');
    Deno.stdout.writeSync(encoder.encode('\x1b[2K\n'));
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${status}\n`));
  }

  private formatTool(toolDisplay: string): string {
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

    const icon = getIcon(toolName);
    const maxDetailLen = this.contentWidth - 20;

    if (detail) {
      return `${amber(icon)} ${dim(toolName + ':')} ${muted(truncate(detail, maxDetailLen))}`;
    }
    return `${amber(icon)} ${dim(toolName)}`;
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

  renderSummary(summary: ParallelSummary): void {
    const width = this.boxWidth - 2;

    console.log();

    // Top border
    console.log(successColor(BOX.topLeft + BOX.horizontal.repeat(width) + BOX.topRight));

    // Title
    this.renderSummaryLine(
      `${successColor(CHECK)} ${bold('Parallel Work Complete')}`,
      width,
      successColor,
    );

    // Separator (using simple horizontal line since BOX_ROUNDED doesn't have tee chars)
    console.log(
      successColor(BOX.vertical + '─'.repeat(width) + BOX.vertical),
    );

    // Empty line
    this.renderSummaryLine('', width, successColor);

    // Stats
    const sequentialEstimate = summary.totalDuration * summary.workers.length;
    this.renderSummaryLine(
      `${dim('Workers:')} ${summary.workers.length} parallel instances`,
      width,
      successColor,
    );
    this.renderSummaryLine(
      `${dim('Duration:')} ${this.formatDurationLong(summary.totalDuration)} ${
        dim(`(vs ~${this.formatDurationLong(sequentialEstimate)} sequential)`)
      }`,
      width,
      successColor,
    );
    this.renderSummaryLine(
      `${dim('Tasks:')} ${successColor(String(summary.tasksCompleted))} completed, ${
        summary.tasksFailed > 0 ? errorColor(String(summary.tasksFailed)) : '0'
      } failed`,
      width,
      successColor,
    );

    // Calculate totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalOps = 0;
    for (const worker of summary.workers) {
      totalInputTokens += worker.inputTokens;
      totalOutputTokens += worker.outputTokens;
      totalOps += worker.tasksCompleted;
    }

    this.renderSummaryLine(
      `${dim('Tokens:')} ${this.formatTokens(totalInputTokens)} in · ${
        this.formatTokens(totalOutputTokens)
      } out · ${this.formatTokens(totalInputTokens + totalOutputTokens)} total`,
      width,
      successColor,
    );

    // Empty line
    this.renderSummaryLine('', width, successColor);

    // Worker details box
    const detailWidth = width - 4;
    this.renderSummaryLine(dim('┌' + '─'.repeat(detailWidth) + '┐'), width, successColor);
    for (const worker of summary.workers) {
      const tokenStr = `${this.formatTokens(worker.inputTokens + worker.outputTokens)} tokens`;
      const opsStr = `${worker.tasksCompleted} tasks`;
      const line = `Worker ${worker.id}: ${opsStr} · ${worker.model} · ${tokenStr}`;
      this.renderSummaryLine(
        `${dim('│')} ${this.padToWidth(line, detailWidth - 2)} ${dim('│')}`,
        width,
        successColor,
      );
    }
    this.renderSummaryLine(dim('└' + '─'.repeat(detailWidth) + '┘'), width, successColor);

    // Empty line
    this.renderSummaryLine('', width, successColor);

    // Merge stats
    this.renderSummaryLine(
      `${dim('Branches merged:')} ${summary.mergesSuccessful}/${summary.workers.length} ${
        summary.mergesSuccessful === summary.workers.length ? successColor(CHECK) : ''
      }`,
      width,
      successColor,
    );
    if (summary.mergeConflicts > 0) {
      this.renderSummaryLine(
        `${dim('Merge conflicts:')} ${summary.mergeConflicts} ${dim('(auto-resolved)')}`,
        width,
        successColor,
      );
    }

    // Empty line
    this.renderSummaryLine('', width, successColor);

    // Target branch
    this.renderSummaryLine(
      `${dim('All changes merged to:')} ${amber(summary.targetBranch)}`,
      width,
      successColor,
    );

    // Empty line
    this.renderSummaryLine('', width, successColor);

    // Bottom border
    console.log(successColor(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight));
    console.log();
  }

  private renderSummaryLine(
    content: string,
    width: number,
    borderColor: (s: string) => string = successColor,
  ): void {
    const visLen = visibleLength(content);
    const padding = ' '.repeat(Math.max(0, width - visLen));
    console.log(`${borderColor(BOX.vertical)} ${content}${padding} ${borderColor(BOX.vertical)}`);
  }

  private padToWidth(content: string, width: number): string {
    const visLen = visibleLength(content);
    if (visLen >= width) {
      return truncate(content, width);
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

export function renderParallelSummary(summary: ParallelSummary): void {
  const renderer = new ParallelRenderer({ workerCount: summary.workers.length });
  renderer.renderSummary(summary);
}
