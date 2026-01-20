/**
 * @module cli/plan
 *
 * The `ralph plan` command.
 * Launches Claude to perform gap analysis and generate IMPLEMENTATION_PLAN.md.
 *
 * Reference: https://github.com/ClaytonFarr/ralph-playbook
 */

import { Command } from '@cliffy/command';
import { amber, dim, error, muted } from '@/ui/colors.ts';
import { CROSS, INFO } from '@/ui/symbols.ts';
import { isRalphProject, readConfig } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import { exists, getPlanPath, getPlanPromptPath, getSpecsDir } from '@/services/file_service.ts';
import { getTerminalWidth, runAndRender } from '@/ui/claude_renderer.ts';
import { createBox } from '@/ui/box.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  commandHeader,
  errorBox,
  infoBox,
  statusBox,
  successBox,
} from '@/ui/components.ts';
import {
  continueVibeFlow,
  enableVibeMode,
  getNextCommands,
  isVibeMode,
  showVibeActivated,
} from './vibe.ts';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Checks if there are any spec files in the specs directory.
 */
async function hasSpecs(cwd?: string): Promise<boolean> {
  const specsDir = getSpecsDir(cwd);

  if (!(await exists(specsDir))) {
    return false;
  }

  // Check for any .md files (excluding .gitkeep)
  for await (const entry of Deno.readDir(specsDir)) {
    if (entry.isFile && entry.name.endsWith('.md')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if implementation plan already exists.
 */
async function hasPlan(cwd?: string): Promise<boolean> {
  const planPath = getPlanPath(cwd);
  return await exists(planPath);
}

// ============================================================================
// Plan Execution
// ============================================================================

/**
 * Reads the planning prompt from the project's PROMPT_plan.md file.
 */
async function readPlanPrompt(): Promise<string | null> {
  const promptPath = getPlanPromptPath();
  try {
    return await Deno.readTextFile(promptPath);
  } catch {
    return null;
  }
}

/**
 * Runs the planning phase with a single model.
 * The model uses subagents internally for parallel analysis.
 */
const runPlan = async (
  model: 'opus' | 'sonnet',
): Promise<{ success: boolean; usage: { before: number | null; after: number | null } }> => {
  const usageBefore = await getSubscriptionUsage();
  const beforeVal = usageBefore.ok ? usageBefore.value.fiveHour.utilization : null;

  // Read prompt from project's PROMPT_plan.md
  const prompt = await readPlanPrompt();
  if (!prompt) {
    console.log(errorBox({
      title: 'PROMPT_plan.md not found',
      description: 'Run `ralph init` to create the prompt file.',
    }));
    return { success: false, usage: { before: beforeVal, after: null } };
  }

  console.log(statusBox({
    label: `[${model}]`,
    title: 'Gap Analysis & Planning',
    description: 'Studying specs, searching codebase, generating plan',
    active: true,
  }));
  console.log();

  const result = await runAndRender(
    {
      prompt,
      model,
      skipPermissions: true,
    },
    {
      showSpinner: true,
      showTools: true,
      showStats: false,
    },
  );

  const usageAfter = await getSubscriptionUsage();
  const afterVal = usageAfter.ok ? usageAfter.value.fiveHour.utilization : null;

  return { success: result.success, usage: { before: beforeVal, after: afterVal } };
};

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
  // Handle vibe mode
  if (options.vibe) {
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

  // Check if initialized
  if (!(await isRalphProject())) {
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
  if (!(await hasSpecs())) {
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

  // Show header
  console.log();
  console.log(commandHeader({
    name: 'Ralph Plan',
    description: 'Generate implementation plan from specs',
    usage: initialUsage.ok ? initialUsage.value : undefined,
  }));
  console.log();

  // Check if plan already exists
  if (await hasPlan()) {
    const termWidth = getTerminalWidth();
    console.log(createBox(
      `${dim(INFO)} Existing plan found - will regenerate from current specs`,
      { style: 'rounded', padding: 1, paddingY: 0, borderColor: dim, minWidth: termWidth - 6 },
    ));
    console.log();
  }

  // Run planning
  const result = await runPlan(model);

  console.log();

  // Get final usage for delta calculation
  const finalUsage = await getSubscriptionUsage();
  let usageDelta: number | undefined;
  if (result.usage.before !== null && result.usage.after !== null) {
    usageDelta = result.usage.after - result.usage.before;
  }

  if (result.success) {
    let usageInfo: string | undefined;
    if (finalUsage.ok) {
      usageInfo = `Subscription: ${formatSubscriptionUsage(finalUsage.value)}`;
      if (usageDelta !== undefined && usageDelta > 0) {
        usageInfo += ` ${amber(`(+${usageDelta.toFixed(1)}%)`)}`;
      }
    }

    if (isVibeMode()) {
      console.log(successBox({
        title: 'Plan Generated!',
        details: ['Implementation plan: IMPLEMENTATION_PLAN.md'],
        usageInfo,
      }));
    } else {
      console.log(successBox({
        title: 'Plan Generated!',
        details: ['Implementation plan: IMPLEMENTATION_PLAN.md'],
        usageInfo,
        nextSteps: [
          { text: 'Review the plan in', command: 'IMPLEMENTATION_PLAN.md' },
          { text: 'Run', command: 'ralph work' },
          { text: 'Or run', command: 'ralph spec' },
        ],
      }));
    }

    // Continue vibe flow if active
    await continueVibeFlow('plan');
  } else {
    console.log(errorBox({
      title: 'Planning failed',
      description: 'Check the error above and try again.',
    }));
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
