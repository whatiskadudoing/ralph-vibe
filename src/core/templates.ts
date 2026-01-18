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
 * Simplified per Geoff Huntley's guidance - minimal prompt, maximum clarity.
 */
export function renderBuildPrompt(): string {
  return dedent(`
    # Build Mode

    Study \`specs/README.md\` for the specifications index.
    Study \`IMPLEMENTATION_PLAN.md\` for current tasks.
    Study \`AGENTS.md\` for build/test commands.

    Pick the **most important** unchecked task.
    **Search codebase first** - don't assume things are missing.

    Use existing codebase patterns.
    Use up to 500 parallel subagents for reading/searching.
    Use only **1 subagent** for build/test (backpressure).

    Implement completely. No placeholders.
    Run validation commands from AGENTS.md.
    When tests pass, mark task \`[x]\` complete in plan.
    Commit with message capturing the **why**.
    Push to remote.

    **One task per iteration. Exit after commit.**

    ---

    If all tasks done: \`EXIT_SIGNAL: true\`

    End with:
    \`\`\`
    RALPH_STATUS:
    task: "[task name]"
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

    1. **Study** \`specs/README.md\` for the specifications index
    2. **Study** all specs in \`specs/\` (use parallel Sonnet subagents)
    3. **Study** project files to understand tech stack and patterns
    4. **Search codebase** to find what's already implemented
    5. **Compare** specifications against actual implementation
    6. **Identify gaps** between specs and reality
    7. Generate/update \`IMPLEMENTATION_PLAN.md\` as prioritized task list

    ---

    ## Critical Rules

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Each task should be completable in **one iteration**
    - Order by **dependency** (foundations first)
    - Group related tasks into **phases**

    ---

    ## Task Format (with Linkage)

    Each task MUST include **linkage** - cite the spec and/or files it relates to:

    \`\`\`markdown
    - [ ] Add login endpoint [spec: auth.md] [file: src/api/routes.ts]
    - [ ] Create session middleware [spec: auth.md] [file: src/middleware/]
    - [ ] Add password validation [spec: auth.md, validation.md]
    \`\`\`

    This helps the build loop find relevant context faster.

    Each task should be:
    - **Small** - completable in one iteration
    - **Clear** - no ambiguity about what to do
    - **Linked** - cite specs and files it touches
    - **Testable** - how do we know it's done?

    ---

    ## Output

    Write to \`IMPLEMENTATION_PLAN.md\`. Include:

    - Phases grouping related tasks
    - Checkbox tasks with linkage: \`- [ ] Task [spec: X] [file: Y]\`
    - Priority order (foundations first)

    The plan is **disposable** - if wrong or stale, regenerate it.
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

    1. **Study** \`specs/README.md\` for the specifications index
    2. **Study** all specs in \`specs/\` (use parallel subagents)
    3. **Study** project files (package.json, Cargo.toml, etc.) for tech stack
    4. **Search codebase** to find what's already implemented - do NOT assume missing
    5. **Compare** specifications against actual implementation
    6. **Identify gaps** between specs and reality
    7. **Write** \`IMPLEMENTATION_PLAN.md\` with prioritized tasks

    ## CRITICAL RULES

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Each task should be completable in **one iteration**
    - Order by **dependency** (foundations first)

    ## TASK FORMAT (with Linkage)

    Each task MUST include **linkage** - cite the spec and/or files it relates to:

    \`\`\`markdown
    - [ ] Add login endpoint [spec: auth.md] [file: src/api/routes.ts]
    - [ ] Create session middleware [spec: auth.md] [file: src/middleware/]
    - [ ] Add password validation [spec: auth.md, validation.md]
    \`\`\`

    Each task should be:
    - **Small** - completable in one iteration
    - **Clear** - no ambiguity
    - **Linked** - cite specs and files
    - **Testable** - how do we know it's done?

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\`:

    - Group related tasks into phases
    - Use checkbox format with linkage: \`- [ ] Task [spec: X] [file: Y]\`
    - Order by priority (foundations first)

    ## COMPLETION MESSAGE

    After writing IMPLEMENTATION_PLAN.md, display:

    ---

    ✅ **Plan generated!**

    Created \`IMPLEMENTATION_PLAN.md\` with [N] tasks in [M] phases.

    **Next steps:**
    1. Review the plan - edit tasks as needed
    2. Run \`ralph work\` to start the autonomous build loop

    The plan is disposable - regenerate with \`ralph plan\` if needed.

    ---

    Start now. Read specs/README.md and analyze the codebase.
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
    4. **Create/update \`specs/README.md\`** as the lookup table index

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

    **IMPORTANT: Create \`specs/README.md\`** as the specifications index:

    \`\`\`markdown
    # Specifications Index

    Lookup table for all project specifications.

    | Spec | Description | Key Topics |
    |------|-------------|------------|
    | [feature.md](feature.md) | Brief description | topic1, topic2, topic3 |
    | [auth.md](auth.md) | User authentication | login, sessions, tokens |

    ## Quick Reference

    - **Authentication**: See [auth.md](auth.md)
    - **Data Export**: See [export.md](export.md)
    \`\`\`

    This index helps the build loop find relevant specs faster.

    ---

    ## Completion Steps

    After creating all spec files AND specs/README.md, do these steps IN ORDER:

    1. Display this completion message (replace filenames with actual ones):

    ---
    ✅ **Specs created!**

    I've created the following specifications:
    - \`specs/README.md\` (index)
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
    4. **Update \`specs/README.md\`** to include the new/updated spec in the index
    5. Show the completion message
    6. Say goodbye and END

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

    **IMPORTANT: Update \`specs/README.md\`** to add the new spec to the index table:

    \`\`\`markdown
    | Spec | Description | Key Topics |
    |------|-------------|------------|
    | [new-feature.md](new-feature.md) | Brief description | topic1, topic2 |
    \`\`\`

    ---

    ## Completion Steps

    After saving the spec AND updating specs/README.md, do these steps IN ORDER:

    1. Display this completion message (replace filename with actual one):

    ---
    ✅ **Spec saved!** [Created/Updated] \`specs/[filename].md\`

    Updated \`specs/README.md\` index.

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
