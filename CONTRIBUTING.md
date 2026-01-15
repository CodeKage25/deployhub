# Contributing to DeployHub

Thank you for your interest in contributing to DeployHub! 🚀

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev`

## Development Workflow

### Branch Naming

- `feature/` - New features (e.g., `feature/add-kubernetes-support`)
- `fix/` - Bug fixes (e.g., `fix/deployment-logs`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add Ruby buildpack support
fix: resolve Docker socket connection issue
docs: update deployment guide
refactor: simplify IaC parser logic
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests if applicable
4. Ensure all tests pass: `npm test`
5. Submit a pull request with a clear description

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic

## Project Structure

```
apps/api/        # Backend (Fastify)
apps/web/        # Frontend (React)
packages/shared/ # Shared types
```

## Adding a New Buildpack

1. Edit `apps/api/src/services/builder/index.ts`
2. Add detection logic and Dockerfile template
3. Test with a sample repository
4. Update README with the new language

## Questions?

Open an issue or start a discussion. We're happy to help!
