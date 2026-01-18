# Ralph CLI - Project Plan

## Vision

A beautiful, simple CLI that makes autonomous AI development accessible to everyone. Initialize a project, describe what you want, and let Claude build it.

**Inspiration:**
- Technique: [github.com/ghuntley/how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- UI: [gemini-cli](https://github.com/google-gemini/gemini-cli) & Claude Code

---

## ⚠️ Primary Reference

**This CLI is an implementation of the Ralph Wiggum technique.**

When unsure about:
- How the loop should work
- What prompts should contain
- How tasks should be structured
- Philosophy and principles

**Always check:** [github.com/ghuntley/how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)

### Key Concepts from Ralph Wiggum

1. **Fresh context each iteration** - Each loop gets a clean slate
2. **One task per loop** - Small, focused work
3. **Files are source of truth** - Claude re-reads specs/plan each time
4. **Let Ralph self-correct** - Trust the process, don't over-engineer
5. **Backpressure via tests** - Tests guide correctness
6. **The plan is disposable** - Regenerate if things go off track

### Core Loop (from original)

```bash
while :; do cat PROMPT.md | claude -p --dangerously-skip-permissions; done
```

Everything we build wraps and enhances this simple concept.

### File Structure (aligned with original)

After running `ralph init`, the project root will have:

```
project-root/
├── PROMPT_build.md        # Build mode - Full Phases 0-4 + Guardrails
├── PROMPT_plan.md         # Plan mode - Gap analysis focus
├── AGENTS.md              # Operational guide (build/run/validate commands)
├── IMPLEMENTATION_PLAN.md # Task list with checkboxes
├── specs/                 # Requirements directory
│   └── .gitkeep
└── .ralph.json            # Ralph CLI configuration (hidden)
```

**Note:** Files are at project root (not in a subdirectory). The `ralph work` command replaces `loop.sh`.

## Tech Stack

- **Runtime:** Deno 2.x
- **Language:** TypeScript (native, no build step)
- **CLI Framework:** [Cliffy](https://cliffy.io/) - commands, prompts, colors
- **Testing:** Deno's built-in test runner
- **Distribution:** `deno compile` → single binary

## Architecture

```
ralph-cli/
├── src/
│   ├── mod.ts                 # Entry point
│   ├── cli/                   # Command definitions
│   │   ├── mod.ts
│   │   ├── init.ts
│   │   ├── spec.ts
│   │   ├── work.ts
│   │   └── ...
│   ├── core/                  # Business logic (no I/O)
│   │   ├── mod.ts
│   │   ├── config.ts          # Config schema & validation
│   │   ├── templates.ts       # Prompt templates
│   │   ├── plan_parser.ts     # Parse plan.md
│   │   └── ...
│   ├── services/              # I/O & external calls
│   │   ├── mod.ts
│   │   ├── file_service.ts    # Read/write files
│   │   ├── claude_service.ts  # Call Claude CLI
│   │   ├── git_service.ts     # Git operations
│   │   └── ...
│   ├── ui/                    # Terminal UI components
│   │   ├── mod.ts
│   │   ├── colors.ts          # Color palette
│   │   ├── spinner.ts         # Loading spinner
│   │   ├── banner.ts          # ASCII art header
│   │   ├── progress.ts        # Progress bars
│   │   └── ...
│   └── utils/                 # Shared utilities
│       ├── mod.ts
│       └── ...
├── tests/
│   ├── core/                  # Unit tests (pure functions)
│   ├── services/              # Integration tests (mocked I/O)
│   └── cli/                   # E2E tests
├── templates/                 # File templates
│   ├── PROMPT_build.md
│   ├── PROMPT_plan.md
│   └── config.json
├── deno.json                  # Deno config
├── PLAN.md                    # This file
└── README.md
```

## Design Principles

### 1. Modular & Testable

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                         │
│              (commands, argument parsing)                │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                      Core Layer                          │
│         (business logic, pure functions, no I/O)         │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    Services Layer                        │
│            (file I/O, Claude, git, network)              │
└─────────────────────────────────────────────────────────┘
```

- **Core:** Pure functions, easy to unit test
- **Services:** Injected dependencies, mockable
- **CLI:** Thin layer, just wires things together

### 2. Test-Driven Development

For each feature:
1. Write failing test
2. Implement minimal code to pass
3. Refactor
4. Repeat

### 3. Beautiful UI

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│    ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗             │
│    ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║             │
│    ██████╔╝███████║██║     ██████╔╝███████║             │
│    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║             │
│    ██║  ██║██║  ██║███████╗██║     ██║  ██║             │
│    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝             │
│                                                          │
│    Autonomous AI Development                       v0.1  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Color Palette:**
- Primary: Cyan (`#00D4FF`)
- Success: Green (`#00FF88`)
- Warning: Yellow (`#FFD93D`)
- Error: Red (`#FF6B6B`)
- Muted: Gray (`#6B7280`)

**UI Components:**
- Spinners for loading states
- Progress bars for iterations
- Checkmarks for completed tasks
- Boxed sections for clarity
- Syntax highlighting for code

---

## Phase 0: Project Setup

### Tasks

- [ ] Initialize Deno project with `deno.json`
- [ ] Set up directory structure
- [ ] Configure linting and formatting
- [ ] Create basic test setup
- [ ] Add Cliffy dependency

### Files to Create

**deno.json:**
```json
{
  "name": "@ralph/cli",
  "version": "0.1.0",
  "tasks": {
    "dev": "deno run --allow-all src/mod.ts",
    "test": "deno test --allow-all",
    "test:watch": "deno test --allow-all --watch",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "compile": "deno compile --allow-all --output=ralph src/mod.ts"
  },
  "imports": {
    "@cliffy/command": "jsr:@cliffy/command@^1.0.0",
    "@cliffy/prompt": "jsr:@cliffy/prompt@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0",
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/testing": "jsr:@std/testing@^1.0.0"
  },
  "fmt": {
    "indentWidth": 2,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

---

## Phase 1: `ralph init` (MVP)

The simplest flow. User runs `ralph init`, answers a few questions, gets all needed files at project root.

### User Flow

```
$ ralph init

    ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║
    ██████╔╝███████║██║     ██████╔╝███████║
    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║
    ██║  ██║██║  ██║███████╗██║     ██║  ██║
    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝

    Welcome! Let's set up your project for autonomous development.

? Project name: › my-awesome-app

? Brief description: › A task management app with calendar integration

? Tech stack:
  ❯ ◉ TypeScript + React
    ◯ TypeScript + Node.js
    ◯ Python + FastAPI
    ◯ Swift + SwiftUI
    ◯ Go
    ◯ Other

? Build command: › npm run build

? Test command: › npm test

  ✓ Project initialized!

  All set! Next steps:

  1. Add a feature:     ralph spec
  2. Generate plan:     ralph plan
  3. Start building:    ralph work

```

### Implementation Tasks

#### 1.1 UI Module

```
tests/ui/colors_test.ts
tests/ui/banner_test.ts
tests/ui/spinner_test.ts
```

- [ ] Test: colors return correct ANSI codes
- [ ] Implement: `ui/colors.ts` - color palette functions
- [ ] Test: banner renders correctly
- [ ] Implement: `ui/banner.ts` - ASCII art header
- [ ] Test: spinner shows/hides correctly
- [ ] Implement: `ui/spinner.ts` - loading animation

#### 1.2 Core Module - Config

```
tests/core/config_test.ts
```

- [ ] Test: config schema validation (valid config passes)
- [ ] Test: config schema validation (invalid config fails)
- [ ] Test: config defaults are applied
- [ ] Implement: `core/config.ts` - Config type and validation

**Config Schema:**
```typescript
interface RalphConfig {
  name: string;
  description: string;
  tech: {
    language: string;
    framework?: string;
  };
  commands: {
    build?: string;
    test?: string;
    lint?: string;
  };
  ralph: {
    model: 'opus' | 'sonnet';
    maxIterations: number;
    autoPush: boolean;
  };
}
```

#### 1.3 Core Module - Templates

```
tests/core/templates_test.ts
```

- [ ] Test: PROMPT_build template renders with variables
- [ ] Test: PROMPT_plan template renders with variables
- [ ] Test: empty plan.md is generated correctly
- [ ] Implement: `core/templates.ts` - template rendering

#### 1.4 Services Module - File Service

```
tests/services/file_service_test.ts
```

- [ ] Test: createDirectory creates nested dirs
- [ ] Test: writeFile writes content correctly
- [ ] Test: fileExists returns correct boolean
- [ ] Implement: `services/file_service.ts` - file operations

#### 1.5 CLI Module - Init Command

```
tests/cli/init_test.ts
```

- [ ] Test: init creates ralph/ directory
- [ ] Test: init creates all required files
- [ ] Test: init fails gracefully if ralph/ exists
- [ ] Test: init uses provided answers correctly
- [ ] Implement: `cli/init.ts` - init command

#### 1.6 Integration

- [ ] Wire up CLI entry point
- [ ] Test full `ralph init` flow manually
- [ ] Fix any issues

### Files Created by `ralph init`

**.ralph.json** (hidden config file):
```json
{
  "name": "my-awesome-app",
  "description": "A task management app with calendar integration",
  "tech": {
    "language": "typescript",
    "framework": "react"
  },
  "commands": {
    "build": "npm run build",
    "test": "npm test"
  },
  "ralph": {
    "model": "opus",
    "maxIterations": 50,
    "autoPush": true
  }
}
```

**PROMPT_build.md** (Build mode - Phases 0-4 + Guardrails):
```markdown
# Build Mode

You are implementing features for **my-awesome-app**.

> A task management app with calendar integration

---

## Phase 0: Orientation

0a. Study the specifications in `specs/`
0b. Read `IMPLEMENTATION_PLAN.md` to understand current state
0c. Review relevant source code

## Phase 1: Task Selection & Implementation

1. Select the **MOST IMPORTANT** unchecked task from IMPLEMENTATION_PLAN.md
2. Implement the task completely
3. Follow patterns established in AGENTS.md

## Phase 2: Validation

1. Run all validation commands from AGENTS.md
2. Fix any failures before proceeding
3. Ensure tests pass

## Phase 3: Documentation

1. Update IMPLEMENTATION_PLAN.md - mark task `[x]` complete
2. Add any learnings to AGENTS.md (operational notes only)
3. Update specs if inconsistencies discovered

## Phase 4: Commit

1. Stage all changes
2. Write descriptive commit message
3. Push to remote

---

## Guardrails

99. Search codebase before assuming something isn't implemented
999. Keep AGENTS.md operational only - no status/progress
9999. One task per iteration - exit after Phase 4
99999. Run tests before marking complete
999999. Capture the WHY in commit messages
```

**PROMPT_plan.md** (Gap analysis focus):
```markdown
# Plan Mode

You are performing **GAP ANALYSIS** between specifications and code.

## Instructions

1. Read all specs in `specs/`
2. Search codebase to find what's already implemented
3. Identify gaps between specs and reality
4. Create prioritized task list in IMPLEMENTATION_PLAN.md

## Critical Rules

- **Plan only.** Do NOT implement anything.
- **Do NOT assume** functionality is missing - confirm with code search
- Each task should be completable in **one iteration**
- Order by **dependency** (foundations first)
```

**AGENTS.md** (Operational guide):
```markdown
# AGENTS.md - Operational Guide

## Build & Run

- **Build:** `npm run build`
- **Test:** `npm test`
- **Lint:** `npm run lint`

## Validation Checklist

1. [ ] Tests pass
2. [ ] Linting passes
3. [ ] Types check

## Operational Notes
<!-- Add learnings about running this project here -->

## Codebase Patterns
<!-- Document discovered conventions here -->
```

**IMPLEMENTATION_PLAN.md**:
```markdown
# Implementation Plan

_Run `ralph spec` to add your first feature, then `ralph plan` to generate tasks._

## Phase 1: Setup
- [ ] (Tasks will be generated by `ralph plan`)
```

**specs/.gitkeep:**
```
(empty file)
```

---

## Phase 2: `ralph spec` (Interview Mode)

_To be detailed after Phase 1 is complete._

Quick overview:
- User describes a feature
- Claude asks clarifying questions
- Spec file is generated
- Plan is updated with new tasks

---

## Phase 3: `ralph work` (The Loop)

_To be detailed after Phase 2 is complete._

Quick overview:
- Read PROMPT_build.md
- Send to Claude with stream-json
- Parse output, show progress
- Push to git after each iteration
- Repeat until EXIT_SIGNAL

---

## Phase 4: Supporting Commands

_To be detailed later._

- `ralph status` - Show progress
- `ralph fix` - Report a bug
- `ralph log` - Show history
- `ralph plan` - Regenerate plan

---

## Development Workflow

### Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run specific test file
deno test tests/core/config_test.ts
```

### Development

```bash
# Run in dev mode
deno task dev init

# Format code
deno task fmt

# Lint code
deno task lint
```

### Building

```bash
# Compile to binary
deno task compile

# Test the binary
./ralph init
```

---

## Definition of Done (Phase 1)

- [ ] All tests pass
- [ ] `ralph init` works end-to-end
- [ ] UI is beautiful (banner, colors, spinners)
- [ ] Code is clean and documented
- [ ] Can compile to single binary
- [ ] README has basic usage instructions

---

## Future Enhancements (Post-MVP)

- [ ] `ralph chat` - Open conversation about project
- [ ] `ralph undo` - Revert last iteration
- [ ] `ralph review` - Review recent changes
- [ ] Config file in home directory for defaults
- [ ] Plugin system for custom templates
- [ ] Web dashboard for monitoring
- [ ] VS Code extension
