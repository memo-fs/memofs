# MemoFS Docs App

Developer documentation for the MemoFS OSS workspace.

## Scope

This VitePress app documents the MemoFS OSS workspace:

- `@memofs/core` (core runtime, filesystem store, agentfs, graph memory, vector/provider adapters, reranking, benchmarks)
- `memofs` (CLI distribution)
- `@memofs/mcp-server` (Model Context Protocol server)
- examples and architecture

It also hosts the engineering blog (`/blog/`), changelog (`/changelog/`), and
FAQs (`/faqs/`) — engineering content lives where developers already read it
(per the ADR 0008 docs-IA decision, 2026-06-20). **Commercial pages — pricing,
billing, legal, roadmap, competitor content — belong in the MemoFS Cloud app,
not here**, and are blocked from the OSS docs by `scripts/check-doc-links.mjs`.

**MemoFS Cloud ships at v1 alongside the OSS**, so cloud-client, hosted-MCP,
and sync content is documented here too — not deferred to a separate CMS. Per
[ADR 0008][adr8], every doc claim must be derivable from code/tests/ADRs; when
code and docs disagree, code wins and the doc is the bug. The drift worklist
lives in [`docs/architecture/docs-drift-triage.md`][triage].

[adr8]: https://github.com/memo-fs/memofs/blob/main/docs/adr/0008-docs-information-architecture.md
[triage]: https://github.com/memo-fs/memofs/blob/main/docs/architecture/docs-drift-triage.md

> **Note on repeated content:** shared prose (install snippets, the OSS-vs-Cloud
> framing, canonical-files tables) lives under `apps/docs/includes/` and is pulled
> in via VitePress markdown includes — copy-paste is a defect waiting to
> desynchronize. See ADR 0008 Rule 4.

## Commands

```bash
pnpm --filter @memofs/docs dev
pnpm --filter @memofs/docs build
pnpm --filter @memofs/docs preview
pnpm --filter @memofs/docs check:links
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_PLUNK_PUBLIC_KEY` | optional | Plunk **public** key (`pk_…`) for the newsletter signup on the blog and changelog. Vite inlines it at build time. When unset, the signup form renders disabled. The public key is scoped to Plunk's `/v1/track` endpoint and is safe to ship in client code. |
