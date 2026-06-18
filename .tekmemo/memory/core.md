# Core Memory

## Project Identity
TekBreed OSS — open-source AI infrastructure monorepo. MIT license. Founder: Christopher Sesugh.
Docs: oss.tekbreed.com | Repo: github.com/tekbreed/tekbreed-oss

## First Product: TekMemo
File-first memory runtime for AI apps, agents, coding tools, MCP clients.
Published as three npm packages: @tekbreed/tekmemo (core), @tekbreed/tekmemo-cli, @tekbreed/tekmemo-mcp-server

## Monorepo Toolchain
pnpm workspaces | Turborepo | Biome (format/lint) | tsdown (bundling) | TypeScript | Vitest | Changesets

## Architecture Constraints
- Core protocol contracts must be provider-neutral (no FS, API, or cloud deps)
- Public API: root entrypoint only, no subpath imports
- @tekbreed/tekmemo owns protocol; separate packages for CLI, MCP, adapters, testing
- @repo/ scope is internal tooling only

## Agent Workflow
At task start, call tekmemo_tekmemo_context. Use tekmemo_tekmemo_recall for lookup.
Persist new facts via tekmemo_tekmemo_remember. See AGENTS.md.
