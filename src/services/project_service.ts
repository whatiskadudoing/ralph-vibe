/**
 * @module services/project_service
 *
 * Ralph project operations.
 * Orchestrates file and git services for Ralph-specific operations.
 */

import { err, ok, type Result } from '@/utils/result.ts';
import {
  createDirectory,
  exists,
  type FileError,
  getAgentsMdPath,
  getAudienceJtbdPath,
  getAudiencePromptPath,
  getBuildPromptPath,
  getConfigPath,
  getPlanPath,
  getPlanPromptPath,
  getResearchDir,
  getResearchPromptPath,
  getSpecPromptPath,
  getSpecsDir,
  getStartPromptPath,
  readTextFile,
  writeTextFile,
} from './file_service.ts';
import { type GitError, isGitRepo } from './git_service.ts';
import {
  createConfig,
  type DeepPartial,
  parseConfig,
  type RalphConfig,
  serializeConfig,
} from '@/core/config.ts';
import {
  renderAgentsMd,
  renderAudiencePrompt,
  renderBuildPrompt,
  renderInitialAudienceJtbd,
  renderInitialPlan,
  renderInitialResearchReadme,
  renderPlanPrompt,
  renderResearchPrompt,
  renderSpecInterviewPrompt,
  renderStartPrompt,
} from '@/core/templates.ts';

// ============================================================================
// Types
// ============================================================================

export interface ProjectError {
  readonly type: 'project_error';
  readonly code: 'not_found' | 'already_exists' | 'invalid_config' | 'io_error';
  readonly message: string;
}

export interface ProjectInfo {
  readonly root: string;
  readonly specsDir: string;
  readonly isGitRepo: boolean;
  readonly hasConfig: boolean;
  readonly hasPlan: boolean;
}

/**
 * Creates a ProjectError.
 */
function projectError(code: ProjectError['code'], message: string): ProjectError {
  return { type: 'project_error', code, message };
}

/**
 * Converts a FileError to a ProjectError.
 */
function fromFileError(error: FileError): ProjectError {
  return projectError('io_error', error.message);
}

/**
 * Converts a GitError to a ProjectError.
 */
function _fromGitError(error: GitError): ProjectError {
  return projectError('io_error', error.message);
}

// ============================================================================
// Project Detection
// ============================================================================

/**
 * Checks if the current directory has a Ralph project.
 */
export async function isRalphProject(cwd?: string): Promise<boolean> {
  const configPath = getConfigPath(cwd);
  return await exists(configPath);
}

/**
 * Gets information about the Ralph project.
 */
export async function getProjectInfo(cwd?: string): Promise<Result<ProjectInfo, ProjectError>> {
  const root = cwd ?? Deno.cwd();
  const specsDir = getSpecsDir(root);
  const configPath = getConfigPath(root);
  const planPath = getPlanPath(root);

  const [isGit, hasConfig, hasPlan] = await Promise.all([
    isGitRepo(root),
    exists(configPath),
    exists(planPath),
  ]);

  return ok({
    root,
    specsDir,
    isGitRepo: isGit,
    hasConfig,
    hasPlan,
  });
}

// ============================================================================
// Project Initialization
// ============================================================================

/**
 * Initializes a new Ralph project.
 * Creates files at project root following the Ralph Wiggum technique.
 *
 * Files created:
 * - .ralph.json (config file)
 * - PROMPT_build.md (build mode instructions)
 * - PROMPT_plan.md (plan mode instructions)
 * - AGENTS.md (operational guide)
 * - IMPLEMENTATION_PLAN.md (task list)
 * - specs/.gitkeep (specs directory)
 */
export async function initProject(
  cwd?: string,
  configOverrides?: DeepPartial<RalphConfig>,
): Promise<Result<void, ProjectError>> {
  const root = cwd ?? Deno.cwd();
  const configPath = getConfigPath(root);

  // Check if already initialized
  if (await exists(configPath)) {
    return err(projectError('already_exists', 'Ralph project already initialized'));
  }

  // Create specs directory
  const specsDir = getSpecsDir(root);
  const createDirResult = await createDirectory(specsDir);
  if (!createDirResult.ok) {
    return err(fromFileError(createDirResult.error));
  }

  // Create .gitkeep in specs directory
  const gitkeepPath = `${specsDir}/.gitkeep`;
  const writeGitkeepResult = await writeTextFile(gitkeepPath, '');
  if (!writeGitkeepResult.ok) {
    return err(fromFileError(writeGitkeepResult.error));
  }

  // Write config file
  const config = createConfig(configOverrides);
  const configContent = serializeConfig(config);
  const writeConfigResult = await writeTextFile(configPath, configContent);
  if (!writeConfigResult.ok) {
    return err(fromFileError(writeConfigResult.error));
  }

  // Write PROMPT_build.md
  const buildPromptPath = getBuildPromptPath(root);
  const buildPrompt = renderBuildPrompt();
  const writeBuildResult = await writeTextFile(buildPromptPath, buildPrompt);
  if (!writeBuildResult.ok) {
    return err(fromFileError(writeBuildResult.error));
  }

  // Write PROMPT_plan.md
  const planPromptPath = getPlanPromptPath(root);
  const planPrompt = renderPlanPrompt();
  const writePlanResult = await writeTextFile(planPromptPath, planPrompt);
  if (!writePlanResult.ok) {
    return err(fromFileError(writePlanResult.error));
  }

  // Write AGENTS.md
  const agentsMdPath = getAgentsMdPath(root);
  const agentsMd = renderAgentsMd();
  const writeAgentsResult = await writeTextFile(agentsMdPath, agentsMd);
  if (!writeAgentsResult.ok) {
    return err(fromFileError(writeAgentsResult.error));
  }

  // Write IMPLEMENTATION_PLAN.md
  const planPath = getPlanPath(root);
  const initialPlan = renderInitialPlan();
  const writePlanFileResult = await writeTextFile(planPath, initialPlan);
  if (!writePlanFileResult.ok) {
    return err(fromFileError(writePlanFileResult.error));
  }

  // Write AUDIENCE_JTBD.md
  const audienceJtbdPath = getAudienceJtbdPath(root);
  const audienceJtbd = renderInitialAudienceJtbd();
  const writeAudienceResult = await writeTextFile(audienceJtbdPath, audienceJtbd);
  if (!writeAudienceResult.ok) {
    return err(fromFileError(writeAudienceResult.error));
  }

  // Write PROMPT_start.md
  const startPromptPath = getStartPromptPath(root);
  const startPrompt = renderStartPrompt();
  const writeStartResult = await writeTextFile(startPromptPath, startPrompt);
  if (!writeStartResult.ok) {
    return err(fromFileError(writeStartResult.error));
  }

  // Write PROMPT_spec.md
  const specPromptPath = getSpecPromptPath(root);
  const specPrompt = renderSpecInterviewPrompt();
  const writeSpecResult = await writeTextFile(specPromptPath, specPrompt);
  if (!writeSpecResult.ok) {
    return err(fromFileError(writeSpecResult.error));
  }

  // Write PROMPT_audience.md
  const audiencePromptPath = getAudiencePromptPath(root);
  const audiencePrompt = renderAudiencePrompt();
  const writeAudiencePromptResult = await writeTextFile(audiencePromptPath, audiencePrompt);
  if (!writeAudiencePromptResult.ok) {
    return err(fromFileError(writeAudiencePromptResult.error));
  }

  return ok(undefined);
}

// ============================================================================
// Project File Types
// ============================================================================

/**
 * All project files that can be created/overwritten during init.
 */
export type ProjectFile =
  | 'config'
  | 'specs'
  | 'research'
  | 'agents'
  | 'plan'
  | 'audience_jtbd'
  | 'prompt_build'
  | 'prompt_plan'
  | 'prompt_research'
  | 'prompt_start'
  | 'prompt_spec'
  | 'prompt_audience';

/**
 * Information about a project file.
 */
export interface ProjectFileInfo {
  readonly key: ProjectFile;
  readonly path: string;
  readonly name: string;
  readonly description: string;
  readonly exists: boolean;
}

/**
 * Gets information about all project files.
 */
export async function getProjectFiles(cwd?: string): Promise<ProjectFileInfo[]> {
  const root = cwd ?? Deno.cwd();

  const files: Array<Omit<ProjectFileInfo, 'exists'>> = [
    { key: 'config', path: getConfigPath(root), name: '.ralph.json', description: 'Configuration' },
    { key: 'specs', path: getSpecsDir(root), name: 'specs/', description: 'Feature specifications' },
    { key: 'research', path: getResearchDir(root), name: 'research/', description: 'Research & discovery' },
    { key: 'agents', path: getAgentsMdPath(root), name: 'AGENTS.md', description: 'Build/test commands' },
    { key: 'plan', path: getPlanPath(root), name: 'IMPLEMENTATION_PLAN.md', description: 'Task checklist' },
    {
      key: 'audience_jtbd',
      path: getAudienceJtbdPath(root),
      name: 'AUDIENCE_JTBD.md',
      description: 'Audience & jobs-to-be-done',
    },
    {
      key: 'prompt_build',
      path: getBuildPromptPath(root),
      name: 'PROMPT_build.md',
      description: 'Build instructions',
    },
    {
      key: 'prompt_plan',
      path: getPlanPromptPath(root),
      name: 'PROMPT_plan.md',
      description: 'Planning instructions',
    },
    {
      key: 'prompt_research',
      path: getResearchPromptPath(root),
      name: 'PROMPT_research.md',
      description: 'Research instructions',
    },
    {
      key: 'prompt_start',
      path: getStartPromptPath(root),
      name: 'PROMPT_start.md',
      description: 'Start interview instructions',
    },
    {
      key: 'prompt_spec',
      path: getSpecPromptPath(root),
      name: 'PROMPT_spec.md',
      description: 'Spec interview instructions',
    },
    {
      key: 'prompt_audience',
      path: getAudiencePromptPath(root),
      name: 'PROMPT_audience.md',
      description: 'Audience interview instructions',
    },
  ];

  const results = await Promise.all(
    files.map(async (file) => ({
      ...file,
      exists: await exists(file.path),
    })),
  );

  return results;
}

/**
 * Creates project files selectively.
 * Only creates files that are in the `filesToCreate` set.
 */
export async function createProjectFiles(
  filesToCreate: Set<ProjectFile>,
  cwd?: string,
  configOverrides?: DeepPartial<RalphConfig>,
): Promise<Result<void, ProjectError>> {
  const root = cwd ?? Deno.cwd();

  // Create specs directory
  if (filesToCreate.has('specs')) {
    const specsDir = getSpecsDir(root);
    const createDirResult = await createDirectory(specsDir);
    if (!createDirResult.ok) {
      return err(fromFileError(createDirResult.error));
    }
    // Create .gitkeep
    const gitkeepPath = `${specsDir}/.gitkeep`;
    const writeGitkeepResult = await writeTextFile(gitkeepPath, '');
    if (!writeGitkeepResult.ok) {
      return err(fromFileError(writeGitkeepResult.error));
    }
  }

  // Create research directory with subdirectories
  if (filesToCreate.has('research')) {
    const researchDir = getResearchDir(root);
    const createDirResult = await createDirectory(researchDir);
    if (!createDirResult.ok) {
      return err(fromFileError(createDirResult.error));
    }
    // Create subdirectories
    const apisDir = `${researchDir}/apis`;
    const approachesDir = `${researchDir}/approaches`;
    const createApisResult = await createDirectory(apisDir);
    if (!createApisResult.ok) {
      return err(fromFileError(createApisResult.error));
    }
    const createApproachesResult = await createDirectory(approachesDir);
    if (!createApproachesResult.ok) {
      return err(fromFileError(createApproachesResult.error));
    }
    // Create README.md
    const readmePath = `${researchDir}/README.md`;
    const readme = renderInitialResearchReadme();
    const writeReadmeResult = await writeTextFile(readmePath, readme);
    if (!writeReadmeResult.ok) {
      return err(fromFileError(writeReadmeResult.error));
    }
    // Create .gitkeep files in subdirectories
    const writeApisGitkeep = await writeTextFile(`${apisDir}/.gitkeep`, '');
    if (!writeApisGitkeep.ok) {
      return err(fromFileError(writeApisGitkeep.error));
    }
    const writeApproachesGitkeep = await writeTextFile(`${approachesDir}/.gitkeep`, '');
    if (!writeApproachesGitkeep.ok) {
      return err(fromFileError(writeApproachesGitkeep.error));
    }
  }

  // Write config file
  if (filesToCreate.has('config')) {
    const configPath = getConfigPath(root);
    const config = createConfig(configOverrides);
    const configContent = serializeConfig(config);
    const writeResult = await writeTextFile(configPath, configContent);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_build.md
  if (filesToCreate.has('prompt_build')) {
    const buildPromptPath = getBuildPromptPath(root);
    const buildPrompt = renderBuildPrompt();
    const writeResult = await writeTextFile(buildPromptPath, buildPrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_plan.md
  if (filesToCreate.has('prompt_plan')) {
    const planPromptPath = getPlanPromptPath(root);
    const planPrompt = renderPlanPrompt();
    const writeResult = await writeTextFile(planPromptPath, planPrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_research.md
  if (filesToCreate.has('prompt_research')) {
    const researchPromptPath = getResearchPromptPath(root);
    const researchPrompt = renderResearchPrompt();
    const writeResult = await writeTextFile(researchPromptPath, researchPrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_start.md
  if (filesToCreate.has('prompt_start')) {
    const startPromptPath = getStartPromptPath(root);
    const startPrompt = renderStartPrompt();
    const writeResult = await writeTextFile(startPromptPath, startPrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_spec.md
  if (filesToCreate.has('prompt_spec')) {
    const specPromptPath = getSpecPromptPath(root);
    const specPrompt = renderSpecInterviewPrompt();
    const writeResult = await writeTextFile(specPromptPath, specPrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write PROMPT_audience.md
  if (filesToCreate.has('prompt_audience')) {
    const audiencePromptPath = getAudiencePromptPath(root);
    const audiencePrompt = renderAudiencePrompt();
    const writeResult = await writeTextFile(audiencePromptPath, audiencePrompt);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write AGENTS.md
  if (filesToCreate.has('agents')) {
    const agentsMdPath = getAgentsMdPath(root);
    const agentsMd = renderAgentsMd();
    const writeResult = await writeTextFile(agentsMdPath, agentsMd);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write IMPLEMENTATION_PLAN.md
  if (filesToCreate.has('plan')) {
    const planPath = getPlanPath(root);
    const initialPlan = renderInitialPlan();
    const writeResult = await writeTextFile(planPath, initialPlan);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  // Write AUDIENCE_JTBD.md
  if (filesToCreate.has('audience_jtbd')) {
    const audienceJtbdPath = getAudienceJtbdPath(root);
    const audienceJtbd = renderInitialAudienceJtbd();
    const writeResult = await writeTextFile(audienceJtbdPath, audienceJtbd);
    if (!writeResult.ok) {
      return err(fromFileError(writeResult.error));
    }
  }

  return ok(undefined);
}

// ============================================================================
// Config Operations
// ============================================================================

/**
 * Reads the Ralph config.
 */
export async function readConfig(cwd?: string): Promise<Result<RalphConfig, ProjectError>> {
  const configPath = getConfigPath(cwd);
  const readResult = await readTextFile(configPath);

  if (!readResult.ok) {
    return err(projectError('not_found', 'Ralph project not found. Run `ralph init` first.'));
  }

  const parseResult = parseConfig(readResult.value);
  if (!parseResult.ok) {
    const messages = parseResult.error.map((e) => e.message).join(', ');
    return err(projectError('invalid_config', messages));
  }

  return ok(parseResult.value);
}

/**
 * Updates the Ralph config.
 */
export async function updateConfig(
  config: RalphConfig,
  cwd?: string,
): Promise<Result<void, ProjectError>> {
  const configPath = getConfigPath(cwd);
  const content = serializeConfig(config);
  const writeResult = await writeTextFile(configPath, content);

  if (!writeResult.ok) {
    return err(fromFileError(writeResult.error));
  }

  return ok(undefined);
}

// ============================================================================
// Plan Operations
// ============================================================================

/**
 * Reads the plan file.
 */
export async function readPlan(cwd?: string): Promise<Result<string, ProjectError>> {
  const planPath = getPlanPath(cwd);
  const readResult = await readTextFile(planPath);

  if (!readResult.ok) {
    return err(projectError('not_found', 'Plan file not found.'));
  }

  return ok(readResult.value);
}

/**
 * Updates the plan file.
 */
export async function updatePlan(
  content: string,
  cwd?: string,
): Promise<Result<void, ProjectError>> {
  const planPath = getPlanPath(cwd);
  const writeResult = await writeTextFile(planPath, content);

  if (!writeResult.ok) {
    return err(fromFileError(writeResult.error));
  }

  return ok(undefined);
}

// ============================================================================
// Prompt Operations
// ============================================================================

/**
 * Regenerates the prompt files.
 */
export async function regeneratePrompts(cwd?: string): Promise<Result<void, ProjectError>> {
  const root = cwd ?? Deno.cwd();

  // Regenerate PROMPT_build.md
  const buildPromptPath = getBuildPromptPath(root);
  const buildPrompt = renderBuildPrompt();
  const writeBuildResult = await writeTextFile(buildPromptPath, buildPrompt);
  if (!writeBuildResult.ok) {
    return err(fromFileError(writeBuildResult.error));
  }

  // Regenerate PROMPT_plan.md
  const planPromptPath = getPlanPromptPath(root);
  const planPrompt = renderPlanPrompt();
  const writePlanResult = await writeTextFile(planPromptPath, planPrompt);
  if (!writePlanResult.ok) {
    return err(fromFileError(writePlanResult.error));
  }

  // Regenerate AGENTS.md
  const agentsMdPath = getAgentsMdPath(root);
  const agentsMd = renderAgentsMd();
  const writeAgentsResult = await writeTextFile(agentsMdPath, agentsMd);
  if (!writeAgentsResult.ok) {
    return err(fromFileError(writeAgentsResult.error));
  }

  return ok(undefined);
}
