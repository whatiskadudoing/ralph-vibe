# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta] - 2024

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
| `IMPLEMENTATION_PLAN.md` | Task list with checkboxes |
| `specs/` | Feature specifications |
| `.ralph.json` | CLI configuration |
