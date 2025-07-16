# Contributing to Hogsync

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for npm publishing)
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/hogsync.git
   cd hogsync
   ```

3. Install dependencies:

   ```bash
   bun install
   ```

4. Run tests to ensure everything works:

   ```bash
   bun test
   ```

5. Build the project:

   ```bash
   bun run build
   ```

### Development Workflow

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards
3. Add tests for new functionality
4. Run the full test suite:

   ```bash
   bun test
   bun run typecheck
   bun run check
   ```

5. Build and test the CLI:

   ```bash
   bun run build
   bun run build:binary
   ./bin/hogsync --help
   ```

## Coding Standards

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

- **Formatting**: 2 spaces, single quotes, semicolons, trailing commas
- **Line length**: 100 characters
- **Naming**: camelCase for variables/functions, PascalCase for types/classes

Run formatting and linting:

```bash
bun run format:fix  # Auto-fix formatting
bun run lint:fix    # Auto-fix linting issues
bun run check:fix   # Fix both formatting and linting
```

### TypeScript Guidelines

- Use strict TypeScript settings
- Prefer `interface` over `type` for object shapes
- Use `const assertions` for immutable data
- Avoid `any` - use `unknown` or proper types
- Add JSDoc comments for all public APIs

### Testing

- Write tests for all new features and bug fixes
- Use descriptive test names: `should do X when Y`
- Test both success and error cases
- Aim for >80% code coverage
- Use Bun's built-in test runner

Test structure:

```typescript
import { describe, expect, test } from 'bun:test';

describe('Feature Name', () => {
  test('should behave correctly when given valid input', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass:

   ```bash
   bun test
   bun run typecheck
   bun run check
   ```

2. Update documentation if needed
3. Add entries to CHANGELOG.md for user-facing changes
4. Ensure your branch is up to date with main

### PR Guidelines

1. **Title**: Use conventional commit format:
   - `feat: add new feature`
   - `fix: resolve bug in X`
   - `docs: update README`
   - `test: add tests for Y`
   - `refactor: improve Z`

2. **Description**: Include:
   - What changes were made and why
   - Link to related issues
   - Screenshots for UI changes
   - Breaking changes (if any)

3. **Size**: Keep PRs focused and reasonably sized
4. **Tests**: Include tests for new functionality
5. **Documentation**: Update docs for user-facing changes

### PR Template

```markdown
## Summary
Brief description of changes

## Changes
- List of specific changes made

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Breaking Changes
None / List any breaking changes
```

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

### Feature Requests

Use the feature request template and include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Alternatives considered

## Development Scripts

```bash
# Development
bun run dev              # Watch mode for CLI development
bun run watch:flags      # Watch flag generation

# Building
bun run build            # Build TypeScript
bun run build:binary     # Build CLI binary
bun run build:clean      # Clean build directory

# Testing & Quality
bun test                 # Run tests
bun run typecheck        # Type checking
bun run lint             # Lint code
bun run format           # Format code
bun run check            # Lint + format check

# Examples
bun run generate:flags   # Generate example flags
bun run sync:flags       # Sync example flags
```

## Project Structure

```
src/
├── cli.ts           # CLI entry point
├── config.ts        # Configuration loading
├── generator.ts     # TypeScript generation
├── index.ts         # Main library exports
├── react-hooks.ts   # React integration
├── sync.ts          # PostHog synchronization
└── types.ts         # Type definitions

tests/               # Test files
templates/           # Code generation templates
examples/            # Usage examples
scripts/             # Build and utility scripts
```

## Release Process

Releases are automated via GitHub Actions:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Action will build and publish to npm

## Getting Help

- Check existing [issues](https://github.com/your-username/hogsync/issues)
- Create a new issue for bugs or feature requests
- Join discussions for questions and ideas

