# Ralph Vibe

> The Ralph technique, without learning the Ralph technique.

Everyone's talking about the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum). It's powerful. It works. But have you tried setting it up?

**Ralph Vibe gives you all the benefits of the Ralph loop - without the homework.**

```bash
ralph init --vibe
# Answer a few questions
# Go for beer
# Come back to working code
```

That's it. No scripts to write. No files to create. No architecture to understand.

---

## The Problem

The original Ralph loop is brilliant, but getting started is a project in itself:

- Write `loop.sh` to orchestrate everything
- Create `PROMPT_build.md` with the right phases
- Create `PROMPT_plan.md` for gap analysis
- Set up `AGENTS.md` with build commands
- Structure your `specs/` directory correctly
- Understand how all the pieces fit together
- Debug when something doesn't work

You spend hours setting up before you write a single line of actual code.

## The Solution

Ralph Vibe handles all of that for you:

| Original Ralph Loop          | Ralph Vibe                    |
| ---------------------------- | ----------------------------- |
| Write shell scripts          | Just run `ralph work`         |
| Create prompt files manually | Auto-generated from interview |
| Understand the architecture  | Just answer questions         |
| Debug your setup             | It just works                 |
| Hours of configuration       | One command                   |

**The Ralph technique without learning the Ralph technique.** All the power, none of the setup. Just vibe.

---

## Quick Start

### New Project

```bash
# Create a folder and run
mkdir my-app && cd my-app
ralph init --vibe

# Answer the interview questions
# Go grab a beer
# Come back to working code
```

### Existing Project

Already have code? Add Ralph Vibe to any project:

```bash
cd my-existing-project
ralph init --vibe

# Tell it about your project
# It reads your code and creates specs
# Then builds what's missing
```

### First Time? Start Small.

Try something simple first to see the magic:

```bash
mkdir test-ralph && cd test-ralph
ralph init --vibe

# When asked, describe something tiny:
# "A CLI that converts Celsius to Fahrenheit"

# Watch it build the entire thing
```

Once you see it work on something small, you'll trust it with the big stuff.

---

## How It Works

You don't need to know this. But if you're curious:

```
ralph init      →  Sets up project files
ralph start     →  Interviews you, creates specs
ralph research  →  Researches APIs, libraries, approaches
ralph plan      →  Analyzes specs, creates task list
ralph work      →  Builds one task at a time until done
```

With `--vibe`, it chains automatically:

```bash
ralph init --vibe   # Does everything: init → start → research → plan → work
ralph spec --vibe   # New feature: spec → research → plan → work
ralph plan --vibe   # Replanning: plan → work
ralph work --vibe   # Full loop: work → (research → plan → work)* → done
```

Without `--vibe`, run each step when you want control.

---

## Commands

### `ralph init`

Start a new Ralph project or add to existing code.

```bash
ralph init              # Interactive setup
ralph init --vibe       # Setup + build everything
```

### `ralph start`

First-time interview. Tell Ralph what you want to build.

```bash
ralph start             # Create specs from interview
ralph start --vibe      # Interview → Plan → Build
```

### `ralph spec`

Add a new feature to your project.

```bash
ralph spec                          # Interview for new feature
ralph spec -f "user authentication" # Skip straight to this feature
ralph spec --vibe                   # Feature → Plan → Build
```

### `ralph research`

Research APIs, libraries, and implementation approaches before planning.

```bash
ralph research          # Research and document findings
ralph research --vibe   # Research → Plan → Build
```

Creates a `research/` folder with:

- `inspiration.md` - Similar products and reference implementations
- `apis/` - API documentation and comparisons
- `approaches/` - Technical approaches for complex features
- `readiness.md` - Are we ready to build?

### `ralph plan`

Create or update the implementation plan.

```bash
ralph plan              # Analyze specs, create tasks
ralph plan --vibe       # Plan → Build
```

### `ralph work`

The autonomous build loop. Where code gets written.

```bash
ralph work                      # Build until done
ralph work --max-iterations 10  # Limit iterations
ralph work --vibe               # Full vibe loop (see below)
```

When all tasks complete successfully, Ralph auto-creates a git tag (e.g., `v0.1.0`) and pushes it.

#### Vibe Loop Mode

With `--vibe`, Ralph doesn't stop after completing the current plan. If there's more work (Future Work in the plan), it automatically loops:

```
work → research → plan → work → research → plan → work → ... → done!
```

Each cycle is called an SLC (Simple, Lovable, Complete) release. Ralph builds one complete slice, then researches and plans the next, until everything is done.

```bash
ralph work --vibe  # Loops through multiple SLC releases automatically
```

The loop stops when:

- All specs are fully implemented (`SLC_COMPLETE: true`)
- Max SLC iterations reached (default: 5, configurable in `.ralph.json`)
- You press Ctrl+C

---

## Why It Works

Ralph Vibe follows principles that make AI coding reliable:

### Fresh Start Every Time

Each build iteration starts with zero memory. No accumulated confusion. No "I thought I already did that." Claude reads the specs fresh, picks a task, builds it, and exits.

### Your Specs Are the Truth

The specs in `specs/` are what gets built. Not vague ideas. Not old comments in code. Clear specifications that Claude follows exactly.

### One Thing at a Time

Each iteration does ONE task. Pick task → implement → test → commit → done. No multitasking. No half-finished features.

### Tests Keep It Honest

Nothing is "done" until tests pass. Claude can't mark a task complete if the tests fail. Built-in quality gates.

### Everything Lives in Files

Specs, plans, build instructions - all in files. When context resets, nothing is lost. Your project state survives every restart.

---

## What Gets Created

After `ralph init`, your project has:

```
your-project/
├── PROMPT_build.md        # Build instructions (auto-generated)
├── PROMPT_plan.md         # Planning instructions (auto-generated)
├── AGENTS.md              # How to build/test your project
├── IMPLEMENTATION_PLAN.md # Task checklist with linkage
├── specs/                 # Your feature specifications
│   ├── README.md          # Specs index (lookup table)
│   └── *.md
├── research/              # Research findings (after ralph research)
│   ├── inspiration.md     # Similar products, references
│   ├── readiness.md       # Build readiness assessment
│   ├── apis/              # API documentation
│   └── approaches/        # Technical approaches
└── .ralph.json            # Ralph config
```

You can edit any of these. Ralph Vibe creates them; you own them.

### The Specs Index

`specs/README.md` is a lookup table that helps Claude find relevant specs faster:

```markdown
| Spec    | Description         | Key Topics                   |
| ------- | ------------------- | ---------------------------- |
| auth.md | User authentication | login, sessions, tokens      |
| api.md  | REST API endpoints  | routes, handlers, validation |
```

### Task Linkage

Tasks in `IMPLEMENTATION_PLAN.md` include linkage to specs and files:

```markdown
- [ ] Add login endpoint [spec: auth.md] [file: src/api/routes.ts]
- [ ] Create session middleware [spec: auth.md] [file: src/middleware/]
```

This helps Claude find relevant context instantly.

### Rich Output and Metrics

During `ralph work`, you'll see real-time metrics and progress:

```
[work] Starting iteration 3 of 10
[work] Task: Add user authentication endpoint

  Input:  12.5K tokens
  Output: 3.2K tokens
  Cache:  8.1K read / 2.3K write (39.2% efficiency)
  Cost:   $0.0847
  Time:   45.3s
  Tools:  Read: 12, Edit: 8, Bash: 5

[work] Task completed successfully
```

With `--vibe`, you'll also see SLC (Simple, Lovable, Complete) progress:

```
[vibe] SLC Cycle 2 of 5
[vibe] Phase: work -> research -> plan -> work

  Session Summary:
  ----------------
  8 iterations · 47 ops · 12m 34s
  156.2K tokens (98.4K in / 57.8K out)
  Models: opus: 6, sonnet: 2
  Cache: 45.2K read · ~40.7K saved (31.5% efficiency)
  Cost: $1.2340
  Tool calls: 142 (Read: 45, Edit: 32, Bash: 28, Glob: 22, Grep: 15)
```

At the end of a session, you get a complete summary:

```
[session] Work complete!

  Final Summary:
  --------------
  12 iterations · 89 ops · 23m 15s
  287.5K tokens (182.1K in / 105.4K out)
  Models: opus: 10, sonnet: 2
  Cache: 72.8K read · ~65.5K saved (28.6% efficiency)
  Cost: $2.4560
  Success: 11/12 (91.7%)
```

---

## Technical Architecture

For contributors and curious developers, Ralph Vibe is built on functional programming principles that make it reliable and maintainable.

### Code Organization

The codebase follows a clear module structure:

```
src/
├── cli/           # Command handlers (init, work, plan, etc.)
├── core/          # Core domain logic (config, templates, plans)
├── services/      # I/O operations (file, git, claude, metrics)
└── utils/         # Pure utilities (formatting, paths, commands, fp)
```

**Key principles:**

- **Pure vs Impure separation** - Pure logic lives in `utils/` and `core/`, I/O operations live in `services/`
- **Single responsibility** - Each module has one clear purpose
- **Shared utilities** - Common patterns extracted to avoid duplication

### Shared Utilities

Ralph uses centralized utilities to eliminate code duplication:

**Formatting** (`src/utils/formatting.ts`) - Human-readable value display:

```typescript
formatDuration(65000); // "1m 5s"
formatTokenCount(15000); // "15.0K"
formatBytes(2359296); // "2.3MB"
formatPercentage(0.42); // "42.0%"
```

**Paths** (`src/utils/paths.ts`) - Consistent path resolution:

```typescript
// Resolve paths relative to project root
resolveProjectPath(projectDir, 'specs'); // "/project/specs"

// Curried resolver for multiple paths
const resolve = createPathResolver('/project');
resolve('AGENTS.md'); // "/project/AGENTS.md"
resolve('.ralph.json'); // "/project/.ralph.json"
```

**Commands** (`src/utils/command.ts`) - Type-safe command execution:

```typescript
// Execute and capture output
const result = await executeCommand('git', ['status']);
if (result.ok) console.log(result.value.stdout);

// Check if command exists
const hasGit = await commandExists('git');

// Stream output in real-time
for await (const event of executeCommandStream('npm', ['install'])) {
  if (event.type === 'stdout') console.log(event.data);
}
```

**Constants** (`src/utils/constants.ts`) - Centralized magic strings:

```typescript
EXIT_SIGNAL_MARKER; // "EXIT_SIGNAL: true"
RALPH_STATUS_MARKER; // "RALPH_STATUS:"
DEFAULT_MODEL; // "opus"
```

### Pure vs Impure Functions

Functions are clearly marked with JSDoc annotations:

```typescript
/**
 * Formats duration to human-readable string.
 * @pure No side effects
 */
export function formatDuration(ms: number): string {
  // Pure computation - same input always produces same output
}

/**
 * Saves session state to disk.
 * @impure Writes to filesystem
 */
export async function persistSession(state: SessionState): Promise<void> {
  // I/O operation - has side effects
}
```

**Pure functions** (no side effects):

- Live in `utils/` and `core/`
- Easy to test - no mocking needed
- Compose predictably

**Impure functions** (I/O, side effects):

- Live in `services/`
- Clearly marked with `@impure`
- Isolated from pure logic

### Functional Patterns

Ralph uses type-safe functional patterns inspired by fp-ts:

**TaskEither** - Async operations that may fail:

```typescript
const fetchData = tryCatchTE(
  () => fetch('/api/data').then((r) => r.json()),
  (e) => `Fetch failed: ${e}`,
);

const result = await pipe(
  fetchData,
  flatMapTE((data) => processData(data)),
  mapTE((processed) => formatOutput(processed)),
)();
```

**Either** - Synchronous error handling:

```typescript
const divide = (a: number, b: number): Either<string, number> =>
  b === 0 ? left('Division by zero') : right(a / b);

const result = pipe(
  right(10),
  flatMapEither((x) => divide(x, 2)),
  mapEither((x) => x + 1),
);
```

**Option** - Safe nullable handling:

```typescript
const user = pipe(
  fromNullable(maybeUser),
  mapOption((u) => u.name),
  getOrElseOption(() => 'Anonymous'),
);
```

**pipe/flow** - Function composition:

```typescript
const process = flow(validateInput, transformData, formatOutput);
const output = pipe(rawInput, validateInput, transformData, formatOutput);
```

### Immutable State Pattern

Session tracking uses pure functions that always return new state:

```typescript
// State is never mutated - each function returns a new state
let state = createSession({ forking: true, specsCount: 5 });

// Record an iteration - returns NEW state
state = recordIteration(state, {
  iteration: 1,
  task: 'Add authentication',
  model: 'opus',
  inputTokens: 15000,
  outputTokens: 5000,
  durationSec: 45,
  operations: 12,
  success: true,
});

// Get statistics - pure calculation, no side effects
const stats = getStats(state);
```

### Testing Approach

The pure/impure separation makes testing straightforward:

**Pure functions** - Direct testing, no mocks:

```typescript
Deno.test('formatDuration handles minutes', () => {
  assertEquals(formatDuration(65000), '1m 5s');
});

Deno.test('resolveProjectPath joins paths', () => {
  assertEquals(resolveProjectPath('/project', 'specs'), '/project/specs');
});
```

**Impure functions** - Isolated I/O, minimal mocking:

```typescript
// Services wrap I/O operations
// Test the pure logic separately, mock only the I/O boundary
```

**Benefits:**

- Most code is testable without mocks
- Pure functions have predictable inputs/outputs
- I/O boundaries are small and isolated

### Why This Matters

These patterns provide:

- **Predictable errors** - No uncaught exceptions. Errors are values you handle explicitly.
- **Easy testing** - Pure functions are trivial to test. No mocking needed.
- **Composability** - Small functions combine into complex workflows.
- **Type safety** - TypeScript catches errors at compile time.
- **Maintainability** - Immutable state means no "spooky action at a distance."
- **DRY code** - Shared utilities eliminate duplication across the codebase.

---

## Prerequisites

### 1. Claude Code

Ralph Vibe uses Claude Code to do the actual building.

```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | sh

# Log in
claude login
```

**You need a [Claude Pro or Team subscription](https://claude.ai/pricing).**

### 2. Deno (optional)

Only needed if installing via Deno instead of the binary.

```bash
curl -fsSL https://deno.land/install.sh | sh
```

---

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | sh
```

### Verify

```bash
ralph --version
claude --version
```

---

## FAQ

**Q: Do I need to understand the Ralph Wiggum technique?**

No. That's the whole point. Ralph Vibe handles the complexity so you don't have to.

**Q: Can I use this on an existing project?**

Yes. Run `ralph init` in any project. It will interview you about your codebase and create specs based on what exists.

**Q: What if I want more control?**

Don't use `--vibe`. Run each command separately: `ralph init`, then `ralph start`, then `ralph plan`, then `ralph work`.

**Q: How is this different from just using Claude Code directly?**

Claude Code is powerful but has no memory between sessions. Ralph Vibe gives it structure: specs to follow, plans to execute, one task at a time. It turns Claude Code into a reliable build system.

---

## Credits

Built on the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum) by Geoffrey Huntley, with methodology documented in the [Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) by Clayton Farr.

**Fun fact**: Ralph Vibe itself was built using the Ralph technique. The tool that simplifies Ralph was created with Ralph. It works.

Ralph Vibe takes the proven methodology and wraps it in a tool that anyone can use - no scripts, no setup, no learning curve. Just the results.

---

## License

MIT

---

**Ralph Vibe**: The Ralph technique without learning the Ralph technique. Run it. Go for beer. Come back to code.
