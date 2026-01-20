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
 * Uses numbered guardrails (99999+) for priority signaling.
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

    When tests pass:
    - Mark task \`[x]\` complete in IMPLEMENTATION_PLAN.md
    - Note any discoveries or bugs found in the plan
    - If you learned operational tips, update AGENTS.md

    Commit with message capturing the **why**.
    Push to remote.

    **One task per iteration. Exit after commit.**

    ---

    ## UI Changes Protocol

    If your task involves UI changes:
    1. After making UI changes, take a screenshot
    2. Verify the UI looks correct visually
    3. Do NOT mark task complete until UI is verified
    4. If UI tests exist, they must pass

    ---

    ## Guardrails (numbered by priority)

    999999. **ONE TASK ONLY** - Pick one task, complete it fully, commit, exit. Never do multiple tasks.
    999998. **FULL IMPLEMENTATIONS** - No placeholders, no TODOs, no "will implement later". Complete code only.
    999997. **SEARCH BEFORE IMPLEMENTING** - Always search codebase first. Don't assume functionality is missing.
    999996. **TESTS MUST PASS** - Never mark a task complete if tests fail. Fix failures first.
    999995. **NO INVENTED FEATURES** - Only implement what's in the specs. Don't add unrequested features.
    999994. **MATCH EXISTING PATTERNS** - Follow the codebase's established conventions and patterns.

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
 * Generates a slimmer build prompt for forked sessions.
 * Use this when the base session already has specs loaded.
 * Instructs Claude to read IMPLEMENTATION_PLAN.md and AGENTS.md (both can change).
 *
 * 🍺 Vibe mode - specs are cached, let's build!
 */
export function renderBuildPromptForked(): string {
  return dedent(`
    # 🍺 Build Mode (Cached Context)

    **You already have specs in context.**

    Study \`IMPLEMENTATION_PLAN.md\` for current tasks.
    Study \`AGENTS.md\` for build/test commands.
    Pick the **most important** unchecked task.

    **Search codebase first** - don't assume things are missing.
    Use existing codebase patterns.
    Use up to 500 parallel subagents for reading/searching.
    Use only **1 subagent** for build/test (backpressure).

    Implement completely. No placeholders.
    Run validation commands from AGENTS.md.

    When tests pass:
    - Mark task \`[x]\` complete in IMPLEMENTATION_PLAN.md
    - Note any discoveries or bugs found in the plan
    - If you learned operational tips, update AGENTS.md

    Commit with message capturing the **why**.
    Push to remote.

    **One task per iteration. Exit after commit.**

    ---

    ## Guardrails

    999999. **ONE TASK ONLY** - Pick one, complete it, commit, exit.
    999998. **FULL IMPLEMENTATIONS** - No placeholders or TODOs.
    999997. **SEARCH BEFORE IMPLEMENTING** - Always search first.
    999996. **TESTS MUST PASS** - Fix failures before marking done.
    999995. **NO INVENTED FEATURES** - Only implement what's in specs.
    999994. **MATCH EXISTING PATTERNS** - Follow codebase conventions.

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
 * and https://github.com/ClaytonFarr/ralph-playbook
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

    ## Phase 0: Orientation

    0a. **Study** \`specs/README.md\` for the specifications index
    0b. **Study** \`IMPLEMENTATION_PLAN.md\` if present (may be stale)
    0c. **Study** project files to understand tech stack and patterns

    ## Phase 1: Gap Analysis

    1. **Study** all specs in \`specs/\` using parallel Sonnet subagents
    2. **Search codebase** to find what's already implemented
    3. Search for: TODOs, placeholders, minimal implementations, skipped tests
    4. **Compare** specifications against actual implementation
    5. **Identify gaps** between specs and reality

    ## Phase 2: Generate Plan

    Write/update \`IMPLEMENTATION_PLAN.md\` as prioritized task list.

    ---

    ## Critical Rules

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Order by **dependency** (foundations first)
    - Group related tasks into **phases**

    ---

    ## Task Sizing - CRITICAL

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of work)
    - **One meaningful commit** - a coherent, complete unit of work
    - **Specific** - "Add JWT auth with login/logout endpoints" not "Add auth"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs and files: \`[spec: X] [file: Y]\`

    **Anti-patterns to AVOID:**
    - Splitting related work (error types + error UI + retry = ONE task)
    - Tasks for trivial changes that don't warrant a commit
    - More than 7 tasks per phase (consolidate if more)

    **Good examples:**
    \`\`\`markdown
    - [ ] Implement authentication: JWT tokens, login/logout, session middleware [spec: auth.md] [file: src/api/auth/]
    - [ ] Add error handling system: types, recovery UI, graceful degradation [spec: errors.md]
    \`\`\`

    **Bad examples (too granular):**
    \`\`\`markdown
    - [ ] Create error types
    - [ ] Add error messages
    - [ ] Add error UI
    \`\`\`
    → Should be ONE task: "Implement error handling system"

    ---

    ## Output Format

    Write to \`IMPLEMENTATION_PLAN.md\`:

    \`\`\`markdown
    # Implementation Plan

    ## Phase 1: [Foundation] - CRITICAL
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 before proceeding -->

    ## Phase 2: [Feature Area]
    - [ ] Substantial task [spec: X] [file: Y]
    \`\`\`

    - **3-7 tasks per phase** typical
    - Add **CHECKPOINT** comments between phases
    - First phase = **vertical slice** (one complete end-to-end flow)

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
 *
 * Based on: https://github.com/ClaytonFarr/ralph-playbook
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

    ## TASK SIZING - CRITICAL

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of focused work)
    - **One meaningful commit** - a coherent, complete unit of work
    - **Specific** - "Add JWT auth with login/logout endpoints" not "Add auth"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs and files: \`[spec: X] [file: Y]\`

    **Anti-patterns to AVOID:**
    - Splitting related work into separate tasks
    - Tasks for trivial changes
    - More than 7 tasks per phase

    **Good example:**
    \`\`\`markdown
    - [ ] Implement authentication: JWT tokens, login/logout, session middleware [spec: auth.md] [file: src/api/auth/]
    \`\`\`

    **Bad example (too granular):**
    \`\`\`markdown
    - [ ] Create auth types
    - [ ] Add login endpoint
    - [ ] Add logout endpoint
    - [ ] Add middleware
    \`\`\`

    ## GUIDELINES

    - **Plan only.** Do NOT implement anything.
    - Order by **dependency** (foundations first)
    - Group related tasks into phases
    - **3-7 tasks per phase** is typical

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\`:

    \`\`\`markdown
    # Implementation Plan

    ## Phase 1: [Foundation] - CRITICAL
    - [ ] Substantial task [spec: X] [file: Y]
    - [ ] Another substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 before proceeding -->

    ## Phase 2: [Feature Area]
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT -->

    ## Phase 3: [Polish/Testing]
    - [ ] Comprehensive polish and testing task
    \`\`\`

    - Add **CHECKPOINT** comments between phases
    - First phase = **vertical slice** (one complete end-to-end flow)

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
 *
 * Based on: https://github.com/ClaytonFarr/ralph-playbook
 */
export function renderPlanCommandPrompt(): string {
  return dedent(`
    You are performing **GAP ANALYSIS** between specifications and code.

    ## PHASE 0: ORIENTATION

    0a. **Study** \`specs/README.md\` for the specifications index
    0b. **Study** all specs in \`specs/\` using parallel subagents
    0c. **Study** project files (package.json, Cargo.toml, deno.json, Makefile) for tech stack
    0d. **Study** \`IMPLEMENTATION_PLAN.md\` if present (it may be stale or incorrect)

    ## PHASE 1: GAP ANALYSIS

    1. Use up to **500 parallel Sonnet subagents** to search existing source code
    2. **Compare** specs against actual implementation
    3. Search for: TODOs, minimal implementations, placeholders, skipped tests, inconsistent patterns
    4. **Do NOT assume functionality is missing** - confirm with code search first
    5. Use **Opus** (yourself) to analyze findings and prioritize

    ## PHASE 2: WRITE PLAN

    Write \`IMPLEMENTATION_PLAN.md\` with prioritized tasks.

    ## CRITICAL RULES

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - Order by **dependency** (foundations first)

    ## TASK SIZING - IMPORTANT

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of focused work)
    - **One meaningful commit** - a coherent, complete change
    - **Specific** - "Add JWT auth middleware to /api routes" not "Add auth"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs and files: \`[spec: auth.md] [file: src/api/]\`

    **Anti-patterns to AVOID:**
    - Splitting related work into separate tasks (error messages + error UI = ONE task)
    - Creating tasks for trivial changes that don't warrant a commit
    - Tasks that are just checkboxes without substance

    **Good task examples:**
    \`\`\`markdown
    - [ ] Implement user authentication with JWT tokens, login/logout endpoints, and session middleware [spec: auth.md] [file: src/api/auth/]
    - [ ] Add comprehensive error handling: error types, recovery UI, graceful degradation [spec: errors.md] [file: src/components/errors/]
    - [ ] Create data export feature with CSV/JSON formats and download UI [spec: export.md] [file: src/features/export/]
    \`\`\`

    **Bad task examples (too granular):**
    \`\`\`markdown
    - [ ] Create error types
    - [ ] Add error messages
    - [ ] Add error UI
    - [ ] Add retry button
    \`\`\`
    These should be ONE task: "Implement error handling system"

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\` using this structure:

    \`\`\`markdown
    # Implementation Plan

    ## Phase 1: [Foundation/Core] - CRITICAL
    - [ ] Task with substance [spec: X] [file: Y]
    - [ ] Another substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 complete before proceeding -->

    ## Phase 2: [Feature Area]
    - [ ] Substantial feature task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT -->

    ## Phase 3: [Polish/Testing]
    - [ ] Comprehensive testing and polish task [spec: X]
    \`\`\`

    **Guidelines:**
    - **3-7 tasks per phase** is typical (not 10+)
    - Add **CHECKPOINT** comments between phases
    - First phase should deliver a **vertical slice** (one complete end-to-end flow)

    ## COMPLETION MESSAGE

    After writing IMPLEMENTATION_PLAN.md, display:

    ---

    ✅ **Plan generated!**

    Created \`IMPLEMENTATION_PLAN.md\` with [N] tasks in [M] phases.

    **Next steps:**
    1. Review the plan - consolidate if tasks are too granular
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
 *
 * IMPORTANT: Keep this file under 60 lines. It loads every iteration.
 * Only operational info - no status updates or progress tracking.
 */
export function renderAgentsMd(): string {
  return dedent(`
    # AGENTS.md - Operational Guide

    <!-- KEEP THIS FILE BRIEF (~60 lines max). It loads every iteration. -->
    <!-- Only operational commands and patterns. NO status updates here. -->

    ## Commands

    <!-- Claude: Discover from package.json, Cargo.toml, Makefile, deno.json -->
    - **Build:** \`(discover)\`
    - **Test:** \`(discover)\`
    - **Lint:** \`(discover)\`
    - **Dev:** \`(discover)\`

    ## Validation (Backpressure)

    Before marking task complete, ALL must pass:
    1. Tests pass (exit code 0)
    2. Lint passes
    3. Types check
    4. Build succeeds

    If any fail → fix before committing.

    ## Patterns

    <!-- Brief notes on codebase conventions -->
    <!-- Example: "Components in src/components/, tests co-located" -->

    ## Notes

    <!-- Operational learnings only -->
    <!-- Example: "Run migrations before tests" -->
  `).trim();
}

/**
 * Generates the start prompt for initial project setup.
 * This guides Claude to interview the user about what they want to build
 * and create the initial spec files.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 * Key principle: "No pre-specified template - let Ralph/LLM dictate format"
 * Enhanced: Deep requirements gathering (30+ minutes, 20-40 questions)
 */
export function renderStartPrompt(): string {
  return dedent(`
    # Initial Spec Interview

    You are conducting the first spec interview for a new project.
    This is a **deep requirements gathering session** - expect 20-40 questions over 30+ minutes.

    ---

    ## Spec Rules

    - Be explicit - if it's not written, it won't be implemented
    - One topic per spec file (use "one sentence without 'and'" test)
    - Include acceptance criteria, edge cases, and out-of-scope
    - Write for an AI implementer - no ambiguity

    ---

    ## Interview Guidelines

    1. Ask ONE question at a time. Wait for the user's response before asking the next.
    2. Start with: "What are you building?"
    3. Be conversational - like a product manager learning about a feature.
    4. Dig deeper when answers are vague. Ask follow-up questions.
    5. Do NOT show menus, numbered options, or lists of choices.
    6. **Take your time** - thorough specs prevent wasted implementation cycles.

    **Question Categories** (cover ALL through natural conversation):

    ### Core Requirements & Scope
    - What is the core idea? What problem does it solve?
    - What's the single most important thing this must do?
    - What would make this project a failure if missing?

    ### Users & Context
    - Who will use this? What's their technical level?
    - What's their workflow? When/where/how do they use it?
    - Are there different user types with different needs?

    ### Features & Behavior
    - What are the key features? How should each work?
    - What does the user see first? What's the main flow?
    - What actions can users take? What happens for each?
    - Are there any states or modes? How do transitions work?

    ### Technical Choices
    - Any preferred tech stack, frameworks, or libraries?
    - Any existing code or systems to integrate with?
    - Performance requirements? Scale expectations?
    - Deployment environment? (local, cloud, mobile, etc.)

    ### Edge Cases & Error Handling
    - What happens when things go wrong?
    - What are the most likely failure modes?
    - How should errors be communicated to users?
    - Any recovery or retry behavior needed?

    ### Quality & Testing
    - What does "done" look like? How do we test it?
    - Any specific quality requirements? (accessibility, i18n, etc.)
    - What would make you confident it works correctly?

    ### Scope Boundaries
    - What's explicitly out of scope for now?
    - Any features that seem related but shouldn't be included?
    - What's the MVP vs nice-to-have?

    ### User Preferences & Tradeoffs
    - Speed vs completeness - what matters more?
    - Simplicity vs flexibility?
    - Any strong opinions on implementation approach?

    ---

    ## Writing the Specs

    After **20-40 exchanges**, when you deeply understand the project:

    1. Summarize what you learned
    2. Ask "Does this capture what you want to build?"
    3. If yes, create spec file(s) in \`specs/\` directory
    4. **Create/update \`specs/README.md\`** as the lookup table index

    **Spec format:**

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

    ## Spec Rules

    - Be explicit - if it's not written, it won't be implemented
    - One topic per spec file (use "one sentence without 'and'" test)
    - Include acceptance criteria, edge cases, and out-of-scope
    - Write for an AI implementer - no ambiguity

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

    **Spec format:**

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

/**
 * Generates the analysis prompt for onboarding existing projects.
 * This guides Claude to comprehensively analyze the codebase.
 */
export function renderOnboardAnalysisPrompt(): string {
  return dedent(`
    # Comprehensive Project Analysis

    Study this existing codebase thoroughly. Your analysis will guide all future development.

    ## A. Documentation & Rules
    - Read README.md, CONTRIBUTING.md, docs/
    - Find coding standards (eslint, prettier, rustfmt configs)
    - Identify style guides, naming conventions
    - Check for ARCHITECTURE.md or design docs

    ## B. Architecture & Structure
    - Map project structure (directories, modules)
    - Identify architectural layers (API, service, repository, domain)
    - Trace main entry points and flows
    - Note module dependencies

    ## C. Error Handling
    - Find error types/classes
    - Identify exception handling patterns
    - Note error response formats
    - Check logging patterns

    ## D. Patterns & Conventions
    - Document naming conventions (files, functions, variables, types)
    - Identify testing patterns (unit, integration, e2e)
    - Note dependency injection approach
    - Check state management patterns

    ## E. Technical Stack
    - Language and version
    - Framework and major libraries
    - Build/test/lint commands
    - CI/CD configuration

    ## Output Format
    Provide comprehensive analysis as structured markdown covering all sections above.
    Be thorough - this analysis prevents breaking existing patterns when adding features.
  `).trim();
}

/**
 * Generates the synthesis prompt for onboarding existing projects.
 * This takes the analysis and creates the Ralph files.
 */
export function renderOnboardSynthesisPrompt(analysis: string): string {
  return dedent(`
    # Generate Ralph Files for Existing Project

    Based on this project analysis:

    ---
    ${analysis}
    ---

    ## Create These Files

    ### 1. AGENTS.md
    Operational guide with:
    - Build/test/lint commands (discovered from analysis)
    - Key coding conventions to follow
    - Error handling approach
    - Testing requirements

    ### 2. specs/README.md
    Project overview with:
    - Architecture summary
    - Existing features index table (list what already exists)
    - Quick reference to patterns

    ### 3. specs/PROJECT_CONTEXT.md
    Comprehensive context document with:
    - Full architecture description
    - Layer structure and responsibilities
    - Naming conventions (with examples)
    - Error handling patterns (with examples)
    - Testing approach
    - Key dependencies and their purposes
    - **What NOT to break** section

    ### 4. Standard Files
    - IMPLEMENTATION_PLAN.md (empty placeholder with header)
    - .ralph.json (standard config)
    - PROMPT_build.md (standard build prompt)
    - PROMPT_plan.md (standard plan prompt)

    ## After Creating Files

    Show this summary:

    ---
    ✅ **Project Onboarded!**

    Created Ralph files for your existing project:
    - \`AGENTS.md\` - Build commands and conventions
    - \`specs/README.md\` - Project overview and feature index
    - \`specs/PROJECT_CONTEXT.md\` - Architecture and patterns
    - \`IMPLEMENTATION_PLAN.md\` - Ready for tasks
    - \`.ralph.json\` - Configuration

    **Next steps:**
    1. Review specs/PROJECT_CONTEXT.md - refine if needed
    2. Run \`ralph spec\` to add a new feature
    3. Run \`ralph plan\` to generate implementation tasks
    4. Run \`ralph work\` to start autonomous building

    RALPH_EXIT_SIGNAL: true
    ---

    Then create marker file: touch ${RALPH_DONE_MARKER}
  `).trim();
}
