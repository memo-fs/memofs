# AGENTS.md - TekBreed OSS

This file is the source of truth for agents working in this repo.

## What This Repository Is

`@tekbreed/oss` is the TekBreed open-source monorepo.

TekMemo is the first product family. It is published as three main packages:

```txt
@tekbreed/tekmemo            # Core memory runtime
@tekbreed/tekmemo-cli        # CLI distribution
@tekbreed/tekmemo-mcp-server # Model Context Protocol server
```

Everything is imported directly from their respective packages. Do not reintroduce separate public TekMemo adapter packages.

## Current Structure

```txt
tekbreed-oss/
├── apps/
│   └── docs/              # TekBreed OSS docs site
├── packages/
│   ├── tekmemo/           # TekMemo core runtime package
│   ├── tekmemo-cli/       # TekMemo CLI package
│   ├── tekmemo-mcp-server/# TekMemo MCP server package
├── projects/
│   └── tekmemo/           # planning and architecture notes
├── tooling/               # private @repo/* workspace tooling
├── docs/                  # repo operations notes
└── scripts/               # repo maintenance scripts
```

The repo should not keep runnable examples or self-host apps as first-class surfaces during this cleanup.

## Package Boundaries

- Public TekMemo Core APIs belong in `packages/tekmemo/src/` and are re-exported in `packages/tekmemo/src/index.ts`.
- TekMemo CLI logic and binaries belong in `packages/tekmemo-cli/`.
- TekMemo MCP server logic and binaries belong in `packages/tekmemo-mcp-server/`.
- Private shared tooling belongs in `tooling/` and keeps the `@repo/*` namespace.

## Commands

Run commands from the repo root.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm format-and-lint
pnpm format-and-lint:fix
pnpm lint:package
pnpm docs:dev
pnpm docs:build
pnpm validate:workspace
```

## Style And Safety

- Use TypeScript strict mode and ESM.
- Use Biome formatting: tabs and double quotes.
- Do not add Prettier.
- Do not use `any` unless the reason is documented.
- Prefer `unknown` for untrusted external data.
- Add tests for new logic-heavy behavior.
- Do not commit secrets, API keys, `.env` files, private credentials, or private cloud internals.

## Repository Standards

1. Keep root docs aligned with TekBreed OSS as the umbrella.
2. Keep TekMemo documented as modular packages with clear entrypoints.
3. Keep exports consolidated and clean.

