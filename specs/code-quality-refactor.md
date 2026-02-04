# Plan: Code Quality and Functional Pattern Refactoring

## Task Description
Refactor the Ralph CLI codebase to improve code quality through better function naming, DRY principle adherence, improved readability, and enhanced functional programming patterns. This refactoring maintains all existing functionality while making the code more maintainable, testable, and consistent.

## Objective
Transform the codebase into a cleaner, more maintainable architecture that:
- Uses consistent, descriptive function naming conventions
- Eliminates code duplication through shared utilities
- Improves readability with smaller, focused functions
- Strengthens functional programming patterns (immutability, pure functions, composition)
- Maintains 100% backward compatibility with existing functionality

## Problem Statement
The current codebase has accumulated several quality issues:
1. **Naming inconsistencies**: Error factory functions use varying patterns (`usageError` vs `createUsageError`), cryptic abbreviations (`fst`, `snd`)
2. **DRY violations**: Duration formatting duplicated 3x, token formatting 2x, path resolution 20+ times, project file creation ~160 lines duplicated
3. **Readability issues**: Functions exceeding 400 lines, deeply nested conditionals, magic string literals scattered throughout
4. **Functional pattern gaps**: Mixed imperative/functional loops, impure functions disguised as pure, missing currying support

## Solution Approach
Apply systematic refactoring in phases:
1. **Foundation**: Create shared utilities for common patterns (formatting, path resolution, command execution)
2. **Naming**: Standardize naming conventions across all services
3. **DRY**: Extract duplicated logic into reusable functions
4. **Readability**: Break large functions into composable units
5. **Functional**: Strengthen immutability guarantees and pure function separation

## Relevant Files

### Core Utilities (Create/Modify)
- `src/utils/formatting.ts` - NEW: Shared formatting utilities (duration, tokens, costs)
- `src/utils/paths.ts` - NEW: Path resolution utilities
- `src/utils/command.ts` - NEW: Command execution utilities with Result handling
- `src/utils/constants.ts` - NEW: Magic strings and configuration constants
- `src/utils/fp.ts` - Rename `fst`/`snd` to `first`/`second`, add curried variants

### Services (Refactor)
- `src/services/file_service.ts` - Extract path resolution to shared utility, reduce 20 similar functions
- `src/services/session_tracker.ts` - Remove duplicate formatDuration, separate pure/impure
- `src/services/metrics_collector.ts` - Remove duplicate formatting, improve loop patterns
- `src/services/status_reporter.ts` - Remove duplicate formatDuration, rename notify to notifyObservers
- `src/services/git_service.ts` - Extract command execution pattern, improve naming
- `src/services/claude_service.ts` - Extract spec loading utilities, add typed parsers
- `src/services/project_service.ts` - Refactor file creation to template pattern (~160 lines)
- `src/services/cost_calculator.ts` - Use pricing aliases to reduce duplication

### CLI Commands (Refactor)
- `src/cli/work.ts` - Break 454-line function into smaller units, extract parsing logic
- `src/cli/vibe.ts` - Apply consistent patterns from work.ts refactor

### Tests (Update)
- `tests/utils/formatting_test.ts` - NEW: Tests for formatting utilities
- `tests/utils/paths_test.ts` - NEW: Tests for path utilities
- `tests/services/*.ts` - Update imports after refactoring

## Implementation Phases

### Phase 1: Foundation
- Create shared utility modules (formatting, paths, command, constants)
- Add comprehensive tests for new utilities
- Validate no regressions with existing tests

### Phase 2: Core Refactoring
- Apply naming conventions across services
- Extract duplicated code to shared utilities
- Break large functions into smaller units
- Improve functional patterns (loops, immutability)

### Phase 3: Integration & Polish
- Update all imports to use new utilities
- Run full test suite
- Update README documentation
- Final validation

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to do the building, validating, testing, deploying, and other tasks.
  - This is critical. Your job is to act as a high level director of the team, not a builder.
  - Your role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-formatting
  - Role: Creates shared formatting utilities module
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-formatting
  - Role: Validates formatting utilities implementation
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-paths
  - Role: Creates shared path utilities and refactors file_service
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-paths
  - Role: Validates path utilities and file_service refactoring
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-command
  - Role: Creates command execution utilities and refactors git_service
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-command
  - Role: Validates command utilities and git_service refactoring
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-naming
  - Role: Standardizes naming conventions across services
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-naming
  - Role: Validates naming convention changes
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-services
  - Role: Refactors services for DRY and readability
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-services
  - Role: Validates service refactoring
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-cli
  - Role: Refactors CLI commands for readability
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-cli
  - Role: Validates CLI command refactoring
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Updates README documentation
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-final
  - Role: Final validation of entire implementation
  - Agent Type: validator
  - Resume: true

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Create Shared Formatting Utilities
- **Task ID**: create-formatting-utils
- **Depends On**: none
- **Assigned To**: builder-formatting
- **Agent Type**: builder
- **Parallel**: false
- Create `src/utils/formatting.ts` with consolidated formatting functions:
  - `formatDuration(ms: number): string` - Human-readable duration (replaces 3 implementations)
  - `formatTokenCount(tokens: number): string` - Token count with K/M suffix (replaces 2 implementations)
  - `formatBytes(bytes: number): string` - Byte size formatting
  - `formatPercentage(value: number, decimals?: number): string` - Percentage formatting
- Create `tests/utils/formatting_test.ts` with comprehensive tests
- Ensure all functions are pure with no side effects

### 2. Validate Formatting Utilities
- **Task ID**: validate-formatting-utils
- **Depends On**: create-formatting-utils
- **Assigned To**: validator-formatting
- **Agent Type**: validator
- **Parallel**: false
- Verify `src/utils/formatting.ts` exports all required functions
- Run `deno test tests/utils/formatting_test.ts`
- Verify functions are pure (no side effects)
- Run `deno check src/utils/formatting.ts`

### 3. Create Constants Module
- **Task ID**: create-constants
- **Depends On**: none
- **Assigned To**: builder-formatting
- **Agent Type**: builder
- **Parallel**: true (can run alongside validate-formatting-utils)
- Create `src/utils/constants.ts` with magic strings:
  - `ANTHROPIC_BETA_HEADER = 'oauth-2025-04-20'`
  - `EXIT_SIGNAL_MARKER = 'EXIT_SIGNAL: true'`
  - `RALPH_STATUS_MARKER = 'RALPH_STATUS:'`
  - `DEFAULT_MODEL = 'opus'`
  - Model name variants for normalization
- No tests needed for constants (pure data)

### 4. Create Path Resolution Utilities
- **Task ID**: create-path-utils
- **Depends On**: validate-formatting-utils
- **Assigned To**: builder-paths
- **Agent Type**: builder
- **Parallel**: false
- Create `src/utils/paths.ts` with:
  - `resolveProjectPath(projectDir: string | undefined, relativePath: string): string`
  - `createPathResolver(basePath: string): (relativePath: string) => string` (curried)
- Refactor `src/services/file_service.ts`:
  - Replace 20+ `getXxxPath()` functions with single pattern using `resolveProjectPath`
  - Keep backward-compatible exports that use the new utility
- Create `tests/utils/paths_test.ts`

### 5. Validate Path Utilities
- **Task ID**: validate-path-utils
- **Depends On**: create-path-utils
- **Assigned To**: validator-paths
- **Agent Type**: validator
- **Parallel**: false
- Verify path utilities work correctly
- Verify file_service.ts still exports all original functions
- Run `deno test tests/services/file_service_test.ts`
- Run `deno check src/services/file_service.ts`

### 6. Create Command Execution Utilities
- **Task ID**: create-command-utils
- **Depends On**: validate-path-utils
- **Assigned To**: builder-command
- **Agent Type**: builder
- **Parallel**: false
- Create `src/utils/command.ts` with:
  - `executeCommand<E>(cmd: string, args: string[], errorMapper: (stderr: string) => E): Promise<Result<string, E>>`
  - `executeCommandTE<E>(cmd: string, args: string[], errorMapper: (e: unknown) => E): TaskEither<E, string>`
- Refactor `src/services/git_service.ts`:
  - Replace ~15 repeated command execution patterns with `executeCommand`
  - Improve function naming: document default parameters in JSDoc
- Create `tests/utils/command_test.ts`

### 7. Validate Command Utilities
- **Task ID**: validate-command-utils
- **Depends On**: create-command-utils
- **Assigned To**: validator-command
- **Agent Type**: validator
- **Parallel**: false
- Verify command utilities handle success/failure correctly
- Verify git_service.ts maintains same functionality
- Run `deno test tests/services/git_service_test.ts` (if exists)
- Run `deno check src/services/git_service.ts`

### 8. Standardize Naming Conventions
- **Task ID**: standardize-naming
- **Depends On**: validate-command-utils
- **Assigned To**: builder-naming
- **Agent Type**: builder
- **Parallel**: false
- Rename functions in `src/utils/fp.ts`:
  - `fst()` → `first()` (keep `fst` as deprecated alias)
  - `snd()` → `second()` (keep `snd` as deprecated alias)
- Rename in `src/services/status_reporter.ts`:
  - `notify()` → `notifyObservers()` (internal function)
- Add JSDoc documentation to all error factory functions explaining the pattern
- Ensure consistent use of `iter` → `iteration` in loops

### 9. Validate Naming Changes
- **Task ID**: validate-naming
- **Depends On**: standardize-naming
- **Assigned To**: validator-naming
- **Agent Type**: validator
- **Parallel**: false
- Verify fp.ts exports both old and new names (backward compatible)
- Verify status_reporter.ts internal rename doesn't break functionality
- Run `deno test tests/utils/fp_test.ts`
- Run `deno check src/utils/fp.ts src/services/status_reporter.ts`

### 10. Refactor Services for DRY
- **Task ID**: refactor-services-dry
- **Depends On**: validate-naming
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Update `src/services/session_tracker.ts`:
  - Import `formatDuration`, `formatTokenCount` from `@/utils/formatting.ts`
  - Remove local implementations
- Update `src/services/metrics_collector.ts`:
  - Import formatting functions from shared utilities
  - Replace imperative loops with functional `reduce` patterns
- Update `src/services/status_reporter.ts`:
  - Import `formatDuration` from shared utilities
  - Remove local implementation
- Update `src/services/cost_calculator.ts`:
  - Create pricing constants (OPUS_PRICING, SONNET_PRICING, HAIKU_PRICING)
  - Use aliases in MODEL_PRICING to reduce duplication

### 11. Validate Services DRY Refactoring
- **Task ID**: validate-services-dry
- **Depends On**: refactor-services-dry
- **Assigned To**: validator-services
- **Agent Type**: validator
- **Parallel**: false
- Verify no duplicate formatting functions remain
- Verify all services import from shared utilities
- Run `deno test tests/services/`
- Run `deno check src/services/*.ts`

### 12. Refactor Project Service Template Pattern
- **Task ID**: refactor-project-service
- **Depends On**: validate-services-dry
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Create file template interface in `src/services/project_service.ts`:
  ```typescript
  interface FileTemplate {
    key: ProjectFile;
    render: () => string;
    getPath: (root: string) => string;
  }
  ```
- Refactor `initProject()` and `createProjectFiles()`:
  - Create array of FileTemplate objects
  - Replace 12+ if-blocks with single loop over templates
  - Reduce ~160 lines of duplication to ~40 lines

### 13. Validate Project Service Refactoring
- **Task ID**: validate-project-service
- **Depends On**: refactor-project-service
- **Assigned To**: validator-services
- **Agent Type**: validator
- **Parallel**: false
- Verify all project files still created correctly
- Verify functionality unchanged
- Run `deno test tests/services/project_service_test.ts`
- Run `deno check src/services/project_service.ts`

### 14. Refactor Work Command Readability
- **Task ID**: refactor-work-command
- **Depends On**: validate-project-service
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Break `workAction()` (454 lines) into smaller functions:
  - `initializeWorkSession()` - Setup session, metrics, reporter
  - `runWorkIteration()` - Single iteration logic
  - `handleIterationResult()` - Process Claude response
  - `finalizeWorkSession()` - Cleanup and summary
- Extract `getNextTaskFromPlan()` parsing logic:
  - Create `parseImplementationPlan()` - Returns structured plan data
  - Create `selectNextTask()` - Selects task from parsed plan
- Replace magic strings with constants imports

### 15. Validate Work Command Refactoring
- **Task ID**: validate-work-command
- **Depends On**: refactor-work-command
- **Assigned To**: validator-cli
- **Agent Type**: validator
- **Parallel**: false
- Verify work command still functions correctly
- Verify no function exceeds 100 lines
- Run `deno test tests/cli/work_test.ts`
- Run `deno check src/cli/work.ts`

### 16. Separate Pure and Impure Functions
- **Task ID**: separate-pure-impure
- **Depends On**: validate-work-command
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Refactor `src/services/session_tracker.ts`:
  - Extract `sessionToJSON()` as pure function
  - Rename `saveSession()` to `persistSession()` to clarify it's impure
  - Add JSDoc marking functions as pure or impure
- Refactor `src/services/claude_service.ts`:
  - Extract `specFilesToMap()` as pure function from `loadSpecs()`
  - Add typed parsers for Claude event data instead of type assertions

### 17. Validate Pure/Impure Separation
- **Task ID**: validate-pure-impure
- **Depends On**: separate-pure-impure
- **Assigned To**: validator-services
- **Agent Type**: validator
- **Parallel**: false
- Verify pure functions have no side effects
- Verify impure functions are clearly marked
- Run `deno test tests/services/session_tracker_test.ts`
- Run `deno check src/services/session_tracker.ts src/services/claude_service.ts`

### 18. Update README Documentation
- **Task ID**: update-readme
- **Depends On**: validate-pure-impure
- **Assigned To**: builder-docs
- **Agent Type**: builder
- **Parallel**: false
- Update README.md Technical Architecture section:
  - Document new shared utilities (formatting, paths, command)
  - Document naming conventions used in codebase
  - Document pure vs impure function patterns
  - Add examples of the refactored patterns

### 19. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-readme
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands:
  - `deno check src/**/*.ts`
  - `deno lint`
  - `deno test tests/`
- Verify acceptance criteria met:
  - No duplicate formatting functions
  - No functions over 150 lines
  - All naming conventions consistent
  - README accurately reflects changes
- Verify backward compatibility preserved

## Acceptance Criteria

- [ ] No duplicate implementations of `formatDuration` (consolidated to 1)
- [ ] No duplicate implementations of `formatTokenCount` (consolidated to 1)
- [ ] Path resolution uses shared utility (20+ functions consolidated)
- [ ] Command execution uses shared utility (15+ patterns consolidated)
- [ ] `fst`/`snd` renamed to `first`/`second` with backward-compatible aliases
- [ ] No function exceeds 150 lines (down from 454)
- [ ] All magic strings moved to constants module
- [ ] Pure functions documented and separated from impure
- [ ] MODEL_PRICING uses aliases (no duplicate pricing objects)
- [ ] Project service uses template pattern (160 lines reduced)
- [ ] All tests pass: `deno test`
- [ ] Type checking passes: `deno check src/**/*.ts`
- [ ] Linting passes: `deno lint`
- [ ] README.md updated with new patterns
- [ ] All existing functionality preserved (backward compatible)

## Validation Commands
Execute these commands to validate the task is complete:

- `deno check src/**/*.ts` - Verify all TypeScript compiles without errors
- `deno lint` - Verify code follows linting rules
- `deno test` - Run full test suite
- `deno test tests/utils/formatting_test.ts` - Test formatting utilities
- `deno test tests/utils/paths_test.ts` - Test path utilities
- `deno test tests/utils/command_test.ts` - Test command utilities
- `deno test tests/services/` - Test all services
- `deno test tests/cli/` - Test CLI commands

## Notes

- Maintain backward compatibility throughout - existing code should continue to work
- Deprecated aliases should emit no warnings in current version
- Follow existing code patterns for consistency
- All new utilities should be pure functions where possible
- Use TypeScript strict mode patterns (no non-null assertions)
- Consider using `@deprecated` JSDoc tag for renamed functions
- Run tests after each phase to catch regressions early
