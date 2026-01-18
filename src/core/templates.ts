/**
 * @module core/templates
 *
 * Template rendering for prompt files.
 * All functions are pure - no I/O operations.
 *
 * Reference: https://github.com/ghuntley/how-to-ralph-wiggum
 */

import { dedent } from '@/utils/string.ts';
import { RALPH_DONE_MARKER, RALPH_EXIT_SIGNAL } from '@/core/constants.ts';

// ============================================================================
// Template Functions
// ============================================================================

/**
 * Generates the PROMPT_build.md content.
 * This is the main prompt used during the build loop.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 */
export function renderBuildPrompt(): string {
  return dedent(`
    # Build Mode

    You are implementing features for this project.

    ---

    ## Model Strategy

    - Use **parallel Sonnet subagents** (up to 500) for reading files, searching code, exploring
    - Use **Opus** (yourself) for reasoning, architecture decisions, complex implementation
    - Use **only 1 Sonnet subagent** for build/test operations (backpressure gate)

    ---

    ## Phase 0: Orientation

    0a. Study the specifications in \`specs/\` (use parallel Sonnet subagents for thorough analysis)
    0b. Study \`IMPLEMENTATION_PLAN.md\` to understand current state
    0c. Study \`AGENTS.md\` for operational patterns and validation commands
    0d. Study project files (package.json, Cargo.toml, etc.) to understand the tech stack

    ## Phase 1: Task Selection & Implementation

    1. Select the **MOST IMPORTANT** unchecked task from IMPLEMENTATION_PLAN.md
    2. **Do NOT assume functionality is missing** - search codebase to confirm first
    3. Implement the task **completely** - no placeholders, no partial implementations
    4. Follow patterns established in AGENTS.md
    5. Use parallel Sonnet subagents for exploration; single subagent for validation

    ## Phase 2: Validation

    1. Run all validation commands from AGENTS.md (use 1 subagent only - backpressure)
    2. Fix any failures before proceeding
    3. Tests **must pass** before moving forward

    ## Phase 3: Documentation

    1. Update IMPLEMENTATION_PLAN.md:
       - Mark task \`[x]\` complete
       - Add any learnings discovered during implementation
       - Periodically clean completed items if plan is getting long
    2. Update AGENTS.md with operational learnings only (no status/progress)
    3. If specs contain inconsistencies, update them (use Ultrathink for complex cases)

    ## Phase 4: Commit

    1. Stage all changes
    2. Write descriptive commit message capturing the **WHY**, not just the what
    3. Push to remote

    ---

    ## Guardrails

    99. **Search codebase before assuming** something isn't implemented
    999. **Required tests** from acceptance criteria must exist and pass
    9999. **Single source of truth** - no migrations, adapters, or duplicate logic
    99999. **One task per iteration** - exit after Phase 4
    999999. **Tests must pass** before marking complete
    9999999. **Keep AGENTS.md operational only** - status belongs in IMPLEMENTATION_PLAN.md
    99999999. **For bugs noticed**, resolve immediately or document in plan for next iteration
    999999999. **Implement completely** - placeholders waste iterations
    9999999999. **Periodically clean** completed items from IMPLEMENTATION_PLAN.md

    ---

    ## Output

    If all tasks are done, output: \`EXIT_SIGNAL: true\`

    End your response with:

    \`\`\`
    RALPH_STATUS:
    task: "[task name]"
    phase: 0-4
    validation: pass/fail
    EXIT_SIGNAL: true/false
    \`\`\`
  `).trim();
}

/**
 * Generates the PROMPT_plan.md content.
 * This is used when generating or regenerating the implementation plan.
 * Focuses on gap analysis between specifications and existing code.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 */
export function renderPlanPrompt(): string {
  return dedent(`
    # Plan Mode

    You are performing **GAP ANALYSIS** between specifications and code.

    ---

    ## Model Strategy

    - Use **250 parallel Sonnet subagents** to study all specs in \`specs/\`
    - Use **500 parallel Sonnet subagents** to search and study existing code
    - Use **Opus** (yourself) for synthesis, prioritization, and plan generation

    ---

    ## Instructions

    1. **Study** all specs in \`specs/\` (use parallel Sonnet subagents for thorough analysis)
    2. **Study** project files to understand the tech stack and existing patterns
    3. **Search codebase** to find what's already implemented (parallel Sonnet subagents)
    4. **Compare** specifications against actual implementation
    5. **Identify gaps** between specs and reality
    6. Generate/update \`IMPLEMENTATION_PLAN.md\` as prioritized task list

    ---

    ## Critical Rules

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Each task should be completable in **one iteration**
    - Order by **dependency** (foundations first)
    - Group related tasks into **phases**

    ---

    ## Task Guidelines

    Each task should be:
    - **Small** - completable in one iteration
    - **Clear** - no ambiguity about what to do
    - **Testable** - how do we know it's done?
    - **Complete** - no placeholders or partial implementations

    ---

    ## Output

    Write to \`IMPLEMENTATION_PLAN.md\`. No rigid template required - organize in
    whatever format best captures the work. Common elements:

    - Phases or milestones grouping related tasks
    - Checkbox tasks: \`- [ ] Task description\`
    - Priority order (most important first within each phase)
    - Dependencies noted where relevant

    The plan is **disposable** - if it becomes wrong or stale, regenerate it.
  `).trim();
}

/**
 * Generates the analysis prompt for the first stage (Sonnet).
 * This stage gathers context about specs and existing code.
 */
export function renderAnalysisPrompt(): string {
  return dedent(`
    You are analyzing a codebase to prepare for implementation planning.

    ## YOUR TASK

    Gather comprehensive context about the project. Output a structured analysis.

    ### Step 1: Read All Specs
    Read every file in \`specs/\` directory. For each spec, extract:
    - Core requirements and features
    - Acceptance criteria
    - Technical constraints

    ### Step 2: Understand the Tech Stack
    Examine project configuration files:
    - package.json, Cargo.toml, deno.json, Makefile, etc.
    - Identify frameworks, build tools, test runners
    - Note any scripts or commands

    ### Step 3: Search for Existing Implementation
    For each requirement in the specs, search the codebase:
    - What's already implemented?
    - What's partially done?
    - What's completely missing?

    ### Step 4: Identify Patterns
    Note coding patterns and conventions:
    - Project structure
    - Naming conventions
    - Testing patterns

    ## OUTPUT FORMAT

    Output your analysis as structured markdown:

    \`\`\`markdown
    # Codebase Analysis

    ## Tech Stack
    - Language: [language]
    - Framework: [framework]
    - Build: [build command]
    - Test: [test command]

    ## Specs Summary
    [For each spec file, list key requirements]

    ## Implementation Status
    [For each requirement, note: ✅ Done | 🚧 Partial | ❌ Missing]

    ## Gaps Identified
    [List what needs to be implemented]

    ## Patterns & Conventions
    [Key patterns discovered]
    \`\`\`

    Be thorough. This analysis will be used to generate the implementation plan.
  `).trim();
}

/**
 * Generates the synthesis prompt for the second stage (Opus).
 * This stage receives analysis and generates the implementation plan.
 */
export function renderSynthesisPrompt(analysis: string): string {
  return dedent(`
    You are generating an implementation plan based on codebase analysis.

    ## CONTEXT

    A fast analysis agent has already examined the codebase. Here is the analysis:

    ---
    ${analysis}
    ---

    ## YOUR TASK

    Based on the analysis above, create \`IMPLEMENTATION_PLAN.md\` with prioritized tasks.

    ## GUIDELINES

    - **Plan only.** Do NOT implement anything.
    - Each task should be completable in **one iteration** (one build loop cycle)
    - Order by **dependency** (foundations first)
    - Group related tasks into phases

    Each task should be:
    - **Small** - completable in one iteration
    - **Clear** - no ambiguity about what to do
    - **Testable** - how do we know it's done?

    ## OUTPUT

    Write to \`IMPLEMENTATION_PLAN.md\`. Use this structure:

    \`\`\`markdown
    # Implementation Plan

    ## Phase 1: [Phase Name]
    - [ ] Task 1 description
    - [ ] Task 2 description

    ## Phase 2: [Phase Name]
    - [ ] Task 3 description
    \`\`\`

    After writing, show this summary:

    ---
    ✅ **Plan generated!**

    Created \`IMPLEMENTATION_PLAN.md\` with [N] tasks in [M] phases.

    Next: Review the plan, then run \`ralph work\` to start building.
    ---
  `).trim();
}

/**
 * Generates the plan command prompt (for ralph plan).
 * Single-stage version for backwards compatibility.
 */
export function renderPlanCommandPrompt(): string {
  return dedent(`
    You are performing **GAP ANALYSIS** between specifications and code.

    ## YOUR TASK

    1. **Study** all specs in \`specs/\` (use parallel subagents for thorough analysis)
    2. **Study** project files (package.json, Cargo.toml, etc.) to understand the tech stack
    3. **Search codebase** to find what's already implemented - do NOT assume things are missing
    4. **Compare** specifications against actual implementation
    5. **Identify gaps** between specs and reality
    6. **Write** \`IMPLEMENTATION_PLAN.md\` with prioritized tasks

    ## CRITICAL RULES

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Each task should be completable in **one iteration** (one build loop cycle)
    - Order by **dependency** (foundations first)

    ## TASK GUIDELINES

    Each task should be:
    - **Small** - completable in one iteration
    - **Clear** - no ambiguity about what to do
    - **Testable** - how do we know it's done?

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\`. Organize in whatever format best captures the work:

    - Group related tasks into phases or milestones
    - Use checkbox format: \`- [ ] Task description\`
    - Order by priority (most important/foundational first)
    - Note dependencies where relevant

    ## COMPLETION MESSAGE

    After writing IMPLEMENTATION_PLAN.md, display this message:

    ---

    ✅ **Plan generated!**

    I've analyzed your specs and created \`IMPLEMENTATION_PLAN.md\` with [N] tasks
    organized into [M] phases.

    **What you can do now:**

    1. **Review the plan**: Open \`IMPLEMENTATION_PLAN.md\` and check if the tasks
       make sense. Reorder, edit, or remove tasks as needed.

    2. **Regenerate if needed**: The plan is disposable. If it's wrong, just run
       \`ralph plan\` again - it's cheap to regenerate.

    3. **Start building**: When you're happy with the plan, run:
       \`\`\`
       ralph work
       \`\`\`
       This starts the autonomous build loop that implements tasks one by one.

    **Tip**: The clearer your specs, the better the plan. If tasks seem wrong,
    consider improving your spec files first.

    ---

    Start now. Read the specs and analyze the codebase.
  `).trim();
}

/**
 * Generates the initial IMPLEMENTATION_PLAN.md content.
 */
export function renderInitialPlan(): string {
  return dedent(`
    # Implementation Plan

    _Run \`ralph plan\` to generate tasks from your specs._

    ## Phase 1: Setup
    - [ ] (Tasks will be generated by \`ralph plan\`)
  `).trim();
}

/**
 * Generates the AGENTS.md content.
 * This is the operational guide for the project.
 * Claude will discover commands from project files.
 */
export function renderAgentsMd(): string {
  return dedent(`
    # AGENTS.md - Operational Guide

    ## Build & Run

    <!-- Claude: Discover commands from package.json, Cargo.toml, Makefile, etc. -->
    <!-- Document the commands you discover here for reference -->

    - **Build:** \`(discover from project files)\`
    - **Test:** \`(discover from project files)\`
    - **Lint:** \`(discover from project files)\`

    ---

    ## Validation Checklist

    Before marking a task complete:

    1. [ ] Tests pass
    2. [ ] Linting passes
    3. [ ] Types check (if applicable)
    4. [ ] Manual verification (if needed)

    ---

    ## Operational Notes

    <!-- Add learnings about running this project here -->
    <!-- Example: "Run migrations before tests" or "Requires Docker running" -->

    ---

    ## Codebase Patterns

    <!-- Document discovered conventions here -->
    <!-- Example: "All API handlers in src/handlers/" or "Use zod for validation" -->
  `).trim();
}

/**
 * Generates the start prompt for initial project setup.
 * This guides Claude to interview the user about what they want to build
 * and create the initial spec files.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 * Key principle: "No pre-specified template - let Ralph/LLM dictate format"
 */
export function renderStartPrompt(): string {
  return dedent(`
    # Initial Spec Interview

    You are conducting the first spec interview for a new project.

    ---

    ## The Ralph Philosophy

    You are writing specs for the **Ralph Wiggum technique** - an autonomous AI development method.
    Understanding this philosophy is CRITICAL for writing good specs.

    **Core Principles:**

    1. **Specs are the source of truth.** The AI implementer will ONLY know what's in the specs.
       If it's not written down, it doesn't exist. Be explicit about everything.

    2. **Write for an AI implementer.** The spec must be clear enough that an AI (or developer)
       can implement it WITHOUT asking clarifying questions. Ambiguity = bad implementation.

    3. **Acceptance criteria are king.** Every feature needs observable, verifiable outcomes.
       "How do we know it's done?" must have a clear answer.

    4. **Include edge cases.** What happens when inputs are invalid? When the network fails?
       When the user does something unexpected? Document these explicitly.

    5. **Define what's OUT of scope.** Explicitly stating what you're NOT building prevents
       scope creep and keeps the AI focused.

    6. **One topic per spec file.** Keep specs focused. A spec about "user authentication"
       shouldn't also cover "user profiles" - that's a separate spec.

    ---

    ## Interview Guidelines

    1. Ask ONE question at a time. Wait for the user's response before asking the next.
    2. Start with: "What are you building?"
    3. Be conversational - like a product manager learning about a feature.
    4. Dig deeper when answers are vague.
    5. Do NOT show menus, numbered options, or lists of choices.

    **Areas to cover** (through natural conversation, not as a checklist):
    - What is the core idea? What problem does it solve?
    - Who will use this? What's their workflow?
    - What are the key features? How should they work?
    - What does "done" look like? How do we test it?
    - What happens when things go wrong? Edge cases?
    - Are there any technical constraints or dependencies?
    - What's explicitly out of scope for now?

    ---

    ## Writing the Specs

    After 5-10 exchanges, when you understand the project:

    1. Summarize what you learned
    2. Ask "Does this capture what you want to build?"
    3. If yes, create spec file(s) in \`specs/\` directory

    **Spec structure** (adapt as needed - no rigid template):

    \`\`\`markdown
    # [Feature Name]

    ## Overview
    [1-2 sentences: what is this and why does it exist?]

    ## User Experience
    [Describe from the user's perspective - what do they see, do, experience?]

    ## Acceptance Criteria
    [Observable, testable outcomes]
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Behavior Details
    [Specific behaviors, states, transitions]

    ## Edge Cases
    [What happens when things go wrong]

    ## Technical Constraints
    [Performance, dependencies, limitations]

    ## Out of Scope
    [What this does NOT include]
    \`\`\`

    Create ONE file per topic. Name descriptively: \`specs/user-auth.md\`, \`specs/data-export.md\`

    ---

    ## Completion Steps

    After creating all spec files, do these steps IN ORDER:

    1. Display this completion message (replace filenames with actual ones):

    ---
    ✅ **Specs created!**

    I've created the following specifications:
    - \`specs/[filename1].md\`
    - \`specs/[filename2].md\`

    **Next steps:**
    1. Review the specs - edit them if needed
    2. Run \`ralph plan\` to generate the implementation plan
    3. Run \`ralph work\` to start the autonomous build loop

    ${RALPH_EXIT_SIGNAL}
    ---

    2. Create a marker file to signal completion:
       \`\`\`bash
       touch ${RALPH_DONE_MARKER}
       \`\`\`

    3. STOP. Do not continue. Do not wait for input. Your work is done.

    ---

    ## Absolute Restrictions

    You are a **SPEC WRITER**. Your ONLY job is gathering requirements and writing specs.

    You CAN:
    - Ask interview questions
    - Write files in \`specs/\` directory
    - Create the completion marker file

    You CANNOT:
    - Read source code
    - Implement any code
    - Modify files outside specs/ (except the marker file)
    - Offer to implement anything
    - Continue after creating the marker file

    ---

    **Start now.** Ask: "What are you building?"
  `).trim();
}

/**
 * Generates the spec interview prompt.
 * This guides Claude to interview the user about a new feature.
 */
export function renderSpecInterviewPrompt(featureHint?: string): string {
  const intro = featureHint
    ? `The user wants to add: "${featureHint}"`
    : 'The user wants to add a new feature.';

  return dedent(`
    # Spec Interview Mode

    ${intro}

    ---

    ## The Ralph Philosophy

    You are writing specs for the **Ralph Wiggum technique** - an autonomous AI development method.
    Understanding this philosophy is CRITICAL for writing good specs.

    **Core Principles:**

    1. **Specs are the source of truth.** The AI implementer will ONLY know what's in the specs.
       If it's not written down, it doesn't exist. Be explicit about everything.

    2. **Write for an AI implementer.** The spec must be clear enough that an AI (or developer)
       can implement it WITHOUT asking clarifying questions. Ambiguity = bad implementation.

    3. **Acceptance criteria are king.** Every feature needs observable, verifiable outcomes.
       "How do we know it's done?" must have a clear answer.

    4. **Include edge cases.** What happens when inputs are invalid? When the network fails?
       When the user does something unexpected? Document these explicitly.

    5. **Define what's OUT of scope.** Explicitly stating what you're NOT building prevents
       scope creep and keeps the AI focused.

    6. **One topic per spec file.** Keep specs focused. A spec about "user authentication"
       shouldn't also cover "user profiles" - that's a separate spec.

    ---

    ## Phase 0: Read Existing Specs

    BEFORE asking any questions, read ALL existing specs in \`specs/\` directory.

    This tells you:
    - What features already exist (don't duplicate)
    - The project's domain and terminology
    - Patterns and conventions already established
    - Whether the new feature should UPDATE an existing spec or CREATE a new one

    **Decision rule:**
    - If the new feature is an extension/modification of an existing spec → UPDATE that spec
    - If the new feature is genuinely new and distinct → CREATE a new spec file

    ---

    ## Phase 1: Interview

    Ask questions **ONE AT A TIME**. Wait for the user's response before continuing.

    Cover these areas through natural conversation:

    1. **What & Why** - What does this feature do? What problem does it solve?
    2. **User perspective** - Who uses this? What's their workflow? What do they see?
    3. **Behavior** - How should it work? What are the inputs/outputs/states?
    4. **Acceptance criteria** - How do we know it's done? What's testable?
    5. **Edge cases** - What happens when things go wrong or are unexpected?
    6. **Constraints** - Any technical limitations? Performance requirements? Dependencies?
    7. **Scope boundaries** - What's explicitly NOT included?

    Be conversational. Dig deeper when answers are vague. 3-6 questions is usually enough.

    ---

    ## Phase 2: Write the Spec

    After gathering enough information:

    1. Summarize what you learned
    2. Ask "Does this capture what you want? Should I save it?"
    3. If yes, write to \`specs/\` - either UPDATE existing or CREATE new
    4. Show the completion message
    5. Say goodbye and END

    **Spec structure** (adapt as needed - no rigid template):

    \`\`\`markdown
    # [Feature Name]

    ## Overview
    [1-2 sentences: what is this and why does it exist?]

    ## User Experience
    [Describe from the user's perspective - what do they see, do, experience?]

    ## Acceptance Criteria
    [Observable, testable outcomes - "Given X, when Y, then Z" format works well]
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Behavior Details
    [Specific behaviors, states, transitions]

    ## Edge Cases
    [What happens when things go wrong or are unexpected]

    ## Technical Constraints
    [Performance requirements, dependencies, limitations]

    ## Out of Scope
    [Explicitly what this feature does NOT include]
    \`\`\`

    ---

    ## Completion Steps

    After saving the spec, do these steps IN ORDER:

    1. Display this completion message (replace filename with actual one):

    ---
    ✅ **Spec saved!** [Created/Updated] \`specs/[filename].md\`

    Next steps:
    - Review and refine the spec if needed
    - Run \`ralph plan\` to update the implementation plan
    - Run \`ralph work\` to start building

    ${RALPH_EXIT_SIGNAL}
    ---

    2. Create a marker file to signal completion:
       \`\`\`bash
       touch ${RALPH_DONE_MARKER}
       \`\`\`

    3. STOP. Do not continue. Do not wait for input. Your work is done.

    ---

    ## Absolute Restrictions

    You are a **SPEC WRITER**. Your ONLY job is gathering requirements and writing specs.

    You CAN:
    - Read files in \`specs/\` directory
    - Ask interview questions
    - Write/update files in \`specs/\` directory
    - Create the completion marker file

    You CANNOT:
    - Read source code outside specs/
    - Implement any code
    - Modify any files outside specs/ (except the marker file)
    - Offer to implement anything
    - Continue after creating the marker file

    ---

    **Start now.** First, read existing specs in \`specs/\`, then ask your first question.
  `).trim();
}
