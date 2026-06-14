# TekMemo Docs App

Developer documentation for the TekMemo OSS workspace.

## Scope

This VitePress app documents:

- `@tekbreed/tekmemo` (core runtime, filesystem store, agentfs, graph memory, vector/provider adapters, reranking, benchmarks)
- `@tekbreed/tekmemo-cli` (CLI distribution)
- `@tekbreed/tekmemo-mcp-server` (Model Context Protocol server)
- examples and architecture

It intentionally does not contain blog, changelog, pricing, billing, legal, roadmap, or competitor pages. Those belong in the TekMemo Cloud app CMS.

## Commands

```bash
pnpm --filter @tekbreed/docs dev
pnpm --filter @tekbreed/docs build
pnpm --filter @tekbreed/docs preview
pnpm --filter @tekbreed/docs check:links
```
