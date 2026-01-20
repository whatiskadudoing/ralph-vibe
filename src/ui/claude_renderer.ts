/**
 * @module ui/claude_renderer
 *
 * Renders Claude CLI stream-json output in a beautiful terminal format.
 * Inspired by Gemini CLI and other modern CLI tools.
 * Reusable across all commands that run Claude (plan, work, etc.)
 */

import {
  type ClaudeRunOptions,
  formatToolUse,
  parseAssistantMessage,
  runClaude,
} from '@/services/claude_service.ts';
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
import { BOX_ROUNDED, SPINNER_DOTS } from './symbols.ts';
import { createBox } from './box.ts';

// ============================================================================
// Types
// ============================================================================

export interface RenderOptions {
  /** Show tool calls as they happen. Default: true */
  showTools?: boolean;
  /** Show spinner during processing. Default: true */
  showSpinner?: boolean;
  /** Title to show at the top. */
  title?: string;
  /** Subtitle/description. */
  subtitle?: string;
  /** Stage indicator (e.g., "1/2" or "Analysis"). */
  stage?: string;
  /** Whether to capture text output for chaining. Default: false */
  captureOutput?: boolean;
  /** Whether to show stats after completion. Default: true */
  showStats?: boolean;
}

export interface ModelStats {
  /** Number of operations by this model. */
  readonly operations: number;
}

export interface UsageStats {
  /** Input tokens used. */
  readonly inputTokens?: number;
  /** Output tokens used. */
  readonly outputTokens?: number;
  /** Cache read tokens (prompt caching). */
  readonly cacheReadTokens?: number;
  /** Cache write tokens (prompt caching). */
  readonly cacheWriteTokens?: number;
  /** Total cost in dollars (estimated). */
  readonly costUsd?: number;
  /** Duration in seconds. */
  readonly durationSec: number;
  /** Number of tool operations. */
  readonly operations: number;
  /** Operations breakdown by model. */
  readonly byModel?: {
    opus?: ModelStats;
    sonnet?: ModelStats;
    haiku?: ModelStats;
  };
}

export interface ClaudeResult {
  /** Whether Claude completed successfully. */
  success: boolean;
  /** All text output from Claude. */
  text: string;
  /** List of tools that were called. */
  toolsCalled: string[];
  /** Whether EXIT_SIGNAL was present. */
  hasExitSignal: boolean;
  /** Usage statistics. */
  usage: UsageStats;
}

// ============================================================================
// Constants
// ============================================================================

const BOX = BOX_ROUNDED;
const MAX_VISIBLE_TOOLS = 6;

// Cached TextEncoder for better performance in hot paths (spinners render 60+ times/sec)
const textEncoder = new TextEncoder();

// ============================================================================
// Icons & Symbols
// ============================================================================

const ICONS = {
  read: '○',
  write: '●',
  bash: '⚡',
  search: '◎',
  task: '◈',
  thinking: '◆',
};

// ============================================================================
// Spinner with Activity Display
// ============================================================================

/**
 * Fixed-height activity spinner that doesn't corrupt terminal history.
 * Uses a fixed render area and cursor save/restore for clean updates.
 */
class ActivitySpinner {
  private frameIndex = 0;
  private intervalId: number | null = null;
  private status = 'Thinking...';
  private startTime = 0;
  private recentTools: string[] = [];
  private totalTools = 0;
  private readonly fixedHeight: number;
  private initialized = false;

  constructor() {
    // Fixed height: 1 (spinner) + 1 (separator) + MAX_VISIBLE_TOOLS
    this.fixedHeight = 2 + MAX_VISIBLE_TOOLS;
  }

  start(): void {
    this.frameIndex = 0;
    this.startTime = Date.now();
    this.recentTools = [];
    this.totalTools = 0;
    this.initialized = false;

    // Allocate fixed space by printing empty lines
    for (let i = 0; i < this.fixedHeight; i++) {
      console.log('');
    }
    this.initialized = true;

    this.render();
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_DOTS.length;
      this.render();
    }, 80);
  }

  updateStatus(status: string): void {
    this.status = status;
  }

  addTool(tool: string): void {
    this.totalTools++;
    this.recentTools.push(tool);
    // Keep only recent tools within our fixed space
    if (this.recentTools.length > MAX_VISIBLE_TOOLS) {
      this.recentTools.shift();
    }
    this.render();
  }

  private render(): void {
    if (!this.initialized) return;

    // Move cursor up to our fixed render area (always same amount)
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));

    // Render spinner line
    const frame = orange(SPINNER_DOTS[this.frameIndex] ?? '◆');
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const time = elapsed > 0 ? dim(` (${elapsed}s)`) : '';
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K${frame} ${this.status}${time}\n`));

    // Render separator
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K${dim(BOX.vertical)}\n`));

    // Render tool slots (always render MAX_VISIBLE_TOOLS lines for fixed height)
    for (let i = 0; i < MAX_VISIBLE_TOOLS; i++) {
      const tool = this.recentTools[i];
      if (tool) {
        const formatted = this.formatTool(tool);
        Deno.stdout.writeSync(
          textEncoder.encode(`\x1b[2K${dim(BOX.vertical)}  ${formatted}\n`),
        );
      } else {
        // Empty slot - just clear the line
        Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K\n`));
      }
    }
  }

  private formatTool(toolDisplay: string): string {
    const [toolName, ...rest] = toolDisplay.split(': ');
    const detail = rest.join(': ');
    const icon = this.getIcon(toolName ?? '');

    if (detail) {
      return `${amber(icon)} ${dim(toolName + ':')} ${muted(truncate(detail, 45))}`;
    }
    return `${amber(icon)} ${dim(toolName ?? toolDisplay)}`;
  }

  private getIcon(toolName: string): string {
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
        return ICONS.task;
      default:
        return '▸';
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.initialized) return;

    // Move up and clear our fixed render area
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));
    for (let i = 0; i < this.fixedHeight; i++) {
      Deno.stdout.writeSync(textEncoder.encode('\x1b[2K\n'));
    }
    // Move back up to where we started
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));
  }

  getStats(): { total: number; elapsed: number } {
    return {
      total: this.totalTools,
      elapsed: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

// ============================================================================
// Renderer
// ============================================================================

/**
 * Runs Claude and renders the output beautifully to the terminal.
 */
export async function runAndRender(
  options: ClaudeRunOptions,
  renderOptions: RenderOptions = {},
): Promise<ClaudeResult> {
  const {
    showTools = true,
    showSpinner = true,
    showStats = true,
    title,
    subtitle,
  } = renderOptions;

  const spinner = new ActivitySpinner();
  const toolsCalled: string[] = [];
  let fullText = '';
  let hasExitSignal = false;

  // Show title box
  if (title) {
    console.log();
    const stagePrefix = renderOptions.stage ? `${amber(`[${renderOptions.stage}]`)} ` : '';
    const titleContent = subtitle
      ? `${stagePrefix}${bold(title)}\n${dim(subtitle)}`
      : `${stagePrefix}${bold(title)}`;
    console.log(createBox(titleContent, {
      style: 'rounded',
      padding: 1,
      paddingY: 0,
    }));
    console.log();
  }

  if (showSpinner) {
    spinner.start();
  }

  try {
    for await (const event of runClaude(options)) {
      if (event.type === 'assistant') {
        const messages = parseAssistantMessage(event);

        for (const msg of messages) {
          if (msg.text) {
            fullText += msg.text;

            if (msg.text.includes('EXIT_SIGNAL: true')) {
              hasExitSignal = true;
            }

            // Update status with meaningful text
            const firstLine = msg.text.split('\n')[0]?.trim();
            if (
              firstLine && firstLine.length > 0 && !firstLine.startsWith('#') &&
              !firstLine.startsWith('`')
            ) {
              if (showSpinner) {
                spinner.updateStatus(truncate(firstLine, 50));
              }
            }
          }

          if (msg.toolUse && showTools) {
            const toolDisplay = formatToolUse(msg.toolUse);
            toolsCalled.push(toolDisplay);

            if (showSpinner) {
              spinner.addTool(toolDisplay);
            }
          }
        }
      } else if (event.type === 'result') {
        const stats = spinner.getStats();
        if (showSpinner) {
          spinner.stop();
        }

        const data = event.data as Record<string, unknown>;
        const isError = data.is_error === true;

        // Extract usage from result if available
        const resultUsage = extractUsage(data, stats);

        if (isError) {
          renderError('Claude encountered an error');
          return {
            success: false,
            text: fullText,
            toolsCalled,
            hasExitSignal,
            usage: resultUsage,
          };
        }

        // Show completion stats
        if (showStats && stats.total > 0) {
          console.log(dim(`  ${stats.total} operations in ${stats.elapsed}s`));
          console.log();
        }

        return {
          success: true,
          text: fullText,
          toolsCalled,
          hasExitSignal,
          usage: resultUsage,
        };
      }
    }

    // Success (no result event - fallback)
    const stats = spinner.getStats();
    if (showSpinner) {
      spinner.stop();
    }

    if (showStats && stats.total > 0) {
      console.log(dim(`  ${stats.total} operations in ${stats.elapsed}s`));
      console.log();
    }

    return {
      success: true,
      text: fullText,
      toolsCalled,
      hasExitSignal,
      usage: {
        durationSec: stats.elapsed,
        operations: stats.total,
      },
    };
  } catch (e) {
    if (showSpinner) {
      spinner.stop();
    }
    const stats = spinner.getStats();
    renderError(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);

    return {
      success: false,
      text: fullText,
      toolsCalled,
      hasExitSignal,
      usage: {
        durationSec: stats.elapsed,
        operations: stats.total,
      },
    };
  }
}

/**
 * Renders a success completion box.
 */
export function renderSuccess(message: string, details?: string[]): void {
  const icon = successColor('✓');
  let content = `${icon} ${successColor(bold(message))}`;

  if (details && details.length > 0) {
    content += '\n';
    for (const detail of details) {
      content += `\n  ${dim('→')} ${detail}`;
    }
  }

  console.log(createBox(content, { style: 'rounded', padding: 1, paddingY: 0 }));
}

/**
 * Renders an error completion box.
 */
export function renderError(message: string, hint?: string): void {
  const icon = errorColor('✗');
  let content = `${icon} ${errorColor(bold(message))}`;

  if (hint) {
    content += `\n  ${dim(hint)}`;
  }

  console.log();
  console.log(createBox(content, { style: 'rounded', padding: 1, paddingY: 0 }));
}

/**
 * Renders an info box.
 */
export function renderInfo(title: string, items: string[]): void {
  let content = `${orange('◆')} ${bold(title)}`;

  if (items.length > 0) {
    content += '\n';
    for (const item of items) {
      content += `\n  ${amber('▸')} ${item}`;
    }
  }

  console.log(createBox(content, { style: 'rounded', padding: 1, paddingY: 0 }));
}

/**
 * Renders a stage transition indicator.
 */
export function renderStageTransition(from: string, to: string): void {
  console.log();
  console.log(dim(`  ${from} ${orange('→')} ${to}`));
  console.log();
}

/**
 * Renders a compact stage header (no box).
 */
export function renderStageHeader(stage: string, title: string): void {
  console.log();
  console.log(`${amber(`[${stage}]`)} ${bold(title)}`);
}

/**
 * Renders a summary of analysis results.
 */
export function renderAnalysisSummary(items: readonly string[]): void {
  if (items.length === 0) return;

  console.log(dim('  Analysis found:'));
  for (const item of items) {
    console.log(`    ${amber('▸')} ${item}`);
  }
  console.log();
}

// ============================================================================
// Helpers
// ============================================================================

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Extracts usage statistics from result event data.
 */
function extractUsage(
  data: Record<string, unknown>,
  stats: { total: number; elapsed: number },
): UsageStats {
  // Try to extract token usage from various possible locations in the result
  const usage = data.usage as Record<string, number> | undefined;
  const result = data.result as Record<string, unknown> | undefined;
  const resultUsage = result?.usage as Record<string, number> | undefined;

  const inputTokens = usage?.input_tokens ?? resultUsage?.input_tokens;
  const outputTokens = usage?.output_tokens ?? resultUsage?.output_tokens;

  // Cache tokens (from Anthropic API prompt caching)
  const cacheReadTokens = usage?.cache_read_input_tokens ?? resultUsage?.cache_read_input_tokens;
  const cacheWriteTokens = usage?.cache_creation_input_tokens ?? resultUsage?.cache_creation_input_tokens;

  // Estimate cost (Opus pricing: $15/M input, $75/M output as of 2024)
  let costUsd: number | undefined;
  if (inputTokens !== undefined && outputTokens !== undefined) {
    costUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costUsd,
    durationSec: stats.elapsed,
    operations: stats.total,
  };
}

/**
 * Formats usage stats for display.
 * Note: Cost is not shown for Claude Code subscription users.
 */
export function formatUsageStats(usage: UsageStats, model?: string): string {
  const parts: string[] = [];

  // Show per-model breakdown if available
  if (usage.byModel && Object.keys(usage.byModel).length > 0) {
    const modelParts: string[] = [];
    if (usage.byModel.opus?.operations) {
      modelParts.push(`opus:${usage.byModel.opus.operations}`);
    }
    if (usage.byModel.sonnet?.operations) {
      modelParts.push(`sonnet:${usage.byModel.sonnet.operations}`);
    }
    if (usage.byModel.haiku?.operations) {
      modelParts.push(`haiku:${usage.byModel.haiku.operations}`);
    }
    if (modelParts.length > 0) {
      parts.push(modelParts.join(' '));
    }
  } else if (model) {
    parts.push(model);
  }

  parts.push(`${usage.operations} ops`);
  parts.push(`${usage.durationSec}s`);

  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
    const totalTokens = usage.inputTokens + usage.outputTokens;
    parts.push(`${formatTokens(totalTokens)} tokens`);
  }

  // Don't show cost - not relevant for Claude Code subscription users

  return parts.join(' · ');
}

/**
 * Formats token count with K/M suffix.
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

// ============================================================================
// Boxed Iteration Renderer (for ralph work)
// ============================================================================

/**
 * Gets terminal width, with fallback for non-TTY environments.
 */
export function getTerminalWidth(): number {
  try {
    const { columns } = Deno.consoleSize();
    return Math.max(60, Math.min(columns, 120)); // Clamp between 60-120
  } catch {
    return 80; // Default fallback
  }
}

// Dynamic width based on terminal size
const getBoxWidth = () => getTerminalWidth() - 2; // Leave small margin
const getContentWidth = () => getBoxWidth() - 4; // Account for borders and padding

/**
 * Renders an iteration inside a bordered box with live updates.
 * The spinner and tool calls appear inside the box.
 */
class BoxedIterationRenderer {
  private readonly iteration: number;
  private readonly title: string;
  private readonly task: string;
  private readonly borderColor: (s: string) => string;
  private readonly mainModel: string;

  private frameIndex = 0;
  private intervalId: number | null = null;
  private status = 'Starting...';
  private startTime = 0;
  private recentTools: string[] = [];
  private totalTools = 0;
  private initialized = false;

  // Track operations by model
  private opsByModel = {
    opus: 0,
    sonnet: 0,
    haiku: 0,
  };

  // Fixed layout:
  // Line 0: top border
  // Line 1: [#N] Title
  // Line 2: task description
  // Line 3: empty
  // Line 4: spinner line
  // Line 5: separator
  // Lines 6-11: tool slots (6 tools)
  // Line 12: bottom border
  private readonly fixedHeight = 13;

  constructor(
    iteration: number,
    title: string,
    task: string,
    borderColor: (s: string) => string,
    mainModel: string,
  ) {
    this.iteration = iteration;
    this.title = title;
    this.task = task;
    this.borderColor = borderColor;
    this.mainModel = mainModel;
  }

  start(): void {
    this.frameIndex = 0;
    this.startTime = Date.now();
    this.recentTools = [];
    this.totalTools = 0;
    this.initialized = false;

    // Allocate fixed space
    for (let i = 0; i < this.fixedHeight; i++) {
      console.log('');
    }
    this.initialized = true;

    this.render();
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_DOTS.length;
      this.render();
    }, 80);
  }

  updateStatus(status: string): void {
    this.status = status;
  }

  addTool(tool: string, subagentModel?: 'opus' | 'sonnet' | 'haiku'): void {
    this.totalTools++;
    this.recentTools.push(tool);
    if (this.recentTools.length > 6) {
      this.recentTools.shift();
    }

    // Track subagent model usage
    if (subagentModel) {
      this.opsByModel[subagentModel]++;
    } else {
      // Non-Task tools are run by the main model
      this.opsByModel[this.mainModel as 'opus' | 'sonnet' | 'haiku']++;
    }

    this.render();
  }

  private render(): void {
    if (!this.initialized) return;

    const bc = this.borderColor;
    const boxWidth = getBoxWidth();
    const contentWidth = getContentWidth();

    // Move cursor to top of our render area
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));

    // Line 0: Top border
    const topBorder = bc(BOX.topLeft + BOX.horizontal.repeat(boxWidth - 2) + BOX.topRight);
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K${topBorder}\n`));

    // Line 1: [#N] Title
    const titleLine = `${amber(`[#${this.iteration}]`)} ${
      bold(truncate(this.title, contentWidth - 6))
    }`;
    this.renderContentLine(titleLine, contentWidth);

    // Line 2: Task description
    const taskLine = dim(truncate(this.task, contentWidth));
    this.renderContentLine(taskLine, contentWidth);

    // Line 3: Stats line (model, ops, time)
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const statsLine = this.formatStatsLine(elapsed);
    this.renderContentLine(statsLine, contentWidth);

    // Line 4: Spinner line
    const frame = orange(SPINNER_DOTS[this.frameIndex] ?? '◆');
    const time = elapsed > 0 ? dim(` (${elapsed}s)`) : '';
    const maxStatusLen = contentWidth - 12; // Leave room for spinner and time
    const spinnerLine = `${frame} ${truncate(this.status, maxStatusLen)}${time}`;
    this.renderContentLine(spinnerLine, contentWidth);

    // Line 5: Separator
    this.renderContentLine(dim('│'), contentWidth);

    // Lines 6-11: Tool slots
    for (let i = 0; i < 6; i++) {
      const tool = this.recentTools[i];
      if (tool) {
        const formatted = this.formatTool(tool, contentWidth);
        this.renderContentLine(`${dim('│')}  ${formatted}`, contentWidth);
      } else {
        this.renderContentLine(dim('│'), contentWidth);
      }
    }

    // Line 12: Bottom border
    const bottomBorder = bc(BOX.bottomLeft + BOX.horizontal.repeat(boxWidth - 2) + BOX.bottomRight);
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K${bottomBorder}\n`));
  }

  private renderContentLine(content: string, contentWidth: number): void {
    const bc = this.borderColor;
    const boxWidth = getBoxWidth();

    // Truncate content if too long, then pad to exact width
    const visLen = visibleLength(content);
    let finalContent = content;
    if (visLen > contentWidth) {
      // Need to truncate - this is tricky with ANSI codes
      finalContent = truncate(content, contentWidth);
    }
    const finalVisLen = visibleLength(finalContent);
    const padding = ' '.repeat(Math.max(0, contentWidth - finalVisLen));

    // Use cursor positioning to ensure right border is always in correct place
    // Clear line, write content, then position cursor at end for right border
    const leftPart = `${bc(BOX.vertical)} ${finalContent}${padding} `;
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[2K${leftPart}`));
    // Move to column boxWidth and write right border
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${boxWidth}G${bc(BOX.vertical)}\n`));
  }

  private formatTool(toolDisplay: string, contentWidth: number): string {
    const [toolName, ...rest] = toolDisplay.split(': ');
    const detail = rest.join(': ');
    const icon = this.getIcon(toolName ?? '');
    const maxDetailLen = contentWidth - 20; // Leave room for icon, tool name, padding

    if (detail) {
      return `${amber(icon)} ${dim(toolName + ':')} ${muted(truncate(detail, maxDetailLen))}`;
    }
    return `${amber(icon)} ${dim(toolName ?? toolDisplay)}`;
  }

  private getIcon(toolName: string): string {
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
        return ICONS.task;
      default:
        return '▸';
    }
  }

  private formatStatsLine(elapsed: number): string {
    const parts: string[] = [];

    // Model
    parts.push(`${dim('model:')} ${amber(this.mainModel)}`);

    // Operations count
    parts.push(`${dim('ops:')} ${this.totalTools}`);

    // Time
    if (elapsed > 0) {
      parts.push(`${dim('time:')} ${this.formatTime(elapsed)}`);
    }

    // Model breakdown if subagents used
    const mainModelOps = this.opsByModel[this.mainModel as 'opus' | 'sonnet' | 'haiku'] || 0;
    const subagentOps = this.totalTools - mainModelOps;
    if (subagentOps > 0) {
      const breakdown: string[] = [];
      if (this.opsByModel.opus > 0 && this.mainModel !== 'opus') {
        breakdown.push(`opus:${this.opsByModel.opus}`);
      }
      if (this.opsByModel.sonnet > 0 && this.mainModel !== 'sonnet') {
        breakdown.push(`sonnet:${this.opsByModel.sonnet}`);
      }
      if (breakdown.length > 0) {
        parts.push(`${dim('subagents:')} ${breakdown.join(' ')}`);
      }
    }

    return parts.join('  ·  ');
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs}s`;
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.initialized) return;

    // Clear the entire box area
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));
    for (let i = 0; i < this.fixedHeight; i++) {
      Deno.stdout.writeSync(textEncoder.encode('\x1b[2K\n'));
    }
    Deno.stdout.writeSync(textEncoder.encode(`\x1b[${this.fixedHeight}A`));
  }

  getStats(): {
    total: number;
    elapsed: number;
    byModel: { opus: number; sonnet: number; haiku: number };
  } {
    return {
      total: this.totalTools,
      elapsed: Math.floor((Date.now() - this.startTime) / 1000),
      byModel: { ...this.opsByModel },
    };
  }
}

export interface IterationRenderOptions {
  /** Iteration number (e.g., 1, 2, 3...) */
  iteration: number;
  /** Phase or section title */
  title: string;
  /** Task description */
  task: string;
  /** Border color function (orange for active) */
  borderColor: (s: string) => string;
  /** Main model being used (opus or sonnet) */
  model: string;
}

/**
 * Runs Claude and renders progress inside a bordered box.
 * Used by ralph work command for the active iteration display.
 */
export async function runIterationInBox(
  options: ClaudeRunOptions,
  renderOptions: IterationRenderOptions,
): Promise<ClaudeResult> {
  const { iteration, title, task, borderColor, model } = renderOptions;

  const renderer = new BoxedIterationRenderer(iteration, title, task, borderColor, model);
  const toolsCalled: string[] = [];
  let fullText = '';
  let hasExitSignal = false;

  renderer.start();

  try {
    for await (const event of runClaude(options)) {
      if (event.type === 'assistant') {
        const messages = parseAssistantMessage(event);

        for (const msg of messages) {
          if (msg.text) {
            fullText += msg.text;

            if (msg.text.includes('EXIT_SIGNAL: true')) {
              hasExitSignal = true;
            }

            // Update status with meaningful text
            const firstLine = msg.text.split('\n')[0]?.trim();
            if (
              firstLine && firstLine.length > 0 && !firstLine.startsWith('#') &&
              !firstLine.startsWith('`')
            ) {
              const maxLen = getContentWidth() - 12;
              renderer.updateStatus(truncate(firstLine, maxLen));
            }
          }

          if (msg.toolUse) {
            const toolDisplay = formatToolUse(msg.toolUse);
            toolsCalled.push(toolDisplay);
            renderer.addTool(toolDisplay, msg.toolUse.subagentModel);
          }
        }
      } else if (event.type === 'result') {
        const stats = renderer.getStats();
        renderer.stop();

        const data = event.data as Record<string, unknown>;
        const isError = data.is_error === true;
        const resultUsage = extractUsage(data, stats);

        // Add per-model breakdown
        const byModel: UsageStats['byModel'] = {};
        if (stats.byModel.opus > 0) byModel.opus = { operations: stats.byModel.opus };
        if (stats.byModel.sonnet > 0) byModel.sonnet = { operations: stats.byModel.sonnet };
        if (stats.byModel.haiku > 0) byModel.haiku = { operations: stats.byModel.haiku };

        return {
          success: !isError,
          text: fullText,
          toolsCalled,
          hasExitSignal,
          usage: { ...resultUsage, byModel: Object.keys(byModel).length > 0 ? byModel : undefined },
        };
      }
    }

    // Fallback if no result event
    const stats = renderer.getStats();
    renderer.stop();

    const byModel: UsageStats['byModel'] = {};
    if (stats.byModel.opus > 0) byModel.opus = { operations: stats.byModel.opus };
    if (stats.byModel.sonnet > 0) byModel.sonnet = { operations: stats.byModel.sonnet };
    if (stats.byModel.haiku > 0) byModel.haiku = { operations: stats.byModel.haiku };

    return {
      success: true,
      text: fullText,
      toolsCalled,
      hasExitSignal,
      usage: {
        durationSec: stats.elapsed,
        operations: stats.total,
        byModel: Object.keys(byModel).length > 0 ? byModel : undefined,
      },
    };
  } catch (_e) {
    const stats = renderer.getStats();
    renderer.stop();

    const byModel: UsageStats['byModel'] = {};
    if (stats.byModel.opus > 0) byModel.opus = { operations: stats.byModel.opus };
    if (stats.byModel.sonnet > 0) byModel.sonnet = { operations: stats.byModel.sonnet };
    if (stats.byModel.haiku > 0) byModel.haiku = { operations: stats.byModel.haiku };

    return {
      success: false,
      text: fullText,
      toolsCalled,
      hasExitSignal,
      usage: {
        durationSec: stats.elapsed,
        operations: stats.total,
        byModel: Object.keys(byModel).length > 0 ? byModel : undefined,
      },
    };
  }
}
