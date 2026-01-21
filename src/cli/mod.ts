/**
 * @module cli
 *
 * Ralph Vibe CLI entry point.
 * Autonomous development with Claude Code.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { createInitCommand } from './init.ts';
import { createStartCommand } from './start.ts';
import { createPlanCommand } from './plan.ts';
import { createWorkCommand } from './work.ts';
import { createSpecCommand } from './spec.ts';
import { renderVersion, renderHelp } from '@components/mod.ts';
import denoConfig from '../../deno.json' with { type: 'json' };

// ============================================================================
// Version
// ============================================================================

const VERSION = denoConfig.version;
const DESCRIPTION = 'Ralph Vibe - Autonomous development with Claude Code';

/**
 * Custom version action using deno-ink for rendering.
 */
function showVersion(): void {
  renderVersion();
  Deno.exit(0);
}

/**
 * Custom help action using deno-ink for rendering.
 */
async function showHelp(): Promise<void> {
  await renderHelp(VERSION);
  Deno.exit(0);
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Creates the main Ralph CLI program.
 */
// deno-lint-ignore no-explicit-any
export function createProgram(): Command<any> {
  return new Command()
    .name('ralph')
    .version(VERSION)
    .versionOption('-v, --version', 'Show version information', showVersion)
    .helpOption('-h, --help', 'Show help information', showHelp)
    .description(DESCRIPTION)
    .action(async () => {
      // Show help when no command is provided
      await showHelp();
    })
    // Add subcommands
    .command('init', createInitCommand())
    .command('start', createStartCommand())
    .command('spec', createSpecCommand())
    .command('plan', createPlanCommand())
    .command('work', createWorkCommand());
}

/**
 * Runs the CLI.
 */
export async function runCli(args: string[] = Deno.args): Promise<void> {
  const program = createProgram();

  try {
    await program.parse(args);
  } catch (error) {
    // Cliffy handles errors and exits, but catch any unexpected ones
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    Deno.exit(1);
  }
}
