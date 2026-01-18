# Contributing to Ralph CLI

Thank you for your interest in contributing to Ralph CLI!

## Development Setup

### Prerequisites

- [Deno](https://deno.land/) v2.0 or later
- [Claude Code CLI](https://docs.anthropic.com/claude-code) installed and configured

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ralph-cli.git
   cd ralph-cli
   ```

2. Run tests to verify your setup:
   ```bash
   deno task test
   ```

3. Run the CLI in development mode:
   ```bash
   deno task dev --help
   ```

## Development Commands

```bash
deno task dev         # Run CLI in development mode
deno task test        # Run all tests
deno task lint        # Run linter
deno task fmt         # Format code
deno task check       # Type-check without running
```

## Project Structure

```
src/
  cli/           # Command implementations (init, start, spec, plan, work)
  core/          # Core logic (config, templates)
  services/      # External integrations (Claude, git, file system)
  ui/            # Terminal UI components (colors, spinner, components)
tests/           # Test files mirroring src/ structure
```

## Code Style

- Run `deno task fmt` before committing
- Run `deno task lint` to check for issues
- All exports should have JSDoc comments
- Use Result types for error handling (no throwing)

## Testing

- Write tests for new features
- Run the full test suite before submitting PRs
- Tests are located in `tests/` directory

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`deno task test && deno task lint`)
5. Commit your changes with a descriptive message
6. Push to your fork
7. Open a Pull Request

## Reporting Issues

When reporting issues, please include:

- Your Deno version (`deno --version`)
- Your operating system
- Steps to reproduce the issue
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
