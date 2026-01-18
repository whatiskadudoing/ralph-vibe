# Ralph CLI

Autonomous development with Claude Code, implementing the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum).

## Quick Start

```bash
# Install
deno install -A -n ralph jsr:@ralph/cli

# Initialize project
ralph init

# Add feature specs
ralph spec

# Generate implementation plan
ralph plan

# Run autonomous build loop
ralph work
```

## Generated Files

After `ralph init`, your project will have:

| File | Purpose |
|------|---------|
| `PROMPT_build.md` | Instructions for build iterations (Phases 0-4) |
| `PROMPT_plan.md` | Instructions for gap analysis and planning |
| `AGENTS.md` | Operational guide - build/run/validate commands |
| `IMPLEMENTATION_PLAN.md` | Task list with checkboxes |
| `specs/` | Feature specifications (one per topic) |
| `.ralph.json` | CLI configuration (hidden) |

## The Ralph Wiggum Technique

Key principles:

1. **Fresh context each iteration** - Clean slate prevents context pollution
2. **One task per loop** - Focused work, better results
3. **Files as source of truth** - Specs and plan persist between iterations
4. **Tests as backpressure** - Must pass before marking complete

## Commands

### `ralph init`

Initialize a new Ralph project. Creates all necessary files at your project root.

```bash
ralph init
```

### `ralph spec`

Add a new feature specification through an interview process.

```bash
ralph spec
ralph spec "user authentication"  # With hint
```

### `ralph plan`

Generate or regenerate the implementation plan based on specs.

```bash
ralph plan
```

### `ralph work`

Run the autonomous build loop. Replaces the manual `loop.sh` from the original technique.

```bash
ralph work
ralph work --max-iterations 10
```

### `ralph status`

Show project status and progress.

```bash
ralph status
```

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/ralph-cli.git
cd ralph-cli

# Run in dev mode
deno task dev init

# Run tests
deno task test

# Compile to binary
deno task compile
```

## Requirements

- [Deno](https://deno.land/) 2.x
- [Claude Code CLI](https://docs.anthropic.com/claude-code)

## License

MIT
