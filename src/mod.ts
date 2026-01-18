/**
 * @module ralph
 *
 * Ralph CLI - Autonomous development with Claude Code.
 *
 * Ralph implements the "Ralph Wiggum" technique for autonomous development:
 * - Fresh context each iteration
 * - One task per loop
 * - Files as the source of truth
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 *
 * @example
 * ```bash
 * # Initialize a project
 * ralph init
 *
 * # Add a feature spec
 * ralph spec
 *
 * # Generate implementation plan
 * ralph plan
 *
 * # Run the autonomous build loop
 * ralph work
 * ```
 */

import { runCli } from './cli/mod.ts';

// Run the CLI
if (import.meta.main) {
  await runCli();
}
