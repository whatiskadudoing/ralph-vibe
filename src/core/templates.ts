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

    Study all specs in \`specs/*\` with up to 250 parallel Sonnet subagents.
    Study \`IMPLEMENTATION_PLAN.md\` for current tasks.
    Study \`AGENTS.md\` for build/test commands.

    Pick the **most important** unchecked task.
    **Search codebase first** - don't assume things are missing.

    Use existing codebase patterns.
    Use up to 500 parallel **Sonnet** subagents for reading/searching.
    Use only **1 Sonnet subagent** for build/test (backpressure).

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
    999993. **NO MIGRATIONS OR ADAPTERS** - Avoid creating migration files or adapters. Maintain single sources of truth.
    999992. **FIX ALL TEST FAILURES** - Resolve any test failures encountered, even if unrelated to current task.
    999991. **SPEC INCONSISTENCIES** - If you find inconsistencies in specs/*, note them in IMPLEMENTATION_PLAN.md. Use Opus subagent with ultrathink to update the specs if critical.
    999990. **DEBUGGING LOGGING** - You may add extra logging if required to debug issues. Remove or guard behind debug flags before committing.
    999989. **PLAN CLEANUP** - When IMPLEMENTATION_PLAN.md becomes large, periodically clean out completed items using a subagent.

    ---

    If all tasks done: \`EXIT_SIGNAL: true\`

    End with:
    \`\`\`
    RALPH_STATUS:
    task: "[task name]"
    validation: pass/fail
    EXIT_SIGNAL: true/false
    SLC_COMPLETE: true/false
    \`\`\`

    **SLC_COMPLETE Guide:**
    - \`true\` = ALL specs in \`specs/*\` are fully implemented at their target depth
    - \`false\` = Current SLC release is done, but Future Work section has items for next release

    Set \`SLC_COMPLETE: true\` ONLY when there are no more features to build.
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
    Use up to 500 parallel **Sonnet** subagents for reading/searching.
    Use only **1 Sonnet subagent** for build/test (backpressure).

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
    999993. **NO MIGRATIONS OR ADAPTERS** - Maintain single sources of truth.
    999992. **FIX ALL TEST FAILURES** - Fix all failures, even unrelated ones.
    999991. **SPEC INCONSISTENCIES** - Note in plan; update specs if critical (Opus + ultrathink).
    999990. **DEBUGGING LOGGING** - Add logging to debug; remove before commit.
    999989. **PLAN CLEANUP** - Clean completed items when plan gets large.

    ---

    If all tasks done: \`EXIT_SIGNAL: true\`

    End with:
    \`\`\`
    RALPH_STATUS:
    task: "[task name]"
    validation: pass/fail
    EXIT_SIGNAL: true/false
    SLC_COMPLETE: true/false
    \`\`\`

    **SLC_COMPLETE Guide:**
    - \`true\` = ALL specs in \`specs/*\` are fully implemented at their target depth
    - \`false\` = Current SLC release is done, but Future Work section has items for next release

    Set \`SLC_COMPLETE: true\` ONLY when there are no more features to build.
  `).trim();
}

/**
 * Generates the Task-Scoped SLC build prompt.
 * Each iteration becomes a mini SLC (Spec-Learn-Create) cycle for ONE task,
 * using Claude Code's Tasks system as coordination and safeguard mechanism.
 *
 * Structure: SPEC → LEARN → CREATE → SAFEGUARD
 *
 * Benefits:
 * - Nothing forgotten (task breakdown)
 * - Better context (parallel exploration)
 * - Multi-gate verification (safeguards)
 * - Higher first-time success rate
 */
export function renderBuildPromptTaskSLC(): string {
  return dedent(`
    # Build Mode - Task-Scoped SLC

    You will complete ONE task from IMPLEMENTATION_PLAN.md using the **SLC process**.
    This structured approach ensures completeness and quality.

    ---

    ## 📋 SPEC Phase: Task Breakdown

    1. **Read the parent task** from IMPLEMENTATION_PLAN.md (the next unchecked task)

    2. **Break it down** into sub-tasks using TaskCreate:
       - Each sub-task should be concrete and testable
       - Express dependencies using \`addBlockedBy\`
       - Identify which sub-tasks can run in parallel
       - Typical breakdown: 4-8 sub-tasks

    **Example** for "Implement user authentication":
    \`\`\`
    TaskCreate(subject: "Read auth spec and existing code",
               description: "Study specs/auth.md and existing auth patterns",
               activeForm: "Reading auth spec")

    TaskCreate(subject: "Create JWT utility functions",
               description: "Sign, verify, decode tokens. No placeholders.",
               activeForm: "Creating JWT utils")

    TaskCreate(subject: "Add authentication middleware",
               description: "Verify tokens, attach user to request",
               activeForm: "Adding auth middleware",
               addBlockedBy: ["Create JWT utility functions"])

    TaskCreate(subject: "Create auth routes",
               description: "Login, logout, refresh endpoints",
               activeForm: "Creating auth routes",
               addBlockedBy: ["Add authentication middleware"])

    TaskCreate(subject: "Write unit tests",
               description: "Test JWT utils and middleware in isolation",
               activeForm: "Writing unit tests",
               addBlockedBy: ["Add authentication middleware"])

    TaskCreate(subject: "Write integration tests",
               description: "Test full auth flow end-to-end",
               activeForm: "Writing integration tests",
               addBlockedBy: ["Create auth routes"])

    TaskCreate(subject: "Update documentation",
               description: "Document auth endpoints and usage",
               activeForm: "Updating docs",
               addBlockedBy: ["Create auth routes"])
    \`\`\`

    **Sub-task Categories:**
    - **Reading/Analysis**: Study specs, read existing code (usually parallel-safe)
    - **Foundation**: Core utilities and helpers (other things depend on these)
    - **Main Implementation**: Primary functionality (depends on foundation)
    - **Integration**: Connecting components (depends on main)
    - **Verification**: Tests and validation (depends on implementation)
    - **Documentation**: Update docs (depends on implementation)

    ---

    ## 🔍 LEARN Phase: Gather Context

    Use **parallel Task agents** to gather information efficiently:

    \`\`\`
    Task(subagent_type: "Explore",
         description: "Find auth best practices",
         prompt: "Search for JWT authentication best practices, security considerations, and common pitfalls in 2026",
         model: "sonnet")

    Task(subagent_type: "Explore",
         description: "Read existing patterns",
         prompt: "Study existing code patterns in this codebase - error handling, middleware structure, test patterns",
         model: "sonnet")

    Task(subagent_type: "Explore",
         description: "Check security requirements",
         prompt: "Review specs/auth.md for security requirements, token expiry, refresh flow details",
         model: "sonnet")
    \`\`\`

    **Wait for all agents to complete**, then synthesize their findings.
    Use this context throughout the CREATE phase.

    ---

    ## ⚙️ CREATE Phase: Implementation

    Execute sub-tasks following their dependency chain:

    1. **Get unblocked tasks**: TaskList → Find tasks with empty \`blockedBy\` list

    2. **For each task**:
       - TaskUpdate(taskId: X, status: "in_progress")
       - Implement fully (no placeholders!)
       - Use findings from LEARN phase
       - Follow existing codebase patterns
       - TaskUpdate(taskId: X, status: "completed")

    3. **Repeat** until all sub-tasks complete

    **Parallel execution (optional)**:
    - If multiple sub-tasks are unblocked AND modify different files
    - You MAY spawn parallel builder agents
    - Use \`Task(subagent_type: "builder", run_in_background: true)\`
    - But this is optional - serial execution is fine

    **Search before implementing**:
    - Use up to 500 parallel Sonnet subagents for reading/searching
    - Don't assume functionality is missing
    - Reuse existing patterns

    **Build/test backpressure**:
    - Use only 1 Sonnet subagent for build/test operations
    - This prevents overwhelming the system

    ---

    ## 🛡️ SAFEGUARD Phase: Multi-Gate Verification

    **CRITICAL**: You CANNOT exit until ALL safeguards pass.

    Run these checks in order:

    ### Gate 1: Task Completion
    \`\`\`
    TaskList

    ✅ All sub-tasks show status: "completed"?
    ❌ NO? Continue working - mark incomplete tasks as in_progress and fix
    \`\`\`

    ### Gate 2: Test Verification
    \`\`\`bash
    # Run command from AGENTS.md (usually: deno test, npm test, etc.)
    [test command]

    ✅ Exit code 0? All tests pass?
    ❌ NO? Which sub-task's code broke tests?
         → TaskUpdate that task to in_progress
         → Fix the issue
         → Re-run safeguards
    \`\`\`

    ### Gate 3: Type Verification
    \`\`\`bash
    # Run type check from AGENTS.md (e.g., deno check, tsc --noEmit)
    [type check command]

    ✅ No type errors?
    ❌ NO? Fix types and re-verify
    \`\`\`

    ### Gate 4: Linter Verification
    \`\`\`bash
    # Run linter from AGENTS.md (e.g., deno lint, eslint)
    [lint command]

    ✅ Clean? No warnings?
    ❌ NO? Fix issues and re-verify
    \`\`\`

    ### Gate 5: Completeness Check
    - ✅ No TODO comments in new code
    - ✅ No placeholder implementations
    - ✅ No commented-out code blocks
    - ✅ All acceptance criteria from spec met
    - ✅ Edge cases handled

    ### Gate 6: UI Verification (if applicable)
    If your task involved UI changes:
    - ✅ Screenshot taken showing changes
    - ✅ Visual appearance correct
    - ✅ UI tests pass (if they exist)

    ---

    ## ✅ Completion

    **ONLY when ALL safeguards pass:**

    1. Mark parent task \`[x]\` complete in IMPLEMENTATION_PLAN.md
    2. Note any discoveries or bugs found
    3. If you learned operational tips, update AGENTS.md
    4. Commit with message capturing the **why**
    5. Push to remote

    **Exit the iteration.**

    ---

    ## Critical Rules (Guardrails)

    999999. **ONE PARENT TASK ONLY** - Pick one task from the plan, complete it using SLC, exit. Never do multiple parent tasks.
    999998. **CANNOT SKIP SAFEGUARDS** - All gates must pass. No exceptions.
    999997. **SUB-TASKS REQUIRED** - Break down any non-trivial work. Don't skip SPEC phase.
    999996. **FULL IMPLEMENTATIONS** - No placeholders, no TODOs, no "will implement later".
    999995. **SEARCH BEFORE IMPLEMENTING** - Always search codebase first. Don't assume functionality is missing.
    999994. **TESTS MUST PASS** - Never exit if tests fail. Fix failures first.
    999993. **NO INVENTED FEATURES** - Only implement what's in the specs. Don't add unrequested features.
    999992. **MATCH EXISTING PATTERNS** - Follow the codebase's established conventions.
    999991. **NO MIGRATIONS OR ADAPTERS** - Maintain single sources of truth.
    999990. **FIX ALL TEST FAILURES** - Even unrelated ones discovered during testing.
    999989. **SPEC INCONSISTENCIES** - Note in IMPLEMENTATION_PLAN.md; update specs if critical (Opus + ultrathink).

    ---

    ## Output Format

    End with RALPH_STATUS showing which phase you're in:

    \`\`\`
    RALPH_STATUS:
    task: "[parent task name]"
    phase: "SPEC|LEARN|CREATE|SAFEGUARD|COMPLETE"
    sub_tasks_complete: [number]/[total]
    validation: pass/fail
    EXIT_SIGNAL: true/false
    SLC_COMPLETE: true/false
    \`\`\`

    **Phase guide:**
    - SPEC: Creating task breakdown
    - LEARN: Gathering context
    - CREATE: Implementing sub-tasks
    - SAFEGUARD: Running verification gates
    - COMPLETE: All done, ready to exit

    **EXIT_SIGNAL:**
    - \`true\` = All safeguards passed, task marked complete, ready to exit
    - \`false\` = Still working (in any phase) or safeguards failed

    **SLC_COMPLETE:**
    - \`true\` = ALL specs in \`specs/*\` fully implemented
    - \`false\` = Current task done, but more tasks remain

    ---

    ## Example Output

    \`\`\`
    RALPH_STATUS:
    task: "Implement user authentication"
    phase: "COMPLETE"
    sub_tasks_complete: 7/7
    validation: pass
    EXIT_SIGNAL: true
    SLC_COMPLETE: false
    \`\`\`

    ---

    **Start now with SPEC phase.** Read IMPLEMENTATION_PLAN.md and break down the next unchecked task.
  `).trim();
}

/**
 * Generates the PROMPT_plan.md content.
 * This is used when generating or regenerating the implementation plan.
 * Now includes SLC (Simple, Lovable, Complete) release planning.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 * and https://github.com/ClaytonFarr/ralph-playbook
 */
export function renderPlanPrompt(): string {
  return dedent(`
    # Plan Mode - SLC Release Planning

    You are performing **GAP ANALYSIS** and **SLC RELEASE PLANNING**.

    ---

    ## Model Strategy

    - Use **250 parallel Sonnet subagents** to study all specs in \`specs/\`
    - Use **250 parallel Sonnet subagents** to study \`src/lib/*\` (shared utilities/patterns - treat as standard library)
    - Use **500 parallel Sonnet subagents** to search and study existing code in \`src/*\`
    - Use **Opus** (yourself) for synthesis, SLC recommendation, and plan generation

    ---

    ## Phase 0: Understand WHO We're Building For

    **FIRST**, study \`AUDIENCE_JTBD.md\` to understand:
    - Who the primary audience is
    - What jobs-to-be-done (JTBDs) they have
    - What outcomes they're trying to achieve

    This context is ESSENTIAL for recommending the right SLC release.

    ---

    ## Phase 1: Orientation

    1a. **Study** \`AUDIENCE_JTBD.md\` for audience and jobs context
    1b. **Study** \`specs/README.md\` for the activity map index
    1c. **Study** \`IMPLEMENTATION_PLAN.md\` if present (may be stale)
    1d. **Study** project files to understand tech stack and patterns
    1e. **Review** \`research/\` folder if present:
        - \`research/readiness.md\` - Are we ready to build?
        - \`research/inspiration.md\` - What similar projects exist?
        - \`research/apis/\` - What APIs are available and verified?
        - \`research/approaches/\` - What implementation patterns were found?

    ## Phase 2: Gap Analysis

    1. **Study** all activity specs in \`specs/\` using parallel Sonnet subagents
    2. **Search codebase** to find what's already implemented
    3. Search for: TODOs, placeholders, minimal implementations, skipped tests
    4. **Compare** specifications against actual implementation
    5. **Identify gaps** between specs and reality
    6. **Cross-reference** gaps with \`research/apis/\` - do we have what we need?
    7. **Cross-reference** gaps with \`research/approaches/\` - do we know HOW to build it?

    ## Phase 3: Journey Sequencing & SLC Release Recommendation

    ### Step 1: Sequence Activities into User Journey

    **FIRST**, sequence the activities from \`specs/*\` into a user journey map:
    - How do activities flow into each other?
    - What dependencies exist between activities?
    - What's the natural order a user would follow?

    Visualize activities as columns (journey backbone) with capability depths as rows.

    ### Step 2: Determine the NEXT SLC Release

    Use **ultrathink** reasoning for complex synthesis decisions.

    An SLC release is a **horizontal slice** through the story map:
    - **Simple** - narrow scope, minimal features
    - **Lovable** - delightful, solves a real problem completely
    - **Complete** - a finished product, not a feature preview

    Consider the activities and their capability depths:
    - Which activities are essential for the thinnest useful slice?
    - What capability depth (Basic/Standard/Advanced) for each?
    - What's the MINIMUM that delivers real value to the audience?

    **Example SLC slices (horizontal cuts through journey):**

    | Release | Activities | Depths | Value |
    |---------|------------|--------|-------|
    | Palette Picker | Upload → Extract → Export | B/B/B | Instant color utility |
    | Mood Board | Upload → Extract → Arrange | B/S/B | Creative composition |
    | Design Studio | All activities | S/S/S | Professional tool |

    ## Phase 4: Generate Plan

    Write/update \`IMPLEMENTATION_PLAN.md\` with SLC recommendation + tasks.

    ---

    ## Critical Rules

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - **Recommend ONE SLC release** - the thinnest slice that delivers real value
    - Order tasks by **dependency** (foundations first)
    - Scope tasks to the **recommended SLC** only

    ---

    ## Task Sizing - CRITICAL

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of work)
    - **One meaningful commit** - a coherent, complete unit of work
    - **Specific** - "Implement Upload Photo activity at Basic depth" not "Add upload"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs, files, AND research: \`[spec: X] [file: Y] [research: Z]\`

    **Anti-patterns to AVOID:**
    - Splitting related work (error types + error UI + retry = ONE task)
    - Tasks for trivial changes that don't warrant a commit
    - More than 7 tasks per phase (consolidate if more)
    - Building beyond the SLC scope

    ---

    ## Output Format

    Write to \`IMPLEMENTATION_PLAN.md\`:

    \`\`\`markdown
    # Implementation Plan

    ## Recommended SLC Release: [Name]

    **Audience:** [Primary audience from AUDIENCE_JTBD.md]

    **Value proposition:** [What problem does this slice solve completely?]

    **Activities included:**

    | Activity | Depth | Why Included |
    |----------|-------|--------------|
    | [Activity 1] | Basic | [Essential for core job] |
    | [Activity 2] | Basic | [Completes the flow] |

    **What's NOT in this slice:** [Activities/depths deferred to later releases]

    ---
    <!-- HUMAN VERIFICATION: Does this slice form a coherent, valuable product? -->

    ## Phase 1: [Foundation] - CRITICAL
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 before proceeding -->

    ## Phase 2: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT -->

    ## Phase 3: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]

    ---

    ## Future Work (Outside Current Scope)
    - [Discovery 1] - noted during analysis, deferred to future release
    - [Discovery 2] - not in current SLC slice
    \`\`\`

    - **3-7 tasks per phase** typical
    - Add **CHECKPOINT** comments between phases
    - First phase = **vertical slice** (one complete end-to-end flow)
    - Tasks should deliver the **recommended SLC**, not all specs
    - **Note discoveries outside scope** as future work (don't lose insights)

    The plan is **disposable** - if wrong or stale, regenerate it.
  `).trim();
}

/**
 * Generates the analysis prompt for the first stage (Sonnet).
 * This stage gathers context about audience, specs, and existing code.
 */
export function renderAnalysisPrompt(): string {
  return dedent(`
    You are analyzing a codebase to prepare for SLC release planning.

    ## YOUR TASK

    Gather comprehensive context about the project. Output a structured analysis.

    ### Step 0: Read Audience & Jobs Context
    Read \`AUDIENCE_JTBD.md\` if it exists. Extract:
    - Primary audience description
    - Jobs-to-be-done (JTBDs) and their triggers
    - Activities mapped to each JTBD
    - Capability depths defined (Basic/Standard/Advanced)

    ### Step 1: Read All Activity Specs
    Read every file in \`specs/\` directory. For each activity spec, extract:
    - The activity (verb) and which JTBD it serves
    - Capability depths (Basic, Standard, Advanced)
    - Acceptance criteria
    - Dependencies on other activities

    ### Step 2: Understand the Tech Stack
    Examine project configuration files:
    - package.json, Cargo.toml, deno.json, Makefile, etc.
    - Identify frameworks, build tools, test runners
    - Note any scripts or commands

    ### Step 3: Search for Existing Implementation
    For each activity in the specs, search the codebase:
    - What's already implemented? At what depth?
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

    ## Audience & Jobs Context
    - **Audience:** [Primary audience from AUDIENCE_JTBD.md]
    - **Key JTBDs:** [List the jobs-to-be-done]
    - **Activities identified:** [List activities mapped to jobs]

    ## Tech Stack
    - Language: [language]
    - Framework: [framework]
    - Build: [build command]
    - Test: [test command]

    ## Activity Specs Summary
    [For each activity spec, list: activity name, JTBD, depths defined]

    ## Implementation Status
    | Activity | Depth Spec'd | Depth Implemented | Status |
    |----------|--------------|-------------------|--------|
    | [Activity] | B/S/A | None/B/S/A | ✅/🚧/❌ |

    ## Gaps Identified
    [List what needs to be implemented, organized by activity]

    ## Patterns & Conventions
    [Key patterns discovered]
    \`\`\`

    Be thorough. This analysis will be used for SLC release planning.
  `).trim();
}

/**
 * Generates the synthesis prompt for the second stage (Opus).
 * This stage receives analysis and generates the implementation plan.
 * Now includes SLC release recommendation.
 *
 * Based on: https://github.com/ClaytonFarr/ralph-playbook
 */
export function renderSynthesisPrompt(analysis: string): string {
  return dedent(`
    You are generating an implementation plan with SLC release recommendation.

    ## CONTEXT

    A fast analysis agent has already examined the codebase. Here is the analysis:

    ---
    ${analysis}
    ---

    ## YOUR TASK

    1. **Read \`AUDIENCE_JTBD.md\`** to understand who we're building for
    2. **Recommend an SLC release** - the thinnest slice that delivers real value
    3. **Create \`IMPLEMENTATION_PLAN.md\`** scoped to that SLC release

    ## SLC RELEASE PLANNING

    An SLC release is a **horizontal slice** through the story map:
    - **Simple** - narrow scope, minimal features
    - **Lovable** - delightful, solves a real problem completely
    - **Complete** - a finished product, not a feature preview

    **Think:** "What's the thinnest slice that delivers real value to the audience?"

    Consider:
    - Which activities are essential for the thinnest useful slice?
    - What capability depth (Basic/Standard/Advanced) for each?
    - What's the MINIMUM that delivers value?

    ## TASK SIZING - CRITICAL

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of focused work)
    - **One meaningful commit** - a coherent, complete unit of work
    - **Specific** - "Implement Upload Photo at Basic depth" not "Add upload"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs, files, AND research: \`[spec: X] [file: Y] [research: Z]\`

    **Anti-patterns to AVOID:**
    - Splitting related work into separate tasks
    - Tasks for trivial changes
    - More than 7 tasks per phase
    - Building beyond the SLC scope

    ## GUIDELINES

    - **Plan only.** Do NOT implement anything.
    - **Recommend ONE SLC release** first
    - **Scope tasks to that SLC** - don't plan all specs
    - Order by **dependency** (foundations first)
    - Group related tasks into phases
    - **3-7 tasks per phase** is typical

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\`:

    \`\`\`markdown
    # Implementation Plan

    ## Recommended SLC Release: [Name]

    **Audience:** [Primary audience from AUDIENCE_JTBD.md]

    **Value proposition:** [What problem does this slice solve completely?]

    **Activities included:**

    | Activity | Depth | Why Included |
    |----------|-------|--------------|
    | [Activity 1] | Basic | [Essential for core job] |
    | [Activity 2] | Basic | [Completes the flow] |

    **What's NOT in this slice:** [Activities/depths deferred]

    ---
    <!-- HUMAN VERIFICATION: Does this slice form a coherent, valuable product? -->

    ## Phase 1: [Foundation] - CRITICAL
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 before proceeding -->

    ## Phase 2: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT -->

    ## Phase 3: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]
    \`\`\`

    - Add **CHECKPOINT** comments between phases
    - First phase = **vertical slice** (one complete end-to-end flow)
    - Tasks should deliver the **recommended SLC**, not all specs

    After writing, show this summary:

    ---
    ✅ **Plan generated!**

    **SLC Release:** [Name] - [Value proposition]

    **Activities:** [Activity 1] → [Activity 2] → ...

    Created \`IMPLEMENTATION_PLAN.md\` with [N] tasks in [M] phases.

    **Next:** Review the SLC recommendation, then run \`ralph work\` to start building.
    ---
  `).trim();
}

/**
 * Generates the plan command prompt (for ralph plan).
 * Single-stage version with SLC release planning.
 *
 * Based on: https://github.com/ClaytonFarr/ralph-playbook
 */
export function renderPlanCommandPrompt(): string {
  return dedent(`
    You are performing **GAP ANALYSIS** and **SLC RELEASE PLANNING**.

    ## PHASE 0: UNDERSTAND WHO WE'RE BUILDING FOR

    **FIRST**, study \`AUDIENCE_JTBD.md\` to understand:
    - Who the primary audience is
    - What jobs-to-be-done (JTBDs) they have
    - What outcomes they're trying to achieve

    This context is ESSENTIAL for recommending the right SLC release.

    ## PHASE 1: ORIENTATION

    1a. **Study** \`AUDIENCE_JTBD.md\` for audience and jobs context
    1b. **Study** \`specs/README.md\` for the activity map index
    1c. **Study** all activity specs in \`specs/\` using **250 parallel Sonnet subagents**
    1d. **Study** \`src/lib/*\` using **250 parallel Sonnet subagents** (shared utilities/patterns - treat as standard library)
    1e. **Study** project files (package.json, Cargo.toml, deno.json, Makefile) for tech stack
    1f. **Study** \`IMPLEMENTATION_PLAN.md\` if present (it may be stale)

    ## PHASE 2: GAP ANALYSIS

    1. Use up to **500 parallel Sonnet subagents** to search existing source code in \`src/*\`
    2. **Compare** specs against actual implementation
    3. Search for: TODOs, minimal implementations, placeholders, skipped tests
    4. **Do NOT assume functionality is missing** - confirm with code search first
    5. Use **Opus** (yourself) to analyze findings

    ## PHASE 3: JOURNEY SEQUENCING & SLC RELEASE RECOMMENDATION

    ### Step 1: Sequence Activities into User Journey

    **FIRST**, sequence the activities from \`specs/*\` into a user journey map:
    - How do activities flow into each other?
    - What dependencies exist between activities?
    - What's the natural order a user would follow?

    Visualize activities as columns (journey backbone) with capability depths as rows.

    ### Step 2: Determine the NEXT SLC Release

    Use **ultrathink** reasoning for complex synthesis decisions.

    An SLC release is a **horizontal slice** through the story map:
    - **Simple** - narrow scope, minimal features
    - **Lovable** - delightful, solves a real problem completely
    - **Complete** - a finished product, not a feature preview

    **Think:** "What's the thinnest slice that delivers real value to the audience?"

    Consider:
    - Which activities are essential for the thinnest useful slice?
    - What capability depth (Basic/Standard/Advanced) for each?
    - What's the MINIMUM that delivers value to the audience's job-to-be-done?

    **Example SLC slices (horizontal cuts through journey):**

    | Release | Activities | Depths | Value |
    |---------|------------|--------|-------|
    | Palette Picker | Upload → Extract → Export | B/B/B | Instant color utility |
    | Mood Board | Upload → Extract → Arrange | B/S/B | Creative composition |
    | Design Studio | All activities | S/S/S | Professional tool |

    ## PHASE 4: WRITE PLAN

    Write \`IMPLEMENTATION_PLAN.md\` scoped to the recommended SLC release.

    ## CRITICAL RULES

    - **Plan only.** Do NOT implement anything.
    - **Do NOT assume functionality is missing** - confirm with code search first
    - **Recommend ONE SLC release** - the thinnest slice that delivers real value
    - **Scope tasks to that SLC** - don't plan all specs
    - Order by **dependency** (foundations first)

    ## TASK SIZING - IMPORTANT

    **DO NOT create micro-tasks.** Each task should be:

    - **Substantial** - worth the cold-start overhead (30min-2hrs of focused work)
    - **One meaningful commit** - a coherent, complete change
    - **Specific** - "Implement Upload Photo at Basic depth" not "Add upload"
    - **Measurable** - clear success criteria
    - **Linked** - cite specs and files: \`[spec: upload-photo.md] [file: src/features/upload/]\`

    **Anti-patterns to AVOID:**
    - Splitting related work into separate tasks
    - Creating tasks for trivial changes
    - Tasks that are just checkboxes without substance
    - Building beyond the SLC scope

    ## OUTPUT FORMAT

    Write to \`IMPLEMENTATION_PLAN.md\` using this structure:

    \`\`\`markdown
    # Implementation Plan

    ## Recommended SLC Release: [Name]

    **Audience:** [Primary audience from AUDIENCE_JTBD.md]

    **Value proposition:** [What problem does this slice solve completely?]

    **Activities included:**

    | Activity | Depth | Why Included |
    |----------|-------|--------------|
    | [Activity 1] | Basic | [Essential for core job] |
    | [Activity 2] | Basic | [Completes the flow] |

    **What's NOT in this slice:** [Activities/depths deferred to later releases]

    ---
    <!-- HUMAN VERIFICATION: Does this slice form a coherent, valuable product? -->

    ## Phase 1: [Foundation] - CRITICAL
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT: Verify Phase 1 complete before proceeding -->

    ## Phase 2: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]

    ---
    <!-- CHECKPOINT -->

    ## Phase 3: [Activity: Name]
    - [ ] Substantial task [spec: X] [file: Y]

    ---

    ## Future Work (Outside Current Scope)
    - [Discovery 1] - noted during analysis, deferred to future release
    - [Discovery 2] - not in current SLC slice
    \`\`\`

    **Guidelines:**
    - **3-7 tasks per phase** is typical (not 10+)
    - Add **CHECKPOINT** comments between phases
    - First phase = **vertical slice** (one complete end-to-end flow)
    - Tasks should deliver the **recommended SLC**, not all specs
    - **Note discoveries outside scope** as future work (don't lose insights)

    ## COMPLETION MESSAGE

    After writing IMPLEMENTATION_PLAN.md, display:

    ---

    ✅ **Plan generated!**

    **SLC Release:** [Name] - [Value proposition]

    **Activities:** [Activity 1] → [Activity 2] → ...

    Created \`IMPLEMENTATION_PLAN.md\` with [N] tasks in [M] phases.

    **Next steps:**
    1. Review the SLC recommendation - does this slice make sense?
    2. Run \`ralph work\` to start the autonomous build loop

    The plan is disposable - regenerate with \`ralph plan\` if needed.

    ---

    Start now. Read AUDIENCE_JTBD.md first, then specs/README.md, then analyze the codebase.
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
 * Key principle: Specs are ACTIVITY-BASED (verbs), not topic-based (nouns)
 * Activities describe what users DO to accomplish their jobs.
 * Enhanced: Deep requirements gathering (30+ minutes, 20-40 questions)
 */
export function renderStartPrompt(): string {
  return dedent(`
    # Activity Spec Interview

    You are conducting a spec interview to define the **activities** (features) for a project.
    This is a **deep requirements gathering session** - expect 20-40 questions over 30+ minutes.

    ---

    ## Phase 0: Study Audience Context

    **FIRST**, read \`AUDIENCE_JTBD.md\` if it exists to understand:
    - Who the primary audience is
    - What jobs-to-be-done (JTBDs) they have
    - What activities have already been identified

    If AUDIENCE_JTBD.md exists, your specs should map to those JTBDs.
    If it doesn't exist, you'll need to discover audience context through the interview.

    ---

    ## Core Principle: Activity-Based Specs

    **Specs are ACTIVITIES (verbs), not topics (nouns).**

    Activities describe what users DO to accomplish their jobs:
    - ✅ "Upload Photo" - what the user does
    - ✅ "Extract Colors" - what the user does
    - ✅ "Arrange Layout" - what the user does
    - ❌ "Photo Management" - a topic/category
    - ❌ "Color System" - a topic/category
    - ❌ "Layout Engine" - an implementation detail

    Activities reveal the user journey and dependencies naturally.

    ---

    ## Spec Rules

    - Be explicit - if it's not written, it won't be implemented
    - **One activity per spec file** (use "one verb" test)
    - Link each activity to a JTBD (why does user do this?)
    - Include capability depths (basic → standard → advanced)
    - Include acceptance criteria, edge cases, and out-of-scope
    - Write for an AI implementer - no ambiguity

    ---

    ## Interview Guidelines

    1. Ask **ONE question at a time**. Wait for responses.
    2. Start by acknowledging what you learned from AUDIENCE_JTBD.md (if it exists)
    3. If no AUDIENCE_JTBD.md, start with: "What are you building and who is it for?"
    4. Be conversational - like a product manager learning about features.
    5. Dig deeper when answers are vague.
    6. Do NOT show menus, numbered options, or lists.
    7. **Take your time** - thorough specs prevent wasted implementation cycles.

    **Question Categories** (cover ALL through natural conversation):

    ### Activities & User Journey
    - What can users DO in the application? (focus on verbs)
    - What's the first thing a user does? Then what?
    - Walk me through a typical user session from start to finish
    - What's the most important action users can take?
    - Are there any actions that depend on others being completed first?

    ### Jobs-to-be-Done Connection
    - Why would a user do this action? What outcome do they want?
    - What job is the user trying to accomplish?
    - What triggers this need?

    ### Capability Depths
    - What's the simplest version of this activity? (basic)
    - What would a fully-featured version include? (standard)
    - What would power users want? (advanced)

    ### Technical Choices
    - Any preferred tech stack, frameworks, or libraries?
    - Any existing code or systems to integrate with?
    - Performance requirements? Scale expectations?
    - Deployment environment? (local, cloud, mobile, etc.)

    ### Edge Cases & Error Handling
    - What happens when things go wrong during this activity?
    - What are the most likely failure modes?
    - How should errors be communicated to users?

    ### Scope Boundaries
    - What's explicitly out of scope for now?
    - What might seem related but shouldn't be included?

    ### Acceptance & Test Requirements
    - What would prove this activity works correctly?
    - How can we automatically verify each acceptance criterion?
    - What observable outcomes should tests check?
    - Are there any quality aspects that are subjective or hard to test automatically?

    ---

    ## Writing the Specs

    After **20-40 exchanges**, when you deeply understand the activities:

    1. Summarize the activities you've identified
    2. Ask "Does this capture the activities you want to build?"
    3. If yes, create spec file(s) in \`specs/\` directory
    4. **Create/update \`specs/README.md\`** as the activity map index

    **Activity Spec format:**

    \`\`\`markdown
    # [Activity Name] (verb phrase, e.g., "Upload Photo")

    ## Overview
    [1-2 sentences: what does the user DO and why?]

    ## Job-to-be-Done
    > When [situation], I want to [this activity], so I can [outcome].

    Links to: [JTBD name from AUDIENCE_JTBD.md, if applicable]

    ## User Experience
    [What does the user see, do, and experience during this activity?]

    ## Capability Depths

    | Level | Description | Included |
    |-------|-------------|----------|
    | Basic | [Simplest viable version] | [features] |
    | Standard | [Full-featured version] | [features] |
    | Advanced | [Power user features] | [features] |

    ## Acceptance Criteria
    [Observable, testable outcomes for Basic level]
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Test Requirements
    [Derived from acceptance criteria - what tests must pass?]
    - [ ] Test that [acceptance criterion 1] works correctly
    - [ ] Test that [acceptance criterion 2] handles edge cases
    - [ ] Test that errors are handled gracefully

    ## Behavior Details
    [Specific behaviors, states, transitions]

    ## Edge Cases
    [What happens when things go wrong]

    ## Dependencies
    [Other activities that must exist first, if any]

    ## Technical Constraints
    [Performance, dependencies, limitations]

    ## Out of Scope
    [What this activity does NOT include]

    ## Subjective Quality (if applicable)
    [For criteria that can't be tested programmatically]
    - [Quality aspect] - Use LLM review with criteria: "[description]"
    \`\`\`

    Name files as verbs: \`specs/upload-photo.md\`, \`specs/extract-colors.md\`, \`specs/arrange-layout.md\`

    **IMPORTANT: Create \`specs/README.md\`** as the activity map:

    \`\`\`markdown
    # Specifications Index - Activity Map

    ## User Journey

    Activities in typical user flow order:

    \`\`\`
    [ACTIVITY 1] → [ACTIVITY 2] → [ACTIVITY 3] → [ACTIVITY 4]
    \`\`\`

    ## Activity Specs

    | Activity | JTBD | Description | Depths |
    |----------|------|-------------|--------|
    | [upload-photo.md](upload-photo.md) | Extract colors | User uploads an image | B/S/A |
    | [extract-colors.md](extract-colors.md) | Extract colors | System extracts palette | B/S/A |

    ## Capability Depth Legend

    - **B** = Basic (MVP)
    - **S** = Standard (full feature)
    - **A** = Advanced (power user)

    ## Quick Reference

    - **Getting started**: See [upload-photo.md](upload-photo.md)
    - **Core feature**: See [extract-colors.md](extract-colors.md)
    \`\`\`

    This index helps visualize the user journey and find specs faster.

    ---

    ## Completion Steps

    After creating all spec files AND specs/README.md, do these steps IN ORDER:

    1. Display this completion message (replace filenames with actual ones):

    ---
    ✅ **Activity specs created!**

    I've created the following activity specifications:
    - \`specs/README.md\` (activity map index)
    - \`specs/[activity1].md\`
    - \`specs/[activity2].md\`

    **Activity flow:** [activity1] → [activity2] → ...

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
    - Read \`AUDIENCE_JTBD.md\` to understand context
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

    **Start now.** Read AUDIENCE_JTBD.md if it exists, then begin the interview.
  `).trim();
}

/**
 * Generates the spec interview prompt.
 * This guides Claude to interview the user about a new activity (feature).
 * Uses activity-based (verb) framing, not topic-based (noun).
 */
export function renderSpecInterviewPrompt(featureHint?: string): string {
  const intro = featureHint
    ? `The user wants to add a new activity: "${featureHint}"`
    : 'The user wants to add a new activity (feature).';

  return dedent(`
    # Activity Spec Interview Mode

    ${intro}

    ---

    ## Core Principle: Activity-Based Specs

    **Specs are ACTIVITIES (verbs), not topics (nouns).**

    Activities describe what users DO:
    - ✅ "Upload Photo" - what the user does
    - ✅ "Export Data" - what the user does
    - ❌ "Photo Management" - a topic/category
    - ❌ "Export System" - an implementation detail

    ---

    ## Spec Rules

    - Be explicit - if it's not written, it won't be implemented
    - **One activity per spec file** (use "one verb" test)
    - Link the activity to a JTBD (why does user do this?)
    - Include capability depths (basic → standard → advanced)
    - Include acceptance criteria, edge cases, and out-of-scope
    - Write for an AI implementer - no ambiguity

    ---

    ## Phase 0: Read Existing Context

    BEFORE asking any questions, read:

    1. \`AUDIENCE_JTBD.md\` - to understand who we're building for and their jobs
    2. All specs in \`specs/\` directory - to understand what activities exist

    This tells you:
    - Which JTBDs the new activity might serve
    - What activities already exist (don't duplicate)
    - The project's domain and terminology
    - Whether to UPDATE an existing spec or CREATE a new one

    **Decision rule:**
    - If the new activity extends an existing one → UPDATE that spec (add depth)
    - If the new activity is genuinely distinct → CREATE a new spec file

    ---

    ## Phase 1: Interview

    Ask questions **ONE AT A TIME**. Wait for the user's response before continuing.

    Cover these areas through natural conversation:

    1. **Activity & JTBD** - What does the user DO? What job does this help accomplish?
    2. **User perspective** - Who does this? What triggers this action? What do they see?
    3. **Capability depths** - What's the basic version? Standard? Advanced?
    4. **Behavior** - How should it work? What are the inputs/outputs/states?
    5. **Dependencies** - What other activities must exist first?
    6. **Acceptance criteria** - How do we know it's done? What's testable?
    7. **Test requirements** - How can we verify each criterion? What should tests check?
    8. **Edge cases** - What happens when things go wrong?
    9. **Scope boundaries** - What's explicitly NOT included?
    10. **Subjective quality** - Are there quality aspects that are hard to test automatically?

    Be conversational. Dig deeper when answers are vague. 4-8 questions is usually enough.

    ---

    ## Phase 2: Write the Spec

    After gathering enough information:

    1. Summarize the activity you've defined
    2. Ask "Does this capture the activity you want? Should I save it?"
    3. If yes, write to \`specs/\` - either UPDATE existing or CREATE new
    4. **Update \`specs/README.md\`** to include the activity in the map
    5. Show the completion message
    6. Say goodbye and END

    **Activity Spec format:**

    \`\`\`markdown
    # [Activity Name] (verb phrase, e.g., "Export Data")

    ## Overview
    [1-2 sentences: what does the user DO and why?]

    ## Job-to-be-Done
    > When [situation], I want to [this activity], so I can [outcome].

    Links to: [JTBD name from AUDIENCE_JTBD.md, if applicable]

    ## User Experience
    [What does the user see, do, and experience during this activity?]

    ## Capability Depths

    | Level | Description | Included |
    |-------|-------------|----------|
    | Basic | [Simplest viable version] | [features] |
    | Standard | [Full-featured version] | [features] |
    | Advanced | [Power user features] | [features] |

    ## Acceptance Criteria
    [Observable, testable outcomes for Basic level]
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Test Requirements
    [Derived from acceptance criteria - what tests must pass?]
    - [ ] Test that [acceptance criterion 1] works correctly
    - [ ] Test that [acceptance criterion 2] handles edge cases
    - [ ] Test that errors are handled gracefully

    ## Behavior Details
    [Specific behaviors, states, transitions]

    ## Edge Cases
    [What happens when things go wrong]

    ## Dependencies
    [Other activities that must exist first, if any]

    ## Technical Constraints
    [Performance requirements, dependencies, limitations]

    ## Out of Scope
    [What this activity does NOT include]

    ## Subjective Quality (if applicable)
    [For criteria that can't be tested programmatically]
    - [Quality aspect] - Use LLM review with criteria: "[description]"
    \`\`\`

    Name files as verbs: \`specs/export-data.md\`, \`specs/filter-results.md\`

    **IMPORTANT: Update \`specs/README.md\`** to add the activity to the map:

    \`\`\`markdown
    | Activity | JTBD | Description | Depths |
    |----------|------|-------------|--------|
    | [export-data.md](export-data.md) | Share results | User exports data to file | B/S/A |
    \`\`\`

    ---

    ## Completion Steps

    After saving the spec AND updating specs/README.md, do these steps IN ORDER:

    1. Display this completion message (replace filename with actual one):

    ---
    ✅ **Activity spec saved!** [Created/Updated] \`specs/[activity].md\`

    Updated \`specs/README.md\` activity map.

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
    - Read \`AUDIENCE_JTBD.md\` to understand context
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

    **Start now.** Read AUDIENCE_JTBD.md and existing specs, then ask your first question.
  `).trim();
}

/**
 * Generates the audience/JTBD interview prompt.
 * This guides Claude to interview the user about WHO they're building for
 * and WHAT outcomes (jobs) users want.
 *
 * Based on: https://github.com/ghuntley/how-to-ralph-wiggum
 * Key principle: Planning starts by studying audience context.
 */
export function renderAudiencePrompt(): string {
  return dedent(`
    # Audience & Jobs-to-be-Done Interview

    You are conducting an interview to understand WHO we're building for and WHAT outcomes they want.
    This understanding will guide all feature decisions and release planning.

    ---

    ## Why This Matters

    - Every activity we build must map back to a user job
    - Understanding audience helps prioritize what to build first
    - Jobs-to-be-Done (JTBD) reveal outcomes, not just features
    - Cardinality: One audience → many JTBDs → many activities

    ---

    ## Interview Guidelines

    1. Ask **ONE question at a time**. Wait for responses.
    2. Be conversational - like a product manager learning about users.
    3. Dig deeper when answers are vague.
    4. Do NOT show menus, numbered options, or lists of choices.

    ---

    ## Part 1: Audience Discovery

    Understand WHO will use this product:

    - Who is the primary user? What's their role or situation?
    - What's their technical level? (developer, business user, etc.)
    - What's their context? (at work, at home, on mobile, etc.)
    - Are there secondary users with different needs?
    - What tools/workflows do they currently use?
    - What frustrations do they have with current solutions?

    ---

    ## Part 2: Jobs-to-be-Done Discovery

    Understand WHAT outcomes users want (focus on the "job", not features):

    **Format: "When [situation], I want to [motivation], so I can [outcome]."**

    For each job, explore:
    - What triggers them to need this? (the situation)
    - What are they trying to accomplish? (the motivation)
    - What does success look like? (the outcome)
    - What do they do today to accomplish this?
    - What's painful about the current approach?

    **Example JTBDs:**
    - "When I find an inspiring image, I want to extract its color palette, so I can use those colors in my design."
    - "When I'm starting a new project, I want to quickly scaffold the structure, so I can focus on the actual code."

    ---

    ## Part 3: Activities Mapping

    For each JTBD, identify the **activities** (verbs) users will do:

    Activities are things users DO to accomplish their jobs:
    - Upload, Select, Extract, Arrange, Export, Share, etc.
    - Use verbs, not nouns: "upload photo" not "photo uploader"
    - Activities reveal the user journey flow

    ---

    ## Writing AUDIENCE_JTBD.md

    After **10-20 exchanges**, when you understand the audience deeply:

    1. Summarize what you learned
    2. Ask "Does this capture your users and their needs?"
    3. If yes, write to \`AUDIENCE_JTBD.md\`

    **File format:**

    \`\`\`markdown
    # Audience & Jobs-to-be-Done

    ## Primary Audience

    **Who:** [Description of primary user]

    **Context:** [When/where/how they use this]

    **Technical level:** [Developer/Designer/Business user/etc.]

    **Current tools:** [What they use today]

    **Frustrations:** [Pain points with current solutions]

    ## Secondary Audiences (if any)

    [Brief descriptions of other user types]

    ---

    ## Jobs-to-be-Done

    ### JTBD 1: [Short name]

    > When [situation], I want to [motivation], so I can [outcome].

    **Trigger:** [What prompts this need]
    **Current approach:** [How they do it today]
    **Pain points:** [What's frustrating]

    **Activities:**
    - [Activity 1] - [brief description]
    - [Activity 2] - [brief description]

    ### JTBD 2: [Short name]

    > When [situation], I want to [motivation], so I can [outcome].

    **Trigger:** [What prompts this need]
    **Current approach:** [How they do it today]
    **Pain points:** [What's frustrating]

    **Activities:**
    - [Activity 1] - [brief description]
    - [Activity 2] - [brief description]

    ---

    ## Activity Map

    | Activity | JTBD | Description |
    |----------|------|-------------|
    | [verb] | JTBD 1, 2 | [what user does] |

    ---

    ## Capability Depths

    For each activity, there are levels of sophistication:

    | Activity | Basic | Standard | Advanced |
    |----------|-------|----------|----------|
    | Upload | Single file | Multiple files | Drag & drop, URL import |
    | Extract | Auto-detect | Manual selection | AI-assisted |

    _Basic = MVP, Standard = complete feature, Advanced = power user_
    \`\`\`

    ---

    ## Completion Steps

    After writing AUDIENCE_JTBD.md, do these steps IN ORDER:

    1. Display this completion message:

    ---
    ✅ **Audience & JTBDs documented!**

    Created \`AUDIENCE_JTBD.md\` with:
    - Primary audience profile
    - [N] Jobs-to-be-Done
    - [M] Activities mapped

    **Next steps:**
    1. Review AUDIENCE_JTBD.md - refine if needed
    2. Run \`ralph start\` to create feature specs (activities)
    3. The specs will reference these JTBDs

    ${RALPH_EXIT_SIGNAL}
    ---

    2. Create a marker file to signal completion:
       \`\`\`bash
       touch ${RALPH_DONE_MARKER}
       \`\`\`

    3. STOP. Do not continue. Your work is done.

    ---

    ## Absolute Restrictions

    You CAN:
    - Ask interview questions
    - Write AUDIENCE_JTBD.md

    You CANNOT:
    - Read source code
    - Implement any code
    - Write spec files (that comes later in \`ralph start\`)
    - Continue after creating the marker file

    ---

    **Start now.** Ask: "Who is the primary user of what you're building?"
  `).trim();
}

/**
 * Generates the initial AUDIENCE_JTBD.md content.
 * This is the empty template created during ralph init.
 */
export function renderInitialAudienceJtbd(): string {
  return dedent(`
    # Audience & Jobs-to-be-Done

    _Run \`ralph audience\` or \`ralph start\` to discover your audience and their jobs._

    ## Primary Audience

    **Who:** (To be discovered)

    **Context:** (To be discovered)

    ---

    ## Jobs-to-be-Done

    (Jobs will be documented through audience interview)

    ---

    ## Activity Map

    | Activity | JTBD | Description |
    |----------|------|-------------|
    | (TBD) | (TBD) | (TBD) |
  `).trim();
}

/**
 * Generates the PROMPT_research.md content.
 * This guides Claude to research APIs, find inspiration, and validate before planning.
 */
export function renderResearchPrompt(): string {
  return dedent(`
    # Research Mode - Discovery & Validation

    You are performing **RESEARCH & DISCOVERY** before planning.

    **Goal:** Gather inspiration, validate APIs, and document sources so implementation has reference material.

    **Output:** \`research/\` folder with structured documentation and source URLs.

    ---

    ## Pre-Requisites

    Before researching, you should have:
    - \`AUDIENCE_JTBD.md\` populated (know WHO you're building for)
    - \`specs/\` folder with activity specs (know WHAT you're building)

    If these don't exist, run \`ralph audience\` and \`ralph start\` first.

    ---

    ## Model Strategy

    - Use **parallel Sonnet subagents** for web search, GitHub search, and API testing
    - Use **Opus** (yourself) for synthesis and readiness assessment
    - Run searches **in parallel** to maximize efficiency

    ---

    ## Phase R1: Competitive & Inspiration Research (Enhanced)

    **Run parallel Sonnet agents** to search. Always prioritize **2025/2026 technology** - add year to searches.

    ### 1. Similar Products - Tech Stack Analysis
    Search for apps solving similar problems:
    - "[problem domain] app 2025"
    - "[feature] tool 2026"
    - "best [category] apps"

    **For each product/repo found, document:**
    - **Tech Stack**: What language? What framework? What database? What hosting?
    - **AI/ML Components**: What models? Open source or proprietary?
    - **Key Libraries**: What dependencies solve the hard problems?
    - **Architecture Patterns**: Monolith? Microservices? Serverless? Edge? Mobile?

    ### 2. GitHub Repositories
    Search for reference implementations:
    - "[feature] site:github.com 2025"
    - "[tech stack] [feature] example"
    - Open source projects with similar functionality

    **Document:** Key files to study, tech stack used, why it's useful, which activity it's relevant for.

    ### 3. Technical Articles & Tutorials
    Search for implementation guidance:
    - "How to implement [feature] 2025"
    - "[tech stack] [feature] tutorial"

    **Document:** Key insights, code patterns, gotchas to avoid.

    **Output:** Write findings to \`research/inspiration.md\` with tech stack breakdown for each reference.

    ---

    ## Phase R2: API Discovery & Documentation (Enhanced)

    **Run parallel Sonnet agents** to find API documentation. Compare multiple options!

    ### For Each External Service Needed:

    1. **Find official docs** - Search for official API documentation
    2. **Check for llms.txt** - Try \`https://[service].com/llms.txt\`
    3. **Find authentication method** - API key, OAuth, etc.
    4. **Compare multiple API options** - Don't just use the first result!

    **For each API, document:**
    - **Pricing tiers** - What's free? What scales? Cost per 1K requests?
    - **Rate limits** - Will it work at our scale? Burst limits?
    - **SDK quality** - Has SDK for our language? Good docs? Active maintenance?
    - **Reliability** - Uptime SLA? Status page?

    **Output:** Create \`research/apis/[service-name].md\` for each service:
    \`\`\`markdown
    # [Service Name] API

    ## Overview
    [What this API does]

    ## Alternatives Considered
    | Service | Pros | Cons | Pricing | Our Pick? |
    |---------|------|------|---------|-----------|
    | [API 1] | ... | ... | ... | ... |
    | [API 2] | ... | ... | ... | ... |

    ## Chosen API: [Name]
    **Why:** [reasoning]

    ## Authentication
    [method, setup instructions]

    ## Pricing
    - Free tier: [limits]
    - Paid: [pricing model]
    - Rate limits: [requests/sec, daily limits]

    ## Endpoints
    [curl examples with responses]

    ## SDK/Library
    - Package: [package name for our language/ecosystem]
    - Language support: [list supported languages]
    - Docs quality: [rating]

    ## Sources
    - [URL 1]
    - [URL 2]
    \`\`\`

    ---

    ## Phase R3: API Validation (Hands-On Testing)

    **Actually test the APIs** - don't just document:

    1. **Run curl commands** to verify endpoints work
    2. **Check credentials** - Do we have API keys? Are they in environment?
    3. **Test happy path** - Does the basic request work?
    4. **Test error cases** - What happens on invalid input?

    Use the Bash tool to run curl commands and verify responses.

    **Output:** Write results to \`research/api-validation.md\`

    ---

    ## Phase R4: Technical Approach Research (Enhanced)

    **Run parallel Sonnet agents** to research implementation approaches. Be SPECIFIC about algorithms and libraries.

    ### For Each Feature Requiring Algorithms/Complex Logic:

    1. **Search for patterns** - "How to implement [feature] in [tech stack] 2025"
    2. **Name the algorithm** - e.g., "Levenshtein distance", "BM25 search", "cosine similarity"
    3. **Find the best library** - Compare packages for our language/ecosystem
    4. **If AI needed** - Compare options: cloud APIs vs local models (Ollama, vLLM, etc.)

    **Output:** Create \`research/approaches/[feature-name].md\` for each:

    \`\`\`markdown
    ## [Feature Name]

    ### Problem
    [What we need to solve]

    ### Algorithm/Approach
    - **Name:** [algorithm name, e.g., "TF-IDF with BM25 ranking"]
    - **Why:** [why this approach fits our use case]
    - **Complexity:** [O(n), space requirements]

    ### Library Options (2025/2026)
    | Library | Stars | Last Update | Language Support | Size/Deps | Recommendation |
    |---------|-------|-------------|------------------|-----------|----------------|
    | lib-a   | 5k    | 2025-01     | [languages]      | light     | Best for X     |
    | lib-b   | 2k    | 2024-06     | [languages]      | heavy     | Too complex    |

    ### AI Model Options (if applicable)
    | Model | Open Source? | Cost | Quality | Latency | Our Pick |
    |-------|--------------|------|---------|---------|----------|
    | GPT-4 | No           | $$   | High    | 1-2s    | ...      |
    | Llama 3 | Yes        | Free | Good    | 500ms   | ...      |
    | Claude | No          | $$   | High    | 1s      | ...      |

    ### Decision for Our Project
    **Recommended:** [library/approach name]
    **Reasoning:** [why this is best for our specific project - consider cost, complexity, team skills]

    ### Implementation Notes
    [Key code patterns, gotchas, setup steps]

    ### Sources
    - [URL 1]
    - [URL 2]
    \`\`\`

    ---

    ## Phase R5: Readiness Assessment

    **Final check before planning:**

    1. **All critical APIs documented?** - Check \`research/apis/\`
    2. **All APIs tested?** - Check \`research/api-validation.md\`
    3. **Technical approaches identified?** - Check \`research/approaches/\`
    4. **Inspiration gathered?** - Check \`research/inspiration.md\`

    **Output:** Write to \`research/readiness.md\`

    \`\`\`markdown
    # Build Readiness Assessment

    ## Ready to Build
    | Component | Status | Reference |
    |-----------|--------|-----------|
    | [Feature 1] | Ready | \`research/approaches/x.md\` |

    ## Risks
    | Risk | Mitigation |
    |------|------------|
    | [risk] | [mitigation] |

    ## Blockers
    | Blocker | Action Required |
    |---------|-----------------|
    | [blocker] | [action] |

    ## Decision: Ready to Plan?
    - [ ] All critical APIs verified working
    - [ ] All required credentials available
    - [ ] Technical approaches identified
    - [ ] No unresolved blockers

    **Verdict:** READY / BLOCKED
    \`\`\`

    ---

    ## Critical Rules

    - **Research only.** Do NOT implement anything.
    - **Document sources.** Every finding needs a URL.
    - **Test, don't assume.** Run actual curl commands.
    - **Be thorough.** Better to over-research than under-research.
    - **Persist knowledge.** Everything goes in \`research/\` folder.

    ---

    ## Output Structure

    After research is complete, you should have:

    \`\`\`
    research/
    ├── inspiration.md              # Similar products, GitHub repos, articles
    ├── api-validation.md           # Test results for all APIs
    ├── readiness.md                # Final readiness assessment
    ├── apis/
    │   └── [service-name].md       # API reference per service
    └── approaches/
        └── [feature-name].md       # Implementation approaches per feature
    \`\`\`

    ---

    ## Completion

    Research is complete when:

    1. \`research/readiness.md\` exists
    2. Readiness verdict is **READY** or blockers are clearly documented
    3. All critical APIs have been tested (not just documented)

    Then proceed to \`ralph plan\` which will reference the \`research/\` folder.

    ---

    **Start now.** Read AUDIENCE_JTBD.md and specs/ first, then begin research.
  `).trim();
}

/**
 * Generates the initial research folder README.
 */
export function renderInitialResearchReadme(): string {
  return dedent(`
    # Research & Discovery

    This folder contains research findings gathered before implementation planning.

    **Generated by:** \`ralph research\`
    **Used by:** \`ralph plan\` and \`ralph work\`

    ---

    ## Folder Structure

    \`\`\`
    research/
    ├── README.md                   # This file
    ├── inspiration.md              # Similar products, GitHub repos, articles
    ├── api-validation.md           # Test results for all APIs
    ├── readiness.md                # Build readiness assessment
    ├── apis/
    │   └── [service-name].md       # API reference per service
    └── approaches/
        └── [feature-name].md       # Implementation patterns per feature
    \`\`\`

    ---

    ## How to Use

    ### During Planning (\`ralph plan\`)

    The planner will:
    1. Check \`readiness.md\` for blockers
    2. Reference \`apis/\` for available endpoints
    3. Reference \`approaches/\` for implementation patterns
    4. Link relevant docs to each task

    ### During Implementation (\`ralph work\`)

    When working on a task:
    1. Check the task's **Research:** link
    2. Review the referenced document for patterns and examples
    3. Use **Sources** section for external references if stuck

    ---

    ## Sources

    Every document should end with a **Sources** section listing URLs.
  `).trim();
}
