# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-01-18

### Added

- **specs/README.md lookup table** - Prompts now instruct Claude to create and maintain an index of all specs with descriptions and key topics. This helps the build loop find relevant specs faster.
- **Task linkage in plans** - Implementation plan tasks now require `[spec: X]` and `[file: Y]` citations to help Claude find relevant context instantly.
- **Git tagging on success** - Automatically creates and pushes a semver git tag when all tasks complete successfully.

### Changed

- **Simplified PROMPT_build.md** - Reduced from ~100 lines to ~30 lines following Geoff Huntley's "minimal prompt, maximum clarity" approach.
- **Updated PROMPT_plan.md** - Now includes linkage requirement and specs/README.md reference.

## [0.1.1] - 2026-01-18

### Fixed

- **Install script auto-PATH** - The install script now automatically adds Ralph to the user's PATH by appending to `.zshrc`, `.bashrc`, or `.profile`.

## [0.1.0] - 2026-01-18

### Added

- `ralph init` - Initialize a new Ralph project with all required files
- `ralph start` - Interactive interview to create initial feature specs
- `ralph spec` - Add new feature specs via Claude interview
- `ralph plan` - Generate implementation plan from specs using Claude
- `ralph work` - Run the autonomous build loop with Claude
- `--vibe` flag - Chain commands automatically (init → start → plan → work)
- Beautiful CLI UI with progress indicators, spinners, and status components
- Anthropic API usage tracking and display
- Project configuration via `.ralph.json`

### Technical

- Built with Deno and TypeScript
- Uses Cliffy for CLI framework
- Integrates with Claude Code CLI for AI-powered development
- Implements the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum)

## Project Structure

After `ralph init`, your project will have:

| File | Purpose |
|------|---------|
| `PROMPT_build.md` | Instructions for build iterations |
| `PROMPT_plan.md` | Instructions for gap analysis and planning |
| `AGENTS.md` | Operational guide - build/run/validate commands |
| `IMPLEMENTATION_PLAN.md` | Task list with linkage to specs/files |
| `specs/README.md` | Specs index (lookup table) |
| `specs/*.md` | Feature specifications |
| `.ralph.json` | CLI configuration |
