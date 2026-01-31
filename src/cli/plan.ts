/**
 * @module cli/plan
 *
 * The `ralph plan` command.
 * Launches Claude to perform gap analysis and generate IMPLEMENTATION_PLAN.md.
 *
 * Reference: https://github.com/ClaytonFarr/ralph-playbook
 */

import { Command } from '@cliffy/command';
import { error, muted } from '@/ui/colors.ts';
import { CROSS } from '@/ui/symbols.ts';
import { readConfig } from '@/services/project_service.ts';
import {
  isClaudeInstalled,
  parseAssistantMessage,
  runClaude,
} from '@/services/claude_service.ts';
import { exists, readTextFile } from '@/services/file_service.ts';
import { resolvePaths } from '@/services/path_resolver.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import { infoBox } from '@/ui/components.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
  showVibeActivated,
} from './vibe.ts';
import { renderPlan } from '@/components/PlanScreen.tsx';
import type { EnhancedToolCall } from '@/components/ui/ToolActivity.tsx';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Checks if there are any spec files in the specs directory.
 * Uses paths from config.
 */
async function hasSpecs(paths: { specs: string }): Promise<boolean> {
  if (!(await exists(paths.specs))) {
    return false;
  }

  // Check for any .md files (excluding .gitkeep)
  for await (const entry of Deno.readDir(paths.specs)) {
    if (entry.isFile && entry.name.endsWith('.md')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if implementation plan already exists.
 * Uses paths from config.
 */
async function hasPlan(paths: { plan: string }): Promise<boolean> {
  return await exists(paths.plan);
}

// ============================================================================
// Plan Execution
// ============================================================================

/**
 * Reads the planning prompt from the project's configured plan prompt file.
 * Path is resolved from .ralph.json config.
 */
async function readPlanPrompt(paths: { planPrompt: string }): Promise<string | null> {
  const result = await readTextFile(paths.planPrompt);
  return result.ok ? result.value : null;
}

// ============================================================================
// Command Action
// ============================================================================

interface PlanOptions {
  readonly vibe?: boolean;
  readonly model?: string;
}

/**
 * The plan command action.
 */
async function planAction(options: PlanOptions): Promise<void> {
  // Check for vibe loop mode (set by environment from vibe loop)
  const vibeEnvMode = Deno.env.get('RALPH_VIBE_MODE');
  if (vibeEnvMode === '1') {
    enableVibeMode();
  }

  // Handle explicit --vibe flag
  if (options.vibe && !isVibeMode()) {
    enableVibeMode();
    const nextSteps = getNextCommands('plan');
    showVibeActivated([
      'Generate implementation plan',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'work':
            return 'Run autonomous build loop';
          default:
            return cmd;
        }
      }),
    ]);
  }

  // Resolve paths from config (finds nearest .ralph.json)
  let paths;
  try {
    paths = await resolvePaths();
  } catch {
    console.log(error(`${CROSS} Not a Ralph project.`));
    console.log(muted('  Run `ralph init` first to initialize.'));
    Deno.exit(1);
  }

  // Check Claude CLI
  if (!(await isClaudeInstalled())) {
    console.log(error(`${CROSS} Claude CLI not found.`));
    console.log(muted('  Install from: https://docs.anthropic.com/claude-code'));
    Deno.exit(1);
  }

  // Check for specs
  if (!(await hasSpecs(paths))) {
    console.log();
    console.log(infoBox({
      title: 'No specs found',
      description:
        'Create spec files in specs/ first\n\n▸ Run ralph start to create specs via interview\n▸ Or create .md files manually in specs/',
    }));
    Deno.exit(1);
  }

  // Read config for model setting
  const configResult = await readConfig();

  // Determine model - precedence: --model flag > config > default (opus)
  let model: 'opus' | 'sonnet';
  if (options.model === 'opus' || options.model === 'sonnet') {
    model = options.model;
  } else if (options.model) {
    console.log();
    console.log(infoBox({
      title: 'Invalid model',
      description: `Model must be 'opus' or 'sonnet'. Got: ${options.model}`,
    }));
    Deno.exit(1);
  } else {
    // Use config or default to opus
    const configModel = configResult.ok ? configResult.value.work.model : 'opus';
    // If config says adaptive, default to opus for planning
    model = (configModel === 'opus' || configModel === 'sonnet') ? configModel : 'opus';
  }

  // Fetch initial subscription usage
  const initialUsage = await getSubscriptionUsage();

  // Read the prompt
  const prompt = await readPlanPrompt(paths);
  if (!prompt) {
    console.log();
    console.log(infoBox({
      title: 'Plan prompt file not found',
      description: `Expected: ${paths.planPrompt}\nRun \`ralph init\` to create the prompt file.`,
    }));
    Deno.exit(1);
  }

  // Run planning with React UI
  const success = await renderPlan({
    model,
    usage: initialUsage.ok ? initialUsage.value : undefined,
    vibeMode: isVibeMode(),
    onRun: async ({ onToolUse, onStatusUpdate }) => {
      let currentToolId: string | null = null;
      try {
        let hasError = false;
        let toolCounter = 0;

        for await (const event of runClaude({ prompt, model, skipPermissions: true })) {
          if (event.type === 'assistant') {
            const messages = parseAssistantMessage(event);

            for (const msg of messages) {
              if (msg.text) {
                // Get first paragraph or substantial text for status (allow multi-line display)
                const firstParagraph = msg.text.split('\n\n')[0]?.trim().replace(/\n/g, ' ');
                if (firstParagraph && firstParagraph.length > 0 && !firstParagraph.startsWith('#') && !firstParagraph.startsWith('`')) {
                  // Allow up to 300 chars for multi-line status display
                  onStatusUpdate(firstParagraph.length > 300 ? firstParagraph.slice(0, 297) + '...' : firstParagraph);
                }
              }

              if (msg.toolUse) {
                // Mark previous tool as completed
                if (currentToolId) {
                  onToolUse({
                    id: currentToolId,
                    name: '',
                    status: 'success',
                    endTime: Date.now(),
                    input: {},
                  });
                }

                toolCounter++;
                const toolId = `plan-${toolCounter}`;
                currentToolId = toolId;

                // Extract input from tool use
                const toolInput = msg.toolUse.input ?? {};

                // Emit running tool
                onToolUse({
                  id: toolId,
                  name: msg.toolUse.name,
                  status: 'running',
                  startTime: Date.now(),
                  input: toolInput as Record<string, unknown>,
                });
              }
            }
          } else if (event.type === 'result') {
            const data = event.data as Record<string, unknown>;
            hasError = data.is_error === true;

            // Mark last tool as completed
            if (currentToolId) {
              onToolUse({
                id: currentToolId,
                name: '',
                status: hasError ? 'error' : 'success',
                endTime: Date.now(),
                input: {},
              });
              currentToolId = null;
            }
          }
        }

        return {
          success: !hasError,
          outputPath: 'IMPLEMENTATION_PLAN.md',
        };
      } catch (e) {
        // Mark last tool as error if running
        if (currentToolId) {
          onToolUse({
            id: currentToolId,
            name: '',
            status: 'error',
            endTime: Date.now(),
            input: {},
          });
        }
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });

  if (success) {
    // Continue vibe flow if active
    await continueVibeFlow('plan');
    // Exit cleanly if not in vibe mode (vibe mode handles its own exit)
    if (!isVibeMode()) {
      Deno.exit(0);
    }
  } else {
    Deno.exit(1);
  }
}

/**
 * Creates the plan command.
 */
// deno-lint-ignore no-explicit-any
export function createPlanCommand(): Command<any> {
  return new Command()
    .description('Generate implementation plan from specs (gap analysis)')
    .option('--model <model:string>', 'Model to use (opus or sonnet). Default: from config or opus')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .action(planAction);
}
