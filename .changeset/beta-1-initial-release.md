---
"@memofs/core": major
"@memofs/json-rpc": major
"@memofs/mcp-server": major
"@memofs/server": major
"@memofs/connectors": major
"@memofs/benchmark-kit": major
"@memofs/testing": major
"@memofs/adapter-ai-sdk": major
"@memofs/adapter-openai": major
"@memofs/adapter-r2": major
"@memofs/adapter-transformers": major
"@memofs/adapter-turso": major
"@memofs/adapter-voyage": major
"@memofs/adapter-workers-ai": major
"@memofs/cli": major
---

# MemoFS 1.0.0-beta.2 — Initial OSS publication

First public release of the MemoFS workspace to npm. 15 packages, published together at `1.0.0-beta.2`. All packages are tagged with the `beta` npm dist-tag during the beta period.

## Highlights

- **`@memofs/core`** — the file-first memory runtime, with a local filesystem store, graph memory, recall engine (lexical, vector, hybrid, auto), cloud client contracts, and a single `MemoFS` client class.
- **`@memofs/cli`** — the CLI for local + cloud memory workflows.
- **`@memofs/server`** — self-hostable runtime over `node:http` and a Cloudflare Worker entry point.
- **`@memofs/mcp-server`** — a Model Context Protocol server exposing the core engine as tools.
- **`@memofs/connectors`** — the local connector framework with first-party GitHub and Notion connectors and three secret resolver strategies.
- **`@memofs/benchmark-kit`** — reusable benchmark workloads, runners, stats, thresholds, and reporters.
- **`@memofs/testing`** — contract tests, fakes, and fixtures shared across the workspace and available to adapter authors.
- **Adapters** — `@memofs/adapter-ai-sdk`, `-openai`, `-voyage`, `-transformers`, `-r2`, `-turso`, `-workers-ai` for the AI SDK, hosted AI providers, and storage backends.

## Stability

This is a **beta**. The public surface is intended to be stable through `1.0.0`, but the `beta` tag signals that:

- Breaking changes are still possible in response to real-world feedback.
- The `server` package ships with a documented write-gate (mutating methods return 503) — these are not half-implementations, they are a deliberate v1 read-by-default contract.
- A few adapter subpaths (`/testing`, `/workloads`, `/fakes`) are introduced in this beta and may evolve.

## Brand

This release uses the `MemoFS` brand across LICENSE files, READMEs, URLs, package identifiers, and the `.memofs/` memory folder. Older references to `TekMemo`, `TekBreed`, `@tekmemo/*`, `tekmemo-mcp`, and `.tekmemo/` are no longer valid.

## Install

```bash
npm install @memofs/core
npm install @memofs/cli
npm install @memofs/mcp-server
npm install @memofs/adapter-openai
# ...etc
```

Documentation: https://docs.memofs.dev
