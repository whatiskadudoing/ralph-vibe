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
import { createOnboardCommand } from './onboard.ts';
import { createStartCommand } from './start.ts';
import { createPlanCommand } from './plan.ts';
import { createWorkCommand } from './work.ts';
import { createSpecCommand } from './spec.ts';
import { createBanner } from '@/ui/banner.ts';
import { bold, dim, muted, orange } from '@/ui/colors.ts';
import denoConfig from '../../deno.json' with { type: 'json' };

// ============================================================================
// Version
// ============================================================================

const VERSION = denoConfig.version;
const DESCRIPTION = 'Ralph Vibe - Autonomous development with Claude Code';

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
    .description(DESCRIPTION)
    .action(() => {
      // Show help when no command is provided
      console.log(createBanner());
      console.log();
      console.log(orange('Ralph Vibe') + dim(' - Autonomous development with Claude Code'));
      console.log(muted('Based on: https://github.com/ghuntley/how-to-ralph-wiggum'));
      console.log();
      console.log(bold('Usage:'));
      console.log(`  ${orange('ralph <command>')}       ${dim('Run a specific command')}`);
      console.log(
        `  ${orange('ralph <command> --vibe')} ${dim('Run command and continue automatically')}`,
      );
      console.log();
      console.log(bold('Commands:'));
      console.log(`  ${orange('init')}     ${dim('Initialize a new Ralph project')}`);
      console.log(`  ${orange('onboard')}  ${dim('Analyze existing project & create Ralph files')}`);
      console.log(`  ${orange('start')}    ${dim('Interactive interview to create first specs')}`);
      console.log(`  ${orange('spec')}     ${dim('Add a new feature spec via interview')}`);
      console.log(`  ${orange('plan')}     ${dim('Generate implementation plan from specs')}`);
      console.log(`  ${orange('work')}     ${dim('Run the autonomous build loop')}`);
      console.log();
      console.log(bold('Vibe Mode:'));
      console.log(dim('  Add --vibe to any command to automatically continue the flow:'));
      console.log(`  ${muted('ralph init --vibe')}     ${dim('→ init → start → plan → work')}`);
      console.log(`  ${muted('ralph onboard --vibe')}  ${dim('→ onboard → spec → plan → work')}`);
      console.log(`  ${muted('ralph spec --vibe')}     ${dim('→ spec → plan → work')}`);
      console.log(`  ${muted('ralph plan --vibe')}     ${dim('→ plan → work')}`);
      console.log();
      console.log(bold('Parallel Mode (Experimental):'));
      console.log(dim('  Run multiple workers in parallel with isolated git worktrees:'));
      console.log(`  ${muted('ralph work --experimental-parallel 3')}`);
      console.log(`  ${muted('ralph plan --vibe --experimental-parallel 3')}`);
      console.log();
      console.log(muted('Run `ralph <command> --help` for more information.'));
    })
    // Add subcommands
    .command('init', createInitCommand())
    .command('onboard', createOnboardCommand())
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
