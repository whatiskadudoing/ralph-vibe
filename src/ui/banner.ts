/**
 * @module ui/banner
 *
 * ASCII art banner for the CLI.
 */

import { dim, muted, primary } from './colors.ts';
import denoConfig from '../../deno.json' with { type: 'json' };

/**
 * The Ralph ASCII art logo.
 */
const RALPH_ASCII = `
    ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║
    ██████╔╝███████║██║     ██████╔╝███████║
    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║
    ██║  ██║██║  ██║███████╗██║     ██║  ██║
    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝
`.trim();

/**
 * A simpler, smaller banner for tight spaces.
 */
const RALPH_SMALL = `
 ╦═╗╔═╗╦  ╔═╗╦ ╦
 ╠╦╝╠═╣║  ╠═╝╠═╣
 ╩╚═╩ ╩╩═╝╩  ╩ ╩
`.trim();

/**
 * Minimal text-only banner.
 */
const RALPH_MINIMAL = 'RALPH';

export interface BannerOptions {
  /** The version to display. */
  readonly version?: string;
  /** The tagline to display. */
  readonly tagline?: string;
  /** Banner size: 'large', 'small', or 'minimal'. */
  readonly size?: 'large' | 'small' | 'minimal';
}

const DEFAULT_OPTIONS: Required<BannerOptions> = {
  version: denoConfig.version,
  tagline: 'Autonomous AI Development',
  size: 'large',
};

/**
 * Generates the ASCII art banner.
 * Pure function - returns the banner as a string.
 */
export function createBanner(options: BannerOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const logo = opts.size === 'large'
    ? RALPH_ASCII
    : opts.size === 'small'
    ? RALPH_SMALL
    : RALPH_MINIMAL;

  const coloredLogo = primary(logo);

  const versionLine = opts.version ? dim(`v${opts.version}`) : '';
  const taglineLine = opts.tagline ? muted(opts.tagline) : '';

  const lines: string[] = ['', coloredLogo, ''];

  if (taglineLine || versionLine) {
    const infoLine = [taglineLine, versionLine].filter(Boolean).join('  ');
    lines.push(`    ${infoLine}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Creates a welcome message for the init command.
 */
export function createWelcomeMessage(): string {
  return [
    createBanner({ size: 'large' }),
    `    ${muted("Welcome! Let's set up your project for autonomous development.")}`,
    '',
  ].join('\n');
}

/**
 * Creates a simple header line for commands.
 */
export function createHeader(title: string): string {
  return `${primary('▶')} ${title}`;
}

/**
 * Creates a section divider.
 */
export function createDivider(width = 60): string {
  return muted('─'.repeat(width));
}
