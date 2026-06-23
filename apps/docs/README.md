# TekMemo Docs App

Developer documentation for the TekMemo OSS workspace.

## Scope

This VitePress app documents the TekMemo OSS workspace:

- `@tekbreed/tekmemo` (core runtime, filesystem store, agentfs, graph memory, vector/provider adapters, reranking, benchmarks)
- `@tekbreed/tekmemo-cli` (CLI distribution)
- `@tekbreed/tekmemo-mcp-server` (Model Context Protocol server)
- examples and architecture

It also hosts the engineering blog (`/blog/`), changelog (`/changelog/`), and
FAQs (`/faqs/`) — engineering content lives where developers already read it
(per the ADR 0008 docs-IA decision, 2026-06-20). **Commercial pages — pricing,
billing, legal, roadmap, competitor content — belong in the TekMemo Cloud app,
not here**, and are blocked from the OSS docs by `scripts/check-doc-links.mjs`.

**TekMemo Cloud ships at v1 alongside the OSS**, so cloud-client, hosted-MCP,
and sync content is documented here too — not deferred to a separate CMS. Per
[ADR 0008][adr8], every doc claim must be derivable from code/tests/ADRs; when
code and docs disagree, code wins and the doc is the bug. The drift worklist
lives in [`docs/architecture/docs-drift-triage.md`][triage].

[adr8]: https://github.com/tekbreed/tekmemo/blob/main/docs/adr/0008-docs-information-architecture.md
[triage]: https://github.com/tekbreed/tekmemo/blob/main/docs/architecture/docs-drift-triage.md

> **Note on repeated content:** shared prose (install snippets, the OSS-vs-Cloud
> framing, canonical-files tables) lives under `apps/docs/includes/` and is pulled
> in via VitePress markdown includes — copy-paste is a defect waiting to
> desynchronize. See ADR 0008 Rule 4.

## Commands

```bash
pnpm --filter @tekbreed/docs dev
pnpm --filter @tekbreed/docs build
pnpm --filter @tekbreed/docs preview
pnpm --filter @tekbreed/docs check:links
```
