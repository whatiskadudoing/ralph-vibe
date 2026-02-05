# Task-Scoped SLC Concept

## Overview

Each work iteration becomes a mini SLC (Spec-Learn-Create) cycle for ONE task from IMPLEMENTATION_PLAN.md, using Claude Code's Tasks system as an internal coordination and safeguard mechanism.

## Architecture

### Outer Loop (Ralph CLI - Serial)
```
while (hasMoreTasks) {
  task = pickNextTaskFromPlan()
  runTaskSLC(task)  // Mini SLC cycle
  commit()
}
```

### Inner Loop (Task SLC - Structured)
```
function runTaskSLC(task) {
  // SPEC: Break down the work
  subTasks = createTaskBreakdown(task)

  // LEARN: Research and read
  context = gatherContext(subTasks)

  // CREATE: Implement with coordination
  execute(subTasks, context)

  // SAFEGUARD: Verify completion
  verify(allSubTasksComplete())
}
```

## Example: "Implement JWT Authentication"

### Current Approach (One Big Task)
```
Iteration 1: Read spec → Write all auth code → Test → Commit (maybe 20min)
- Risk: Might skip edge cases
- Risk: Might forget to test middleware
- Risk: No clear progress tracking
```

### Task-Scoped SLC Approach

```
Iteration 1: JWT Authentication (Task SLC)

┌─ SPEC Phase ──────────────────────────────────────┐
│ TaskCreate(subject: "Read auth spec & existing code")
│ TaskCreate(subject: "Create JWT utility functions")
│ TaskCreate(subject: "Add auth middleware")
│ TaskCreate(subject: "Create auth routes")
│ TaskCreate(subject: "Write unit tests")
│ TaskCreate(subject: "Write integration tests")
│ TaskCreate(subject: "Update documentation")
│
│ Dependencies:
│ - "middleware" blockedBy "utilities"
│ - "routes" blockedBy "middleware"
│ - "unit tests" blockedBy "utilities"
│ - "integration tests" blockedBy "routes"
└───────────────────────────────────────────────────┘

┌─ LEARN Phase ─────────────────────────────────────┐
│ Task(subagent: Explore, "Find JWT best practices")
│ Task(subagent: Explore, "Read existing auth patterns")
│ Task(subagent: Explore, "Check security requirements")
│
│ Parallel execution → aggregate findings
└───────────────────────────────────────────────────┘

┌─ CREATE Phase ────────────────────────────────────┐
│ TaskUpdate(taskId: "utilities", status: "in_progress")
│ → Implement JWT utils
│ TaskUpdate(taskId: "utilities", status: "completed")
│
│ TaskUpdate(taskId: "middleware", status: "in_progress")
│ → Implement middleware (now unblocked)
│ TaskUpdate(taskId: "middleware", status: "completed")
│
│ ... continue through dependency chain
└───────────────────────────────────────────────────┘

┌─ SAFEGUARD Phase ─────────────────────────────────┐
│ TaskList → Check all tasks completed
│ Run tests → All pass?
│ Run linter → Clean?
│ Types check → No errors?
│
│ ✅ ALL CLEAR → Mark parent task [x] in plan
│ ❌ FAILURES → Fix and retry (don't exit iteration)
└───────────────────────────────────────────────────┘

Commit: "feat: implement JWT authentication"
```

## Benefits

### 1. Completeness Guarantee
- Can't exit iteration until TaskList shows all completed
- No "90% done" commits
- Clear progress visibility

### 2. Better Organization
- Complex tasks broken into manageable chunks
- Dependencies explicit, not implicit
- Parallel opportunities identified

### 3. Natural Safeguards
```typescript
// Before allowing commit:
const taskList = await getTaskList()
const incomplete = taskList.filter(t => t.status !== 'completed')

if (incomplete.length > 0) {
  console.log(`⚠️  Cannot commit - ${incomplete.length} sub-tasks incomplete:`)
  incomplete.forEach(t => console.log(`  - ${t.subject}`))
  return { continueIteration: true }
}
```

### 4. Maintains Ralph Philosophy
- Still one parent task per iteration (serial)
- Fresh context each iteration
- Simple outer loop
- Structured inner loop

### 5. Leverages 2026 Best Practices
- Task dependencies (blockedBy)
- Parallel exploration agents
- Native coordination via Tasks
- Verification gates

## Template Changes Required

### 1. Build Prompt Enhancement
```markdown
# Build Mode - Task SLC

You will complete ONE task from IMPLEMENTATION_PLAN.md using the SLC process.

## SPEC Phase: Task Breakdown

1. Read the assigned task from IMPLEMENTATION_PLAN.md
2. Break it into sub-tasks using TaskCreate:
   - Each sub-task is a concrete, testable unit
   - Express dependencies using addBlockedBy
   - Identify parallel opportunities

Example for "Implement user authentication":
- TaskCreate(subject: "Read auth spec", activeForm: "Reading spec")
- TaskCreate(subject: "Create JWT utils", addBlockedBy: ["Read auth spec"])
- TaskCreate(subject: "Add middleware", addBlockedBy: ["Create JWT utils"])
- TaskCreate(subject: "Write tests", addBlockedBy: ["Add middleware"])

## LEARN Phase: Gather Context

Use parallel Explore agents to gather information:
- Task(subagent: "Explore", prompt: "Find auth best practices")
- Task(subagent: "Explore", prompt: "Read existing code patterns")
- Task(subagent: "Explore", prompt: "Check API docs")

Wait for all agents, synthesize findings.

## CREATE Phase: Implementation

Execute sub-tasks in dependency order:
1. TaskList → Find tasks with no blockedBy
2. TaskUpdate(taskId: X, status: "in_progress")
3. Implement the sub-task
4. TaskUpdate(taskId: X, status: "completed")
5. Repeat until all sub-tasks complete

For independent sub-tasks, you may spawn parallel builder agents.

## SAFEGUARD Phase: Verification

Before marking parent task complete:

1. ✅ TaskList shows ALL sub-tasks completed
2. ✅ All tests pass: `deno test`
3. ✅ Types resolve: `deno check`
4. ✅ Linter clean: `deno lint`
5. ✅ No TODOs or placeholders

If ANY fail:
- Identify which sub-task needs fixing
- TaskUpdate that task back to "in_progress"
- Fix and re-verify

When ALL safeguards pass:
- Mark parent task [x] in IMPLEMENTATION_PLAN.md
- Commit with descriptive message
- EXIT iteration

## Critical Rules

- You MUST create sub-tasks for any non-trivial work
- You CANNOT exit until TaskList shows all completed
- You CANNOT skip the verification phase
- One parent task per iteration (serial outer loop)
```

### 2. Task Breakdown Template Function
```typescript
export function renderTaskBreakdownGuidance(): string {
  return dedent(`
    ## Task Breakdown Guidelines (SPEC Phase)

    Break the parent task into 4-8 sub-tasks:

    ### Reading/Analysis (usually parallel-safe)
    - Read specifications
    - Explore existing code
    - Understand requirements

    ### Implementation (dependency-ordered)
    - Core utilities (foundation)
    - Main functionality (depends on utilities)
    - Integration (depends on main)

    ### Verification (depends on implementation)
    - Unit tests
    - Integration tests
    - Documentation

    ### Express Dependencies
    TaskCreate(subject: "Foundation", ...)
    TaskCreate(subject: "Main feature", addBlockedBy: ["Foundation"])
    TaskCreate(subject: "Tests", addBlockedBy: ["Main feature"])
  `);
}
```

### 3. Safeguard Verification
```typescript
export function renderSafeguardChecks(): string {
  return dedent(`
    ## Safeguard Verification Protocol

    Run these checks in order:

    1. Task Completion Check
       \`\`\`
       TaskList
       → All tasks show status: "completed"?
       → NO? Fix incomplete tasks before proceeding
       \`\`\`

    2. Test Verification
       \`\`\`bash
       deno test
       → Exit code 0?
       → NO? Which sub-task needs fixing? Update that task to in_progress and fix
       \`\`\`

    3. Type Verification
       \`\`\`bash
       deno check src/**/*.ts
       → No errors?
       → NO? Fix types, mark relevant sub-task in_progress
       \`\`\`

    4. Linter Verification
       \`\`\`bash
       deno lint
       → Clean?
       → NO? Fix issues
       \`\`\`

    5. Completeness Check
       - No TODO comments
       - No placeholder code
       - All acceptance criteria met

    Only when ALL checks pass:
    → Mark parent task [x] in IMPLEMENTATION_PLAN.md
    → Commit
    → Exit iteration
  `);
}
```

## Implementation Strategy

### Phase 1: Template Updates
- Add SLC structure to build prompt
- Add task breakdown guidance
- Add safeguard verification

### Phase 2: Work Loop Enhancement
```typescript
// In work.ts
async function runTaskSLCIteration(parentTask: Task) {
  // SPEC: Create sub-tasks
  const subTasks = await createTaskBreakdown(parentTask)

  // LEARN: Gather context
  const context = await gatherContextParallel(subTasks)

  // CREATE: Execute with coordination
  await executeWithTasks(subTasks, context)

  // SAFEGUARD: Verify all complete
  const allComplete = await verifyCompletion(subTasks)

  if (!allComplete) {
    throw new Error('Sub-tasks incomplete - iteration must continue')
  }

  // Mark parent task complete
  await markTaskComplete(parentTask)
}
```

### Phase 3: Safeguard Gates
```typescript
async function verifyCompletion(subTasks: Task[]): Promise<boolean> {
  // Check 1: All tasks completed
  const taskList = await getTaskList()
  const incomplete = taskList.filter(t => t.status !== 'completed')

  if (incomplete.length > 0) {
    console.log(`⚠️  ${incomplete.length} sub-tasks incomplete`)
    return false
  }

  // Check 2: Tests pass
  const testResult = await runCommand('deno test')
  if (!testResult.success) {
    console.log('⚠️  Tests failed')
    return false
  }

  // Check 3: Types
  const typeResult = await runCommand('deno check src/**/*.ts')
  if (!typeResult.success) {
    console.log('⚠️  Type errors')
    return false
  }

  // Check 4: Linter
  const lintResult = await runCommand('deno lint')
  if (!lintResult.success) {
    console.log('⚠️  Lint errors')
    return false
  }

  return true
}
```

## Comparison

| Aspect | Current | Task-Scoped SLC |
|--------|---------|-----------------|
| Structure | Unstructured iteration | SPEC→LEARN→CREATE→SAFEGUARD |
| Sub-tasks | Implicit in Claude's head | Explicit via TaskCreate |
| Completeness | Trust Claude | TaskList verification |
| Dependencies | None | addBlockedBy relationships |
| Verification | Single pass | Multi-gate safeguards |
| Debugging | Check git diff | Check TaskList for progress |
| Serial execution | ✅ Maintained | ✅ Maintained |
| Simplicity | ✅ Simple | ✅ Still simple (structured) |

## User Experience

```bash
$ ralph work

🚀 Iteration 1: Implement JWT authentication

📋 SPEC Phase
  Creating task breakdown...
  ✅ Created 6 sub-tasks with dependencies

🔍 LEARN Phase
  Spawning 3 parallel exploration agents...
  ✅ Gathered context from specs and existing code

⚙️  CREATE Phase
  [1/6] ✅ Read auth spec (30s)
  [2/6] ⚙️  Create JWT utils... (45s)
  [3/6] ⚙️  Add middleware... (60s)
  [4/6] ⚙️  Create routes... (50s)
  [5/6] ⚙️  Write unit tests... (40s)
  [6/6] ⚙️  Write integration tests... (35s)

🛡️  SAFEGUARD Phase
  ✅ All 6 sub-tasks completed
  ✅ Tests pass (127 passed)
  ✅ Types resolve
  ✅ Linter clean

✅ Iteration complete!
  Marked [x] in IMPLEMENTATION_PLAN.md
  Committed: feat: implement JWT authentication

Next task: Add user registration flow
```

## Questions to Explore

1. Should sub-tasks be ephemeral (per-iteration) or persistent?
2. How to handle iteration that needs multiple CREATE passes?
3. What if SAFEGUARD fails - retry CREATE or exit iteration?
4. Should TaskList be shown in the terminal UI?
5. Can we automatically detect task breakdown from the parent task description?
