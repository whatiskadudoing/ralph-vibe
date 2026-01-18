/**
 * @module ui/components
 *
 * Reusable UI components for Ralph CLI.
 * These components provide consistent styling across all commands.
 */

import { createBox } from './box.ts';
import { progressBar } from './symbols.ts';
import {
  amber,
  bold,
  dim,
  error as errorColor,
  orange,
  success as successColor,
} from './colors.ts';
import { CHECK, CROSS, INFO } from './symbols.ts';
import { getTerminalWidth } from './claude_renderer.ts';
import type { SubscriptionUsage } from '@/services/usage_service.ts';

// ============================================================================
// Usage Progress Bars
// ============================================================================

/**
 * Formats subscription usage as progress bars.
 */
export function formatUsageProgressBars(usage: SubscriptionUsage): string[] {
  const fiveHr = usage.fiveHour.utilization;
  const sevenDay = usage.sevenDay.utilization;
  const termWidth = getTerminalWidth();
  const barWidth = termWidth - 22;

  return [
    `5h:  ${amber(progressBar(fiveHr, barWidth))}`,
    '',
    `7d:  ${dim(progressBar(sevenDay, barWidth))}`,
  ];
}

// ============================================================================
// Command Header
// ============================================================================

export interface CommandHeaderOptions {
  /** Command name (e.g., "Ralph Init") */
  readonly name: string;
  /** Description shown below the name */
  readonly description: string;
  /** Subscription usage to show progress bars */
  readonly usage?: SubscriptionUsage;
}

/**
 * Creates a command header box with optional usage progress bars.
 */
export function commandHeader(options: CommandHeaderOptions): string {
  const termWidth = getTerminalWidth();
  const headerLines = [
    `${orange('◆')} ${bold(options.name)}`,
    dim(options.description),
  ];

  if (options.usage) {
    headerLines.push('');
    headerLines.push(...formatUsageProgressBars(options.usage));
  }

  return createBox(headerLines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    minWidth: termWidth - 6,
  });
}

// ============================================================================
// Status Boxes
// ============================================================================

export interface StatusBoxOptions {
  /** Label shown in amber brackets (e.g., "[1/2]", "[Planning]") */
  readonly label: string;
  /** Main title text */
  readonly title: string;
  /** Description shown below the title */
  readonly description: string;
  /** Whether this is an active (orange) or completed (dim) status */
  readonly active?: boolean;
}

/**
 * Creates a status box for showing progress stages.
 * Active boxes have orange border, completed boxes have dim border.
 */
export function statusBox(options: StatusBoxOptions): string {
  const termWidth = getTerminalWidth();
  const borderColor = options.active !== false ? orange : dim;
  const labelColor = options.active !== false ? amber : dim;

  return createBox(
    `${labelColor(options.label)} ${bold(options.title)}\n${dim(options.description)}`,
    { style: 'rounded', padding: 1, paddingY: 0, borderColor, minWidth: termWidth - 6 },
  );
}

/**
 * Creates a completion status box showing the result of a stage.
 */
export function completionBox(label: string, title: string, stats?: string): string {
  const termWidth = getTerminalWidth();
  const content = stats
    ? `${dim(label)} ${bold(title)} ${successColor(CHECK)}\n${dim(stats)}`
    : `${dim(label)} ${bold(title)} ${successColor(CHECK)}`;

  return createBox(content, {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: dim,
    minWidth: termWidth - 6,
  });
}

// ============================================================================
// Info & Warning Boxes
// ============================================================================

export interface InfoBoxOptions {
  /** Main title text */
  readonly title: string;
  /** Description shown below the title */
  readonly description: string;
}

/**
 * Creates an info box (amber border).
 */
export function infoBox(options: InfoBoxOptions): string {
  const termWidth = getTerminalWidth();
  return createBox(
    `${amber(INFO)} ${bold(options.title)}\n${dim(options.description)}`,
    { style: 'rounded', padding: 1, paddingY: 0, borderColor: amber, minWidth: termWidth - 6 },
  );
}

// ============================================================================
// Success & Error Boxes
// ============================================================================

export interface NextStep {
  readonly text: string;
  readonly command?: string;
}

export interface SuccessBoxOptions {
  /** Success title */
  readonly title: string;
  /** Lines of detail to show */
  readonly details?: string[];
  /** Next steps to show */
  readonly nextSteps?: NextStep[];
  /** Subscription usage info line */
  readonly usageInfo?: string;
}

/**
 * Creates a success box with optional next steps.
 */
export function successBox(options: SuccessBoxOptions): string {
  const termWidth = getTerminalWidth();
  const lines = [
    `${orange('◆')} ${bold(options.title)}`,
    '',
  ];

  if (options.details && options.details.length > 0) {
    for (const detail of options.details) {
      lines.push(`${dim('→')} ${detail}`);
    }
  }

  if (options.usageInfo) {
    lines.push(`${dim('→')} ${options.usageInfo}`);
  }

  if (options.nextSteps && options.nextSteps.length > 0) {
    lines.push('');
    lines.push(bold('Next steps:'));
    for (const step of options.nextSteps) {
      if (step.command) {
        lines.push(`  ${orange('▸')} ${step.text} ${amber(step.command)}`);
      } else {
        lines.push(`  ${orange('▸')} ${step.text}`);
      }
    }
  }

  return createBox(lines.join('\n'), {
    style: 'rounded',
    padding: 1,
    paddingY: 0,
    borderColor: orange,
    minWidth: termWidth - 6,
  });
}

export interface ErrorBoxOptions {
  /** Error title */
  readonly title: string;
  /** Error description or hint */
  readonly description: string;
}

/**
 * Creates an error box.
 */
export function errorBox(options: ErrorBoxOptions): string {
  const termWidth = getTerminalWidth();
  return createBox(
    `${errorColor(CROSS)} ${bold(options.title)}\n${dim(options.description)}`,
    { style: 'rounded', padding: 1, paddingY: 0, borderColor: errorColor, minWidth: termWidth - 6 },
  );
}

// ============================================================================
// Prerequisite Checks
// ============================================================================

/**
 * Creates a prerequisite check header box.
 */
export function prerequisiteHeader(): string {
  const termWidth = getTerminalWidth();
  return createBox(
    `${amber('[Checking]')} ${bold('Prerequisites')}`,
    { style: 'rounded', padding: 1, paddingY: 0, borderColor: orange, minWidth: termWidth - 6 },
  );
}

/**
 * Formats a successful check line.
 */
export function checkSuccess(message: string, detail?: string): string {
  return detail
    ? `  ${successColor(CHECK)} ${message} ${dim(`(${detail})`)}`
    : `  ${successColor(CHECK)} ${message}`;
}

/**
 * Formats an info check line.
 */
export function checkInfo(message: string, hint?: string): string {
  return hint ? `  ${amber(INFO)} ${message} ${dim(`(${hint})`)}` : `  ${amber(INFO)} ${message}`;
}
