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
  getBuildPromptPath,
  getConfigPath,
  getPlanPath,
  getPlanPromptPath,
  getSpecsDir,
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
  renderBuildPrompt,
  renderInitialPlan,
  renderPlanPrompt,
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
