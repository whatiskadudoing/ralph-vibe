# Plan: Modular Functional Refactoring with Rich Data Output

## Task Description
Refactor the Ralph CLI codebase to be more modular, more functional, and easier to test. The refactoring will focus on:
1. Making services and utilities more composable using fp-ts patterns
2. Ensuring valuable, real data is output to users during processes and in final outputs
3. Adding comprehensive status line updates during execution
4. Improving testability through pure functions and dependency injection
5. Updating documentation to reflect the changes

## Objective
Transform the codebase into a highly modular, functional architecture that:
- Uses TaskEither for async operations with proper error handling
- Outputs meaningful, real-time data to users during all processes
- Is easy to unit test with minimal mocking
- Has clear separation of concerns between modules
- Provides comprehensive documentation of the new patterns

## Problem Statement
The current codebase has:
- Mixed imperative and functional patterns that reduce composability
- Some services that are difficult to test in isolation
- Incomplete real-time feedback to users during long-running operations
- Opportunities to leverage fp-ts patterns more consistently
- Documentation that doesn't reflect current architecture

## Solution Approach
Apply fp-ts functional programming patterns systematically:
1. **Services**: Refactor to use TaskEither for async operations, Either for sync errors, Option for nullable values
2. **Pure Functions**: Extract side effects to boundaries, make core logic pure
3. **Composition**: Use pipe/flow for data transformations
4. **Status Updates**: Implement rich status line updates with real metrics during execution
5. **Data Output**: Ensure all user-facing outputs contain valuable, actionable data
6. **Testing**: Add comprehensive tests for all pure functions

## Relevant Files
Use these files to complete the task:

### Core Utilities (Foundation)
- `src/utils/result.ts` - Current Result type, needs enhancement with fp-ts integration
- `src/utils/types.ts` - Type definitions, add branded types for type safety
- `src/utils/string.ts` - String utilities, ensure pure functions

### Services (Core Refactoring)
- `src/services/claude_service.ts` - Claude CLI integration, major refactor target for TaskEither
- `src/services/session_tracker.ts` - Session tracking, needs class-to-functional refactor
- `src/services/cost_calculator.ts` - Already functional, add richer output formatting
- `src/services/file_service.ts` - File operations, convert to TaskEither
- `src/services/project_service.ts` - Project management, convert to TaskEither
- `src/services/usage_service.ts` - Usage tracking, convert to TaskEither
- `src/services/git_service.ts` - Git operations, convert to TaskEither

### CLI Commands (Data Output Focus)
- `src/cli/work.ts` - Main work loop, enhance status updates and data output
- `src/cli/vibe.ts` - Vibe mode, enhance progress feedback
- `src/cli/plan.ts` - Planning command, enhance output detail
- `src/cli/init.ts` - Init command, enhance feedback
- `src/cli/spec.ts` - Spec command, enhance output

### UI Components (Status Line & Display)
- `src/ui/status.ts` - Status display, enhance with real metrics
- `src/ui/stats.ts` - Statistics display, add more metrics
- `src/ui/progress.ts` - Progress display, enhance detail
- `src/components/ui/ToolActivity/types.ts` - Tool activity types
- `src/components/ui/ToolActivity/utils.ts` - Tool activity utilities

### Tests (Comprehensive Coverage)
- `tests/services/cost_calculator_test.ts` - Model for test patterns
- `tests/utils/result_test.ts` - Model for utility tests

### New Files
- `src/utils/fp.ts` - fp-ts re-exports and custom utilities (pipe, flow, TaskEither helpers)
- `src/services/status_reporter.ts` - Centralized status reporting service
- `src/services/metrics_collector.ts` - Real-time metrics collection
- `tests/services/status_reporter_test.ts` - Tests for status reporter
- `tests/services/metrics_collector_test.ts` - Tests for metrics collector

## Implementation Phases

### Phase 1: Foundation
- Create fp-ts utilities module (`src/utils/fp.ts`)
- Enhance Result type to interop with fp-ts Either
- Add branded types for type safety (SessionId, TaskId, etc.)
- Create status reporter service foundation

### Phase 2: Core Implementation
- Refactor services to use TaskEither pattern
- Create metrics collector for real-time data
- Enhance status line updates with live metrics
- Convert session tracker from class to functional module
- Add rich data output to all user-facing operations

### Phase 3: Integration & Polish
- Update CLI commands to use new patterns
- Add comprehensive tests for all new modules
- Update README.md with new architecture documentation
- Validate all commands output valuable data

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
  - Name: builder-fp-utils
  - Role: Creates the fp-ts utilities foundation module
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-fp-utils
  - Role: Validates fp-ts utilities implementation and tests
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-services
  - Role: Refactors services to use TaskEither and functional patterns
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-services
  - Role: Validates service refactoring meets functional requirements
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-status
  - Role: Implements status reporter and metrics collector
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-status
  - Role: Validates status and metrics implementations
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-cli
  - Role: Updates CLI commands with rich data output
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-cli
  - Role: Validates CLI command outputs contain valuable data
  - Agent Type: validator
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Updates README.md and inline documentation
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

### 1. Create fp-ts Utilities Module
- **Task ID**: create-fp-utils
- **Depends On**: none
- **Assigned To**: builder-fp-utils
- **Agent Type**: builder
- **Parallel**: false
- Create `src/utils/fp.ts` with fp-ts re-exports (pipe, flow, TaskEither, Either, Option)
- Add custom helpers: `tryCatchTE` for wrapping async functions, `fromResult` for Result→Either conversion
- Add branded types: `SessionId`, `TaskId`, `FilePath` for type safety
- Ensure interop between existing Result type and fp-ts Either

### 2. Validate fp-ts Utilities
- **Task ID**: validate-fp-utils
- **Depends On**: create-fp-utils
- **Assigned To**: validator-fp-utils
- **Agent Type**: validator
- **Parallel**: false
- Verify `src/utils/fp.ts` exports all required utilities
- Check branded types are correctly defined
- Verify Result↔Either interop works
- Run `deno check src/utils/fp.ts`

### 3. Create Status Reporter Service
- **Task ID**: create-status-reporter
- **Depends On**: create-fp-utils
- **Assigned To**: builder-status
- **Agent Type**: builder
- **Parallel**: true (can run alongside validate-fp-utils)
- Create `src/services/status_reporter.ts` with functional API
- Implement `reportStatus`, `reportProgress`, `reportMetrics` functions
- Use callbacks/observers pattern for real-time updates
- Include token counts, cost estimates, duration in status updates

### 4. Create Metrics Collector Service
- **Task ID**: create-metrics-collector
- **Depends On**: create-fp-utils
- **Assigned To**: builder-status
- **Agent Type**: builder
- **Parallel**: true (can run alongside create-status-reporter)
- Create `src/services/metrics_collector.ts`
- Implement `collectTokenUsage`, `collectDuration`, `collectToolCalls` functions
- Use immutable state pattern for metric accumulation
- Add aggregation functions for session-level metrics

### 5. Validate Status and Metrics Services
- **Task ID**: validate-status-metrics
- **Depends On**: create-status-reporter, create-metrics-collector
- **Assigned To**: validator-status
- **Agent Type**: validator
- **Parallel**: false
- Verify both services follow functional patterns
- Check metrics are properly accumulated
- Verify status updates contain real, valuable data
- Run `deno check src/services/status_reporter.ts src/services/metrics_collector.ts`

### 6. Refactor File Service to TaskEither
- **Task ID**: refactor-file-service
- **Depends On**: validate-fp-utils
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Convert `readTextFile`, `writeTextFile`, `exists` to return TaskEither
- Maintain backward compatibility with existing Result-based API
- Add `TE` suffix versions (e.g., `readTextFileTE`) for new API
- Update module exports

### 7. Refactor Claude Service to TaskEither
- **Task ID**: refactor-claude-service
- **Depends On**: refactor-file-service
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Convert `runClaude` generator to use TaskEither for error handling
- Add TaskEither versions of `initializeBaseSession`, `getClaudeVersion`
- Integrate metrics collector for token tracking
- Integrate status reporter for real-time updates during execution

### 8. Refactor Session Tracker to Functional
- **Task ID**: refactor-session-tracker
- **Depends On**: refactor-claude-service, create-metrics-collector
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Convert class-based `SessionTracker` to functional module
- Use immutable state pattern: `createSession`, `recordIteration`, `getStats`
- Integrate with metrics collector
- Add richer session summary data

### 9. Validate Service Refactoring
- **Task ID**: validate-services
- **Depends On**: refactor-session-tracker
- **Assigned To**: validator-services
- **Agent Type**: validator
- **Parallel**: false
- Verify all services use TaskEither consistently
- Check session tracker is purely functional
- Verify metrics integration is correct
- Run `deno check src/services/*.ts`
- Run existing tests: `deno test tests/services/`

### 10. Enhance Work Command Data Output
- **Task ID**: enhance-work-output
- **Depends On**: validate-services, validate-status-metrics
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Integrate status reporter into work loop
- Add real-time token count display
- Add cost-per-iteration breakdown
- Add operation timing metrics
- Show cache efficiency percentage

### 11. Enhance Vibe Command Data Output
- **Task ID**: enhance-vibe-output
- **Depends On**: enhance-work-output
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Add SLC cycle progress indicators
- Show cumulative session metrics
- Display estimated remaining work
- Add rich completion summary

### 12. Validate CLI Enhancements
- **Task ID**: validate-cli
- **Depends On**: enhance-vibe-output
- **Assigned To**: validator-cli
- **Agent Type**: validator
- **Parallel**: false
- Verify work command outputs real token counts
- Verify cost estimates are accurate
- Check status updates occur during execution
- Verify vibe mode shows progress metrics
- Run `deno test tests/cli/`

### 13. Write Tests for New Modules
- **Task ID**: write-tests
- **Depends On**: validate-cli
- **Assigned To**: builder-services
- **Agent Type**: builder
- **Parallel**: false
- Create `tests/services/status_reporter_test.ts`
- Create `tests/services/metrics_collector_test.ts`
- Create `tests/utils/fp_test.ts`
- Follow existing test patterns from `tests/services/cost_calculator_test.ts`
- Ensure all pure functions have comprehensive tests

### 14. Validate Tests
- **Task ID**: validate-tests
- **Depends On**: write-tests
- **Assigned To**: validator-services
- **Agent Type**: validator
- **Parallel**: false
- Run all new tests: `deno test tests/`
- Verify test coverage is comprehensive
- Check tests are properly structured

### 15. Update README Documentation
- **Task ID**: update-readme
- **Depends On**: validate-tests
- **Assigned To**: builder-docs
- **Agent Type**: builder
- **Parallel**: false
- Add section on functional architecture patterns used
- Document the status reporting and metrics collection features
- Update "What Gets Created" section with new output examples
- Add examples of rich data output users will see

### 16. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-readme
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Verify acceptance criteria met
- Run full test suite: `deno test`
- Run type checking: `deno check src/**/*.ts`
- Run linting: `deno lint`
- Verify README accurately reflects implementation

## Acceptance Criteria

- [ ] All services use TaskEither for async operations consistently
- [ ] Session tracker is converted from class to pure functions
- [ ] Status reporter service provides real-time updates with actual metrics
- [ ] Metrics collector accumulates token usage, costs, and timing data
- [ ] Work command displays: token counts, cost breakdown, cache efficiency, operation timing
- [ ] Vibe command displays: SLC progress, cumulative metrics, estimated completion
- [ ] All new modules have comprehensive unit tests
- [ ] All tests pass: `deno test`
- [ ] Type checking passes: `deno check src/**/*.ts`
- [ ] Linting passes: `deno lint`
- [ ] README.md is updated with architecture documentation
- [ ] Existing functionality is preserved (backward compatible)

## Validation Commands
Execute these commands to validate the task is complete:

- `deno check src/**/*.ts` - Verify all TypeScript compiles without errors
- `deno lint` - Verify code follows linting rules
- `deno test` - Run full test suite
- `deno test tests/utils/fp_test.ts` - Test fp-ts utilities
- `deno test tests/services/status_reporter_test.ts` - Test status reporter
- `deno test tests/services/metrics_collector_test.ts` - Test metrics collector
- `deno test tests/services/` - Test all services
- `deno test tests/cli/` - Test CLI commands
- `ralph work --dry-run` - Verify work command shows expected data format

## Notes

- The fp-ts library should already be available or can be added via import map in deno.json
- Maintain backward compatibility - existing code should continue to work
- Follow existing code patterns for consistency (see cost_calculator.ts as model)
- Status updates should not significantly impact performance
- All data shown to users must be real, calculated values - no placeholder or mock data
- Consider using `@effect/io` as an alternative to fp-ts if team prefers newer patterns
