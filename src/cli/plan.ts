/**
 * @module cli/plan
 *
 * The `ralph plan` command.
 * Launches Claude to perform gap analysis and generate IMPLEMENTATION_PLAN.md.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { Command } from '@cliffy/command';
import { amber, dim, error, muted } from '@/ui/colors.ts';
import { CROSS, INFO } from '@/ui/symbols.ts';
import { isRalphProject } from '@/services/project_service.ts';
import { isClaudeInstalled } from '@/services/claude_service.ts';
import {
  renderAnalysisPrompt,
  renderPlanCommandPrompt,
  renderSynthesisPrompt,
} from '@/core/templates.ts';
import { exists, getPlanPath, getSpecsDir } from '@/services/file_service.ts';
import { getTerminalWidth, runAndRender } from '@/ui/claude_renderer.ts';
import { createBox } from '@/ui/box.ts';
import { formatSubscriptionUsage, getSubscriptionUsage } from '@/services/usage_service.ts';
import {
  commandHeader,
  completionBox,
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
  setVibeOptions,
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
// Plan Strategies
// ============================================================================

/**
 * Two-stage planning: Sonnet analyzes, Opus synthesizes.
 */
const runTwoStagePlan = async (): Promise<
  { success: boolean; usage: { before: number | null; after: number | null } }
> => {
  const usageBefore = await getSubscriptionUsage();
  const beforeVal = usageBefore.ok ? usageBefore.value.fiveHour.utilization : null;

  // Stage 1: Analysis with Sonnet
  console.log(statusBox({
    label: '[1/2]',
    title: 'Analyzing Codebase',
    description: 'Reading specs and searching for existing implementation',
    active: true,
  }));
  console.log();

  const analysisResult = await runAndRender(
    {
      prompt: renderAnalysisPrompt(),
      model: 'sonnet',
      skipPermissions: true,
    },
    {
      showSpinner: true,
      showTools: true,
      showStats: false,
    },
  );

  if (!analysisResult.success) {
    return { success: false, usage: { before: beforeVal, after: null } };
  }

  // Show stage 1 complete
  console.log(completionBox(
    '[1/2]',
    'Analysis complete',
    `${analysisResult.usage.operations} ops · ${analysisResult.usage.durationSec}s`,
  ));
  console.log();

  // Stage 2: Synthesis with Opus
  console.log(statusBox({
    label: '[2/2]',
    title: 'Generating Plan',
    description: 'Creating prioritized implementation tasks',
    active: true,
  }));
  console.log();

  const synthesisResult = await runAndRender(
    {
      prompt: renderSynthesisPrompt(analysisResult.text),
      model: 'opus',
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

  if (!synthesisResult.success) {
    return { success: false, usage: { before: beforeVal, after: afterVal } };
  }

  // Show stage 2 complete
  console.log(completionBox(
    '[2/2]',
    'Plan generated',
    `${synthesisResult.usage.operations} ops · ${synthesisResult.usage.durationSec}s`,
  ));

  return { success: true, usage: { before: beforeVal, after: afterVal } };
};

/**
 * Single-stage planning: One model does everything.
 */
const runSingleStagePlan = async (
  model: 'opus' | 'sonnet',
): Promise<{ success: boolean; usage: { before: number | null; after: number | null } }> => {
  const usageBefore = await getSubscriptionUsage();
  const beforeVal = usageBefore.ok ? usageBefore.value.fiveHour.utilization : null;

  console.log(statusBox({
    label: '[Planning]',
    title: 'Gap Analysis',
    description: `Using ${model} to analyze specs and generate tasks`,
    active: true,
  }));
  console.log();

  const result = await runAndRender(
    {
      prompt: renderPlanCommandPrompt(),
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
  readonly fast?: boolean;
  readonly vibe?: boolean;
  readonly model?: string;
  readonly experimentalParallel?: number;
}

/**
 * The plan command action.
 */
async function planAction(options: PlanOptions): Promise<void> {
  // Handle --model flag with helpful hint
  if (options.model) {
    console.log();
    console.log(infoBox({
      title: 'Model selection not available for plan',
      description:
        'The plan command uses a two-stage approach (Sonnet→Opus) for best results.\n\n' +
        '▸ Use --fast for single-stage Sonnet planning\n' +
        '▸ --model and --adaptive are only available in ralph work',
    }));
    Deno.exit(0);
  }

  // Handle vibe mode
  if (options.vibe) {
    enableVibeMode();
    // Pass through options for work command
    setVibeOptions({
      experimentalParallel: options.experimentalParallel,
    });
    const nextSteps = getNextCommands('plan');
    const workDescription = options.experimentalParallel
      ? `Run parallel build loop (${options.experimentalParallel} workers)`
      : 'Run autonomous build loop';
    showVibeActivated([
      'Generate implementation plan',
      ...nextSteps.map((cmd) => {
        switch (cmd) {
          case 'work':
            return workDescription;
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

  // Run the appropriate planning strategy
  const result = options.fast ? await runSingleStagePlan('sonnet') : await runTwoStagePlan();

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
    .option('-f, --fast', 'Use single-stage planning with Sonnet (faster, less thorough)')
    .option('--vibe', 'Vibe mode - automatically continue to subsequent steps')
    .option('--model <model:string>', 'Not supported - see hint', { hidden: true })
    .option('--experimental-parallel <workers:number>', 'Enable parallel mode with N workers for subsequent work step (1-8, passed through to work)', {
      value: (val: number) => {
        if (val < 1 || val > 8) {
          throw new Error('Worker count must be between 1 and 8');
        }
        return val;
      },
    })
    .action(planAction);
}
