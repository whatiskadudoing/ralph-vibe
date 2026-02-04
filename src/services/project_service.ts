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
 * A file template definition.
 * Separates the pure template rendering logic from I/O operations.
 *
 * @pure The render function is pure - no side effects
 * @pure The getPath function is pure - simple string concatenation
 */
export interface FileTemplate {
  /** The project file key this template corresponds to */
  readonly key: ProjectFile;
  /** Pure function that renders the template content */
  readonly render: () => string;
  /** Pure function that returns the file path given the project root */
  readonly getPath: (root: string) => string;
}

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

// ============================================================================
// File Templates (Pure)
// ============================================================================

/**
 * File templates for project initialization.
 * Each template is a pure function that renders content without I/O.
 *
 * @pure All render functions are pure - they only produce string output
 * @pure All getPath functions are pure - they only perform string operations
 */
const FILE_TEMPLATES: readonly FileTemplate[] = [
  {
    key: 'prompt_build',
    render: renderBuildPrompt,
    getPath: getBuildPromptPath,
  },
  {
    key: 'prompt_plan',
    render: renderPlanPrompt,
    getPath: getPlanPromptPath,
  },
  {
    key: 'prompt_research',
    render: renderResearchPrompt,
    getPath: getResearchPromptPath,
  },
  {
    key: 'prompt_start',
    render: renderStartPrompt,
    getPath: getStartPromptPath,
  },
  {
    key: 'prompt_spec',
    render: renderSpecInterviewPrompt,
    getPath: getSpecPromptPath,
  },
  {
    key: 'prompt_audience',
    render: renderAudiencePrompt,
    getPath: getAudiencePromptPath,
  },
  {
    key: 'agents',
    render: renderAgentsMd,
    getPath: getAgentsMdPath,
  },
  {
    key: 'plan',
    render: renderInitialPlan,
    getPath: getPlanPath,
  },
  {
    key: 'audience_jtbd',
    render: renderInitialAudienceJtbd,
    getPath: getAudienceJtbdPath,
  },
];

/**
 * Templates that should be regenerated with `ralph regenerate`.
 * These are a subset of FILE_TEMPLATES.
 */
const REGENERATABLE_TEMPLATES: readonly FileTemplate[] = FILE_TEMPLATES.filter(
  (t) => t.key === 'prompt_build' || t.key === 'prompt_plan' || t.key === 'agents',
);

// ============================================================================
// Template Writing Utilities (Pure + I/O Separation)
// ============================================================================

/**
 * Writes a single template to disk.
 *
 * @impure Performs file I/O
 */
async function writeTemplate(
  template: FileTemplate,
  root: string,
): Promise<Result<void, ProjectError>> {
  const path = template.getPath(root);
  const content = template.render();
  const result = await writeTextFile(path, content);
  if (!result.ok) {
    return err(fromFileError(result.error));
  }
  return ok(undefined);
}

/**
 * Writes multiple templates to disk.
 * Stops on first error.
 *
 * @impure Performs file I/O
 */
async function writeTemplates(
  templates: readonly FileTemplate[],
  root: string,
): Promise<Result<void, ProjectError>> {
  for (const template of templates) {
    const result = await writeTemplate(template, root);
    if (!result.ok) {
      return result;
    }
  }
  return ok(undefined);
}

/**
 * Writes templates that match the given filter.
 *
 * @impure Performs file I/O
 */
function writeFilteredTemplates(
  templates: readonly FileTemplate[],
  filter: Set<ProjectFile>,
  root: string,
): Promise<Result<void, ProjectError>> {
  const filtered = templates.filter((t) => filter.has(t.key));
  return writeTemplates(filtered, root);
}

// ============================================================================
// Error Factories
// ============================================================================

/**
 * Creates a ProjectError.
 *
 * This is an error factory function following the pattern used throughout the codebase.
 * Error factories create structured error objects with a discriminant `type` field
 * for type-safe error handling using Result types.
 *
 * @param code - The error code indicating the type of project operation failure
 * @param message - A human-readable error message
 * @returns A structured ProjectError object
 *
 * @example
 * const error = projectError('not_found', 'Project directory not found');
 * // Returns: { type: 'project_error', code: 'not_found', message: 'Project directory not found' }
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
 *
 * @impure Performs file I/O operations
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

  // Create specs directory with .gitkeep
  const specsDir = getSpecsDir(root);
  const createDirResult = await createDirectory(specsDir);
  if (!createDirResult.ok) {
    return err(fromFileError(createDirResult.error));
  }
  const gitkeepResult = await writeTextFile(`${specsDir}/.gitkeep`, '');
  if (!gitkeepResult.ok) {
    return err(fromFileError(gitkeepResult.error));
  }

  // Write config file (special case: needs configOverrides)
  const config = createConfig(configOverrides);
  const configContent = serializeConfig(config);
  const configResult = await writeTextFile(configPath, configContent);
  if (!configResult.ok) {
    return err(fromFileError(configResult.error));
  }

  // Write all template-based files
  return writeTemplates(FILE_TEMPLATES, root);
}

// ============================================================================
// Project File Utilities
// ============================================================================

/**
 * Gets information about all project files.
 */
export async function getProjectFiles(cwd?: string): Promise<ProjectFileInfo[]> {
  const root = cwd ?? Deno.cwd();

  const files: Array<Omit<ProjectFileInfo, 'exists'>> = [
    { key: 'config', path: getConfigPath(root), name: '.ralph.json', description: 'Configuration' },
    {
      key: 'specs',
      path: getSpecsDir(root),
      name: 'specs/',
      description: 'Feature specifications',
    },
    {
      key: 'research',
      path: getResearchDir(root),
      name: 'research/',
      description: 'Research & discovery',
    },
    {
      key: 'agents',
      path: getAgentsMdPath(root),
      name: 'AGENTS.md',
      description: 'Build/test commands',
    },
    {
      key: 'plan',
      path: getPlanPath(root),
      name: 'IMPLEMENTATION_PLAN.md',
      description: 'Task checklist',
    },
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
 * Creates the specs directory with .gitkeep.
 *
 * @impure Performs file I/O
 */
async function createSpecsDirectory(root: string): Promise<Result<void, ProjectError>> {
  const specsDir = getSpecsDir(root);
  const createDirResult = await createDirectory(specsDir);
  if (!createDirResult.ok) {
    return err(fromFileError(createDirResult.error));
  }
  const gitkeepResult = await writeTextFile(`${specsDir}/.gitkeep`, '');
  if (!gitkeepResult.ok) {
    return err(fromFileError(gitkeepResult.error));
  }
  return ok(undefined);
}

/**
 * Creates the research directory with subdirectories and README.
 *
 * @impure Performs file I/O
 */
async function createResearchDirectory(root: string): Promise<Result<void, ProjectError>> {
  const researchDir = getResearchDir(root);

  // Create main directory
  const createDirResult = await createDirectory(researchDir);
  if (!createDirResult.ok) {
    return err(fromFileError(createDirResult.error));
  }

  // Create subdirectories
  const apisDir = `${researchDir}/apis`;
  const approachesDir = `${researchDir}/approaches`;

  for (const dir of [apisDir, approachesDir]) {
    const result = await createDirectory(dir);
    if (!result.ok) {
      return err(fromFileError(result.error));
    }
    const gitkeepResult = await writeTextFile(`${dir}/.gitkeep`, '');
    if (!gitkeepResult.ok) {
      return err(fromFileError(gitkeepResult.error));
    }
  }

  // Create README.md
  const readmePath = `${researchDir}/README.md`;
  const readme = renderInitialResearchReadme();
  const readmeResult = await writeTextFile(readmePath, readme);
  if (!readmeResult.ok) {
    return err(fromFileError(readmeResult.error));
  }

  return ok(undefined);
}

/**
 * Writes the config file.
 *
 * @impure Performs file I/O
 */
async function writeConfigFile(
  root: string,
  configOverrides?: DeepPartial<RalphConfig>,
): Promise<Result<void, ProjectError>> {
  const configPath = getConfigPath(root);
  const config = createConfig(configOverrides);
  const configContent = serializeConfig(config);
  const result = await writeTextFile(configPath, configContent);
  if (!result.ok) {
    return err(fromFileError(result.error));
  }
  return ok(undefined);
}

/**
 * Creates project files selectively.
 * Only creates files that are in the `filesToCreate` set.
 *
 * @impure Performs file I/O
 */
export async function createProjectFiles(
  filesToCreate: Set<ProjectFile>,
  cwd?: string,
  configOverrides?: DeepPartial<RalphConfig>,
): Promise<Result<void, ProjectError>> {
  const root = cwd ?? Deno.cwd();

  // Handle special cases: directories
  if (filesToCreate.has('specs')) {
    const result = await createSpecsDirectory(root);
    if (!result.ok) return result;
  }

  if (filesToCreate.has('research')) {
    const result = await createResearchDirectory(root);
    if (!result.ok) return result;
  }

  // Handle special case: config file (needs configOverrides)
  if (filesToCreate.has('config')) {
    const result = await writeConfigFile(root, configOverrides);
    if (!result.ok) return result;
  }

  // Write all template-based files that match the filter
  return writeFilteredTemplates(FILE_TEMPLATES, filesToCreate, root);
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
 * Regenerates only the templates marked as regeneratable (build, plan, agents).
 *
 * @impure Performs file I/O
 */
export function regeneratePrompts(cwd?: string): Promise<Result<void, ProjectError>> {
  const root = cwd ?? Deno.cwd();
  return writeTemplates(REGENERATABLE_TEMPLATES, root);
}
