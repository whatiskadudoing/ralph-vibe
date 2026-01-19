/**
 * @module ui/parallel_renderer
 *
 * Split terminal UI for parallel execution mode.
 * Renders multiple worker panels side-by-side with real-time updates.
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
  /** Progress indicator */
  progress: string;
  /** Recent tool calls */
  recentTools: string[];
  /** Status line (tasks completed/failed) */
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
const FULL_BOX = BOX;
const MAX_TOOLS_PER_PANEL = 4;

// State symbols
const STATE_ICONS: Record<WorkerState, string> = {
  idle: '○',
  initializing: '◐',
  running: '●',
  merging: '◐',
  error: '✗',
  done: '✓',
};

const STATE_LABELS: Record<WorkerState, string> = {
  idle: 'Idle',
  initializing: 'Initializing',
  running: 'Running',
  merging: 'Merging',
  error: 'Error',
  done: 'Done',
};

// ============================================================================
// Parallel Renderer
// ============================================================================

/**
 * Renders a split terminal UI for parallel execution.
 * Shows multiple worker panels side-by-side with real-time updates.
 */
export class ParallelRenderer {
  private workerCount: number;
  private terminalWidth: number;
  private panelWidth: number;
  private panels: WorkerPanel[];
  private globalStatus: GlobalStatus;
  private startTime: number;
  private frameIndex: number;
  private intervalId: number | null;
  private initialized: boolean;

  // Layout: header (3) + worker panels (10 each) + footer (3)
  // Worker panel: title + state + task + empty + 4 tools + status + empty
  private readonly headerHeight = 3;
  private readonly panelHeight = 10;
  private readonly footerHeight = 2;
  private fixedHeight: number;

  constructor(options: ParallelRendererOptions) {
    this.workerCount = options.workerCount;
    this.terminalWidth = options.terminalWidth ?? this.getTerminalWidth();
    this.panelWidth = Math.floor((this.terminalWidth - 2) / this.workerCount);
    this.panels = [];
    this.globalStatus = { tasksTotal: 0, completed: 0, failed: 0, running: 0, elapsedTime: 0 };
    this.startTime = Date.now();
    this.frameIndex = 0;
    this.intervalId = null;
    this.initialized = false;
    this.fixedHeight = this.headerHeight + this.panelHeight + this.footerHeight;

    // Initialize panels
    for (let i = 1; i <= this.workerCount; i++) {
      this.panels.push({
        workerId: i,
        state: 'idle',
        currentTask: undefined,
        progress: '',
        recentTools: [],
        status: '0 tasks · 0 fail',
      });
    }
  }

  private getTerminalWidth(): number {
    try {
      const { columns } = Deno.consoleSize();
      return Math.max(60, Math.min(columns, 160));
    } catch {
      return 100;
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
    panel.status = `${worker.stats.tasksCompleted} tasks · ${worker.stats.tasksFailed} fail`;

    if (worker.state === 'running') {
      panel.progress = 'Implementing...';
    } else if (worker.state === 'merging') {
      panel.progress = 'Merging to main...';
    } else if (worker.state === 'done') {
      panel.progress = 'Complete';
    } else if (worker.state === 'error') {
      panel.progress = 'Error';
    } else {
      panel.progress = '';
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
    if (panel.recentTools.length > MAX_TOOLS_PER_PANEL) {
      panel.recentTools.shift();
    }

    this.render();
  }

  /**
   * Updates the global status.
   */
  updateStatus(status: Partial<GlobalStatus>): void {
    this.globalStatus = { ...this.globalStatus, ...status };
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
    this.renderHeader();

    // Render worker panels
    this.renderPanels();

    // Render footer
    this.renderFooter();
  }

  private renderHeader(): void {
    const encoder = new TextEncoder();
    const elapsed = this.formatDuration(this.globalStatus.elapsedTime);
    const frame = SPINNER_DOTS[this.frameIndex] ?? '◆';

    // Line 1: Top border
    const topBorder = orange(
      ROUNDED.topLeft + ROUNDED.horizontal.repeat(this.terminalWidth - 4) + ROUNDED.topRight,
    );
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${topBorder}\n`));

    // Line 2: Title line
    const running = this.globalStatus.running > 0 ? orange(frame) : dim(frame);
    const title = `${running} ${
      bold('Ralph Parallel Mode')
    } · ${this.workerCount} workers · Tasks: ${
      successColor(String(this.globalStatus.completed))
    }/${this.globalStatus.tasksTotal} · ${dim(elapsed)}`;
    this.renderContentLine(title, this.terminalWidth - 4, orange);

    // Line 3: Separator
    const sep = orange(
      FULL_BOX.teeRight + ROUNDED.horizontal.repeat(this.terminalWidth - 4) + FULL_BOX.teeLeft,
    );
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${sep}\n`));
  }

  private renderPanels(): void {
    // Render each row of the panel area
    // Panel structure:
    // Row 0: Worker N header with bar
    // Row 1: State icon + label
    // Row 2: Current task (truncated)
    // Row 3: Empty
    // Row 4: Progress text
    // Row 5-8: Tool calls
    // Row 9: Status line

    for (let row = 0; row < this.panelHeight; row++) {
      const lineContent = this.renderPanelRow(row);
      this.renderPanelLine(lineContent);
    }
  }

  private renderPanelRow(row: number): string[] {
    return this.panels.map((panel) => {
      const width = this.panelWidth - 3; // Account for borders and spacing

      switch (row) {
        case 0: // Worker header
          return this.renderPanelHeader(panel, width);
        case 1: // State
          return this.renderPanelState(panel, width);
        case 2: // Task
          return this.renderPanelTask(panel, width);
        case 3: // Empty
          return '';
        case 4: // Progress
          return this.renderPanelProgress(panel, width);
        case 5:
        case 6:
        case 7:
        case 8: // Tools
          return this.renderPanelTool(panel, row - 5, width);
        case 9: // Status
          return this.renderPanelStatus(panel, width);
        default:
          return '';
      }
    });
  }

  private renderPanelHeader(panel: WorkerPanel, width: number): string {
    const title = `Worker ${panel.workerId}`;
    const bar = '═'.repeat(width - title.length - 1);
    return `${bold(title)} ${dim(bar)}`;
  }

  private renderPanelState(panel: WorkerPanel, width: number): string {
    const icon = STATE_ICONS[panel.state];
    const label = STATE_LABELS[panel.state];

    let colorFn: (s: string) => string;
    switch (panel.state) {
      case 'running':
        colorFn = orange;
        break;
      case 'merging':
        colorFn = amber;
        break;
      case 'done':
        colorFn = successColor;
        break;
      case 'error':
        colorFn = errorColor;
        break;
      default:
        colorFn = dim;
    }

    const content = `${colorFn(icon)} ${label}`;
    return this.padToWidth(content, width);
  }

  private renderPanelTask(panel: WorkerPanel, width: number): string {
    if (!panel.currentTask) return '';
    return dim(this.truncate(panel.currentTask, width));
  }

  private renderPanelProgress(panel: WorkerPanel, width: number): string {
    if (!panel.progress) return '';
    return `${orange('◆')} ${muted(this.truncate(panel.progress, width - 2))}`;
  }

  private renderPanelTool(panel: WorkerPanel, index: number, width: number): string {
    const tool = panel.recentTools[index];
    if (!tool) return '';
    return `${dim('├─')} ${muted(this.truncate(tool, width - 3))}`;
  }

  private renderPanelStatus(panel: WorkerPanel, _width: number): string {
    return dim(`${CHECK} ${panel.status}`);
  }

  private renderPanelLine(contents: string[]): void {
    let line = orange(ROUNDED.vertical);

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i] ?? '';
      const paddedContent = this.padToWidth(content, this.panelWidth - 2);
      line += ` ${paddedContent}`;

      // Add separator between panels
      if (i < contents.length - 1) {
        line += orange(ROUNDED.vertical);
      }
    }

    // Right border - pad to full width
    const currentLen = visibleLength(line);
    const padding = Math.max(0, this.terminalWidth - 4 - currentLen);
    line += ' '.repeat(padding) + orange(ROUNDED.vertical);

    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${line}\n`));
  }

  private renderFooter(): void {
    const encoder = new TextEncoder();

    // Bottom border
    const bottomBorder = orange(
      ROUNDED.bottomLeft + ROUNDED.horizontal.repeat(this.terminalWidth - 4) + ROUNDED.bottomRight,
    );
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${bottomBorder}\n`));

    // Status line below box
    const status = this.globalStatus.failed > 0
      ? `${errorColor(`${this.globalStatus.failed} failed`)} · ${dim('Press Ctrl+C to stop')}`
      : dim('Press Ctrl+C to stop');
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${status}\n`));
  }

  private renderContentLine(
    content: string,
    width: number,
    borderColor: (s: string) => string,
  ): void {
    const encoder = new TextEncoder();
    const visLen = visibleLength(content);
    const padding = ' '.repeat(Math.max(0, width - visLen));
    const line = `${borderColor(ROUNDED.vertical)} ${content}${padding} ${
      borderColor(ROUNDED.vertical)
    }`;
    Deno.stdout.writeSync(encoder.encode(`\x1b[2K${line}\n`));
  }

  private padToWidth(content: string, width: number): string {
    const visLen = visibleLength(content);
    if (visLen >= width) {
      return this.truncate(content, width);
    }
    return content + ' '.repeat(width - visLen);
  }

  private truncate(str: string, maxLen: number): string {
    if (visibleLength(str) <= maxLen) return str;

    // Simple truncation - may cut ANSI codes but acceptable for display
    let result = '';
    let len = 0;
    for (const char of str) {
      if (len >= maxLen - 3) {
        result += '...';
        break;
      }
      result += char;
      // Skip ANSI escape sequences in length calculation
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
    const width = this.terminalWidth - 4;

    console.log(); // Spacing

    // Top border
    console.log(orange(ROUNDED.topLeft + ROUNDED.horizontal.repeat(width) + ROUNDED.topRight));

    // Title
    this.renderSummaryLine(`${successColor(CHECK)} ${bold('Parallel Work Complete')}`, width);

    // Separator
    console.log(orange(FULL_BOX.teeRight + ROUNDED.horizontal.repeat(width) + FULL_BOX.teeLeft));

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
        summary.mergeConflicts > 0 ? errorColor(String(summary.mergeConflicts)) : '0'
      }`,
      width,
    );
    this.renderSummaryLine(
      `${dim('Total cost:')} $${summary.totalCost.toFixed(2)}`,
      width,
    );

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
 * Used when renderer is not running (e.g., after interruption).
 */
export function renderParallelSummary(summary: ParallelSummary): void {
  const renderer = new ParallelRenderer({ workerCount: summary.workers.length });
  renderer.renderSummary(summary);
}
