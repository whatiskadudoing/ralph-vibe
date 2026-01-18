# Ralph Vibe

> More than a philosophy. More than vibe coding. This is **Ralph Vibe**.

Autonomous development with Claude Code, built on the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum).

## What is Ralph Vibe?

Everyone talks about the "Ralph philosophy" - fresh context, specs as truth, one task per loop. But Ralph Vibe takes it further. It's not just a methodology; it's a **workflow that lets you step away**.

```bash
ralph init --vibe
```

Run one command. Answer a few questions. Go grab a beer. Come back to working code.

That's Ralph Vibe.

## Getting Started

### First Time? Start Simple.

Before building your complex app, **try something simple first**. This helps you understand the flow:

```bash
# 1. Create a test folder
mkdir my-first-ralph && cd my-first-ralph

# 2. Run the full flow
ralph init --vibe

# 3. When asked, describe something simple:
#    "A CLI that converts temperatures between Celsius and Fahrenheit"

# 4. Go grab a beer. Seriously.

# 5. Come back to working code.
```

Once you see the magic happen on a simple project, you'll understand exactly how Ralph Vibe works. Then you're ready for the complex stuff.

### The Flow

Ralph Vibe follows a natural progression:

```
init → start → plan → work
  ↓       ↓       ↓      ↓
Setup  Specs   Tasks   Build
```

**With `--vibe` flag**, it flows automatically:

| Command | What Happens |
|---------|--------------|
| `ralph init --vibe` | Setup → Interview → Plan → Build (full flow) |
| `ralph spec --vibe` | New spec → Plan → Build |
| `ralph plan --vibe` | Plan → Build |

**Without `--vibe`**, run each step manually:

```bash
ralph init      # Setup project structure
ralph start     # Interview to create initial specs
ralph plan      # Generate implementation plan
ralph work      # Run autonomous build loop
```

## Commands

### `ralph init`

Initialize a new Ralph project. Sets up all files at your project root.

```bash
ralph init              # Interactive setup
ralph init --vibe       # Setup + full autonomous flow
```

### `ralph start`

First-time spec creation. Interviews you about what you want to build.

```bash
ralph start             # Create initial specs
ralph start --vibe      # Specs → Plan → Build
```

### `ralph spec`

Add a new feature to an existing project.

```bash
ralph spec                          # Interview for new feature
ralph spec -f "user authentication" # With a hint
ralph spec --vibe                   # New spec → Plan → Build
```

### `ralph plan`

Generate implementation plan from your specs.

```bash
ralph plan              # Create/update plan
ralph plan --vibe       # Plan → Build
```

### `ralph work`

Run the autonomous build loop. This is where the magic happens.

```bash
ralph work                      # Run until complete
ralph work --max-iterations 10  # Limit iterations
```

## The Philosophy

Ralph Vibe is built on proven principles:

### 1. Fresh Context Every Time

Each iteration starts clean. No accumulated confusion. No context pollution. Claude reads the specs, picks a task, builds it, commits, and exits.

### 2. Specs Are Truth

Your specs in `specs/` are the single source of truth. Not the code. Not comments. The specs. When Claude builds, it builds to match the specs.

### 3. One Task Per Loop

Focus beats multitasking. Each iteration: read specs → pick ONE task → implement → test → commit → exit. Repeat.

### 4. Tests Are Backpressure

Nothing gets marked complete until tests pass. This creates natural quality gates. Claude can't lie about progress.

### 5. Files Over Memory

Everything persists in files: specs, plans, agents guide. When context resets, nothing is lost. The project state lives in the filesystem.

## Generated Files

After `ralph init`:

```
your-project/
├── PROMPT_build.md        # Build mode instructions
├── PROMPT_plan.md         # Planning mode instructions
├── AGENTS.md              # How to build/run/test
├── IMPLEMENTATION_PLAN.md # Task checklist
├── specs/                 # Your specifications
│   └── *.md
└── .ralph.json            # CLI config (hidden)
```

## Prerequisites

Before using Ralph Vibe, you need:

### 1. Claude Code CLI

Ralph uses Claude Code under the hood. You must have it installed and logged in.

```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | sh

# Log in to your account
claude login
```

**Important**: You need an active [Claude Pro or Team subscription](https://claude.ai/pricing) to use Claude Code.

### 2. Deno Runtime

Ralph Vibe is built with Deno.

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

## Installation

```bash
# Install Ralph Vibe (downloads binary from GitHub releases)
curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | sh
```

Or if you have Deno installed:

```bash
deno install -A -n ralph jsr:@ralph/cli
```

### Verify Your Setup

Make sure everything is ready:

```bash
# Check Claude Code is installed and logged in
claude --version

# Check Ralph is installed
ralph --version
```

If `claude --version` fails, revisit the [Claude Code installation](https://docs.anthropic.com/claude-code).

## Why "Ralph"?

Named after the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum) by Geoffrey Huntley. The original technique used shell scripts and manual loops. Ralph Vibe automates the entire flow while keeping the core philosophy intact.

## License

MIT

---

**Ralph Vibe**: Run it. Go for beer. Come back to code.
