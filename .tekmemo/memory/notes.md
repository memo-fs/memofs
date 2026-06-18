# Notes

## 2026-06-18T08:46:09.508Z — Project identity
- kind: summary
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_d42f34bce417d0e5"}

TekBreed OSS (@tekbreed/oss) is an open-source monorepo for AI infrastructure, hosted at github.com/tekbreed/tekbreed-oss. The founder and lead maintainer is Christopher Sesugh (github.com/sponsors/christophersesugh). Licensed under MIT. Docs site at oss.tekbreed.com.

## 2026-06-18T08:46:10.506Z — Monorepo toolchain
- kind: reference
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_fe7b7dfb7361bc95"}

Built with pnpm (v9.15.4) workspaces, Turborepo (v2.9.16) for task orchestration, Biome (v2.4.16) for formatting/linting, tsdown (v0.22.2) for package bundling, TypeScript 6.0.3, Vitest (v4.1.8) for testing, and Changesets for versioning/changelog. Requires Node.js >=22.

## 2026-06-18T08:46:11.642Z — Package boundary rules
- kind: constraint
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_eb7f81b51c64b8bf"}

Package boundaries: @tekbreed/tekmemo owns the API surface and protocol contracts. Separate packages exist for CLI (tekmemo-cli), MCP server (tekmemo-mcp-server), provider adapters (tekmemo-adapter-*), benchmark kit (tekmemo-benchmark-kit), and test utilities (tekmemo-testing). The apps/ directory contains docs site and the Cloudflare MCP Worker. Internal tooling uses @repo/ scope.

## 2026-06-18T08:46:12.517Z — Agent TekMemo memory workflow
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_4948bcc351e7c4e9"}

At the start of every task, agents MUST call tekmemo_tekmemo_context with the task description, use tekmemo_tekmemo_recall for additional lookups, adhere to returned memory, and persist new facts via tekmemo_tekmemo_remember. This is enforced via AGENTS.md and ensures TekMemo is the single source of truth for project knowledge across all agent sessions.

## 2026-06-18T08:46:14.225Z — CLI testing results
- kind: note
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_6a0b06f531bd051f"}

All tekmemo-cli commands tested successfully on 2026-06-18. Commands tested: init, inspect, config, context, remember, read, events, chunks, snapshot, doctor, validate, search, diff, agent, cloud. Global flags work: --version (1.0.0-alpha.0), --json, -v, -q, --no-color, --help. Edge cases handled gracefully (invalid read target, missing args, empty labels). Note: init --force wipes all .tekmemo/ data (generates new project ID, clears all notes/events/snapshots).

## 2026-06-18T08:50:52.011Z — Core memory populated
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_9338c7da47037665"}

Core memory (.tekmemo/memory/core.md) was populated on 2026-06-18 with compact always-relevant truths: project identity, first product (TekMemo), monorepo toolchain, architecture constraints, and agent workflow. It is unconditionally injected into every agent context, unlike notes memory which is loaded on-demand.

## 2026-06-18T08:54:22.839Z — AGENTS.md refactored as thin TekMemo bootstrapper
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_dc97f0587d45e505"}

AGENTS.md was refactored to be a thin bootstrapper for TekMemo. All project facts (identity, packages, architecture) were removed — they live in core memory and notes memory. The file now contains only: (1) TekMemo MCP bootstrap instructions, (2) behavioral rules that can't go through MCP, (3) pointers to rules/skills dirs. This implements the DRY/SSOT principle: TekMemo is the single source of truth, agent memory files are minimal pointers.
