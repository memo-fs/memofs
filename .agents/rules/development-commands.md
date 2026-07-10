## Development Commands

Run all commands from the **repo root** unless otherwise specified.

```bash
# Install dependencies
pnpm install

# Start all dev servers (via Turborepo)
pnpm dev

# Build all packages and apps
pnpm build

# Build and watch all packages (persistent)
pnpm build:watch

# Type-check everything
pnpm typecheck

# Format and lint (check only)
pnpm format-and-lint

# Format and lint (auto-fix safe changes)
pnpm format-and-lint:fix

# Format and lint (auto-fix including unsafe changes)
pnpm format-and-lint:fix:unsafe

# Run all unit tests (single pass)
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Validate package exports with publint
pnpm lint:package

# Validate packages from all sort of warnings and bugs
pnpm validate:workspace
```

### Package scripts (e.g. `packages/cli`)

```bash
cd packages/cli

# Build (tsdown — dual ESM + CJS)
pnpm build

# Build in watch mode
pnpm build:watch

# Run unit tests (Vitest, watch mode)
pnpm test

# Run unit tests once
pnpm test:run

# Validate package exports
pnpm lint:package
```