/**
 * @module cli/research
 *
 * The `ralph research` command.
 * Launches Claude to research APIs, find inspiration, and validate before planning.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { dim, error, muted } from '@/ui/colors.ts';
import { CROSS, INFO } from '@/ui/symbols.ts';
import { readConfig } from '@/services/project_service.ts';
import { isClaudeInstalled, parseAssistantMessage, runClaude } from '@/services/claude_service.ts';
import { createDirectory, exists } from '@/services/file_service.ts';
import { resolvePaths } from '@/services/path_resolver.ts';
import { getSubscriptionUsage } from '@/services/usage_service.ts';
import { errorBox, infoBox } from '@/ui/components.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
  showVibeActivated,
} from './vibe.ts';
import {
  type EnhancedToolCall,
  renderResearch,
  type ResearchStats,
} from '@/components/ResearchScreen.tsx';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Checks if there are any spec files in the specs directory.
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
 * Checks if AUDIENCE_JTBD.md exists and has content.
 */
async function hasAudienceJtbd(paths: { audienceJtbd: string }): Promise<boolean> {
  if (!(await exists(paths.audienceJtbd))) {
    return false;
  }

  try {
    const content = await Deno.readTextFile(paths.audienceJtbd);
    // Check if it's not just the template
    return !content.includes('(To be discovered)');
  } catch {
    return false;
  }
}

/**
 * Checks if research folder exists with content.
 */
async function hasResearch(paths: { research: string }): Promise<boolean> {
  const readinessPath = `${paths.research}/readiness.md`;
  return await exists(readinessPath);
}

/**
 * Ensures research folder structure exists.
 */
async function ensureResearchFolder(paths: { research: string }): Promise<void> {
  const researchDir = paths.research;
  const apisDir = `${researchDir}/apis`;
  const approachesDir = `${researchDir}/approaches`;

  // Create directories if they don't exist
  if (!(await exists(researchDir))) {
    await createDirectory(researchDir);
  }
  if (!(await exists(apisDir))) {
    await createDirectory(apisDir);
  }
  if (!(await exists(approachesDir))) {
    await createDirectory(approachesDir);
  }
}

// ============================================================================
// Research Execution
// ============================================================================

/**
 * Reads the research prompt from the project's configured research prompt file.
 */
async function readResearchPrompt(paths: { researchPrompt: string }): Promise<string | null> {
  try {
    return await Deno.readTextFile(paths.researchPrompt);
  } catch {
    return null;
  }
}

/**
 * Runs the research phase with Ink UI.
 */
const runResearch = async (
  model: 'opus' | 'sonnet',
  paths: { researchPrompt: string },
  vibeMode: boolean,
): Promise<{
  success: boolean;
  stats?: ResearchStats;
}> => {
  // Read prompt from project's configured research prompt file
  const prompt = await readResearchPrompt(paths);
  if (!prompt) {
    console.log(errorBox({
      title: 'Research prompt file not found',
      description:
        `Expected: ${paths.researchPrompt}\nRun \`ralph init\` to create the prompt file.`,
    }));
    return { success: false };
  }

  // Get initial usage for display
  const initialUsage = await getSubscriptionUsage();

  // Determine vibe steps
  const vibeSteps = vibeMode ? getNextCommands('research') : undefined;

  // Run research with Ink UI
  const result = await renderResearch({
    model,
    usage: initialUsage.ok ? initialUsage.value : undefined,
    vibeMode,
    vibeSteps,
    onRun: async (callbacks) => {
      const { onToolUse, onStatusUpdate, onTokenUpdate } = callbacks;

      let fullText = '';
      let hasError = false;
      const startTime = Date.now();
      let operationCount = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;

      try {
        for await (const event of runClaude({ prompt, model, skipPermissions: true })) {
          if (event.type === 'assistant') {
            const messages = parseAssistantMessage(event);

            for (const msg of messages) {
              if (msg.text) {
                fullText += msg.text;

                // Update status with meaningful text
                const firstLine = msg.text.split('\n')[0]?.trim();
                if (
                  firstLine && firstLine.length > 0 && !firstLine.startsWith('#') &&
                  !firstLine.startsWith('`')
                ) {
                  onStatusUpdate(firstLine);
                }
              }

              if (msg.toolUse) {
                operationCount++;

                // Create EnhancedToolCall
                const enhancedTool: EnhancedToolCall = {
                  id: `tool-${operationCount}`,
                  name: msg.toolUse.name,
                  status: 'running',
                  startTime: Date.now(),
                  input: msg.toolUse.input ?? {},
                };

                onToolUse(enhancedTool);

                // Mark as complete
                setTimeout(() => {
                  onToolUse({
                    ...enhancedTool,
                    status: 'success',
                    endTime: Date.now(),
                  });
                }, 100);
              }
            }
          } else if (event.type === 'result') {
            const data = event.data as Record<string, unknown>;
            const isError = data.is_error === true;

            if (isError) {
              hasError = true;
            }

            // Extract token usage
            const usage = data.usage as Record<string, number> | undefined;
            const result = data.result as Record<string, unknown> | undefined;
            const resultUsage = result?.usage as Record<string, number> | undefined;

            inputTokens = usage?.input_tokens ?? resultUsage?.input_tokens ?? 0;
            outputTokens = usage?.output_tokens ?? resultUsage?.output_tokens ?? 0;
            cacheReadTokens = usage?.cache_read_input_tokens ??
              resultUsage?.cache_read_input_tokens ?? 0;

            if (onTokenUpdate && (inputTokens > 0 || outputTokens > 0)) {
              onTokenUpdate(inputTokens, outputTokens);
            }
          }
        }

        const durationSec = Math.floor((Date.now() - startTime) / 1000);

        return {
          success: !hasError,
          stats: {
            operations: operationCount,
            durationSec,
            inputTokens: inputTokens > 0 ? inputTokens : undefined,
            outputTokens: outputTokens > 0 ? outputTokens : undefined,
            cacheReadTokens: cacheReadTokens > 0 ? cacheReadTokens : undefined,
          },
        };
      } catch (e) {
        const durationSec = Math.floor((Date.now() - startTime) / 1000);
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
          stats: {
            operations: operationCount,
            durationSec,
            inputTokens: inputTokens > 0 ? inputTokens : undefined,
            outputTokens: outputTokens > 0 ? outputTokens : undefined,
          },
        };
      }
    },
  });

  return { success: result.success, stats: result.stats };
};

// ============================================================================
// Command Action
// ============================================================================

interface ResearchOptions {
  readonly vibe?: boolean;
  readonly model?: string;
}

/**
 * The research command action.
 */
async function researchAction(options: ResearchOptions): Promise<void> {
  // Check for vibe loop mode (set by environment from vibe loop)
  const vibeEnvMode = Deno.env.get('RALPH_VIBE_MODE');
  if (vibeEnvMode === '1') {
    enableVibeMode();
  }

  // Handle explicit --vibe flag
  if (options.vibe && !isVibeMode()) {
    enableVibeMode();
    const nextSteps = getNextCommands('research');
    showVibeActivated([
      'Research & Discovery',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'plan':
            return 'Generate implementation plan';
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

  // Check for audience & jobs
  if (!(await hasAudienceJtbd(paths))) {
    console.log();
    console.log(infoBox({
      title: 'Audience not defined',
      description:
        'Define your audience and jobs-to-be-done first.\n\n▸ Run `ralph audience` or `ralph start`',
    }));
    Deno.exit(1);
  }

  // Check for specs
  if (!(await hasSpecs(paths))) {
    console.log();
    console.log(infoBox({
      title: 'No specs found',
      description:
        'Create spec files in specs/ first\n\n▸ Run `ralph start` to create specs via interview\n▸ Or create .md files manually in specs/',
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
    // If config says adaptive, default to opus for research
    model = (configModel === 'opus' || configModel === 'sonnet') ? configModel : 'opus';
  }

  // Ensure research folder exists
  await ensureResearchFolder(paths);

  // Check if research already exists and show info
  if (await hasResearch(paths)) {
    console.log();
    console.log(`${dim(INFO)} Existing research found - will update with new findings`);
    console.log();
  }

  // Run research with Ink UI
  const result = await runResearch(model, paths, isVibeMode());

  if (result.success) {
    // Continue vibe flow if active
    await continueVibeFlow('research');
    // Exit cleanly if not in vibe mode (vibe mode handles its own exit)
    if (!isVibeMode()) {
      Deno.exit(0);
    }
  } else {
    console.log();
    console.log(errorBox({
      title: 'Research failed',
      description: 'Check the error above and try again.',
    }));
    Deno.exit(1);
  }
}

/**
 * Creates the research command.
 */
// deno-lint-ignore no-explicit-any
export function createResearchCommand(): Command<any> {
  return new Command()
    .description('Research APIs, find inspiration, validate before planning')
    .option('--model <model:string>', 'Model to use (opus or sonnet). Default: from config or opus')
    .option('--vibe', 'Vibe mode (default) - automatically continue to subsequent steps. Use --no-vibe to disable', {
      default: true,
    })
    .action(researchAction);
}
