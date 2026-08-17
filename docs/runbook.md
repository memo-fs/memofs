# MemoFS Workspace Runbook

MemoFS is a pnpm and Turborepo monorepo. Run workspace commands from the repository root.

## Workspace layout

```text
memofs/
├── apps/
│   └── docs/                  # @memofs/docs VitePress site
├── benchmarks/                # @memofs/benchmarks runner and suites
├── examples/                  # @memofs/examples integration examples
├── packages/
│   ├── core/                  # @memofs/core runtime and file-first primitives
│   ├── cli/                   # @memofs/cli command-line distribution
│   ├── mcp-server/            # @memofs/mcp-server agent-tool server
│   ├── server/                # @memofs/server self-hostable runtime
│   ├── json-rpc/              # @memofs/json-rpc shared protocol primitives
│   ├── connectors/            # @memofs/connectors connector framework
│   ├── testing/               # @memofs/testing fixtures and test helpers
│   ├── benchmark-kit/         # @memofs/benchmark-kit benchmark library
│   └── adapter-*/             # Provider and framework adapters
├── tooling/
│   ├── e2e/                   # @repo/e2e release and simulation harness
│   ├── tsdown/                # @repo/tsdown shared build configuration
│   ├── typescript/            # @repo/typescript shared TypeScript config
│   └── utils/                 # @repo/utils internal utilities
├── docs/                      # Repository documentation and local decision records
├── scripts/                   # Repository maintenance scripts
├── pnpm-workspace.yaml        # Workspace membership
└── turbo.json                 # Task pipeline
```

The pnpm workspace includes `apps/docs`, `benchmarks`, `examples`, every package in `packages/*`, and every internal tool in `tooling/*`. `apps/cloud` is also reserved in the workspace configuration for the local-only cloud app; it is gitignored and is absent from a normal checkout.

The current adapter packages are AI SDK, OpenAI, R2, Transformers, Turso, Voyage, and Workers AI. They are separate packages, not modules re-exported by `@memofs/core`.

## Common commands

```bash
# Install the locked dependency set
pnpm install

# Start development tasks
pnpm dev

# Run formatting and lint checks
pnpm format-and-lint

# Type-check workspace packages and apps
pnpm typecheck

# Run unit tests once
pnpm test

# Build workspace packages and apps
pnpm build

# Validate publishable package exports
pnpm lint:package

# Start or build the documentation site
pnpm docs:dev
pnpm docs:build

# Run the complete workspace validation gate
pnpm validate:workspace
```

`pnpm validate:workspace` runs formatting and lint checks, type checks, unit tests, builds, package-export validation, and the documentation build. Use it before handing off a workspace-wide change or preparing a release.

## Working safely

- Use Biome for formatting and linting; this workspace does not use Prettier.
- Keep public package code under the `@memofs/*` scope. The `@repo/*` scope is private tooling only.
- Keep credentials in ignored environment files. Do not commit API keys, tokens, or local cloud configuration.
- Keep the internal decision records in `docs/CONTEXT.md`, `docs/adr/`, and `docs/architecture/` local-only. Do not add them to commits or link to them from public documentation.
