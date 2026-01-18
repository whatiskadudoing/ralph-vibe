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

| Original Ralph Loop | Ralph Vibe |
|---------------------|------------|
| Write shell scripts | Just run `ralph work` |
| Create prompt files manually | Auto-generated from interview |
| Understand the architecture | Just answer questions |
| Debug your setup | It just works |
| Hours of configuration | One command |

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
ralph init    →  Sets up project files
ralph start   →  Interviews you, creates specs
ralph plan    →  Analyzes specs, creates task list
ralph work    →  Builds one task at a time until done
```

With `--vibe`, it chains automatically:

```bash
ralph init --vibe   # Does everything: init → start → plan → work
ralph spec --vibe   # New feature: spec → plan → work
ralph plan --vibe   # Replanning: plan → work
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
```

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
├── IMPLEMENTATION_PLAN.md # Task checklist
├── specs/                 # Your feature specifications
│   └── *.md
└── .ralph.json            # Ralph config (hidden)
```

You can edit any of these. Ralph Vibe creates them; you own them.

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
