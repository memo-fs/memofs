<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-server"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo-server?label=%40tekbreed%2Ftekmemo-server&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-server"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo-server?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

# `@tekbreed/tekmemo-server`

## What is this?

**The OSS-deployable hosted-memory server for TekMemo.** Runs the *same* memory
engine TekMemo Cloud runs, over a memory store you bring, with **no provider
hardcoding**. TekMemo Cloud runs this package as its runtime worker; you can run
the identical code on your own infra as a single Node process — the only
difference is which adapters you inject (ADR 0003 / ADR 0013).

Bring your own blob store, metadata store, embedder, reranker, extractor, and LLM
client. No vendor lock-in. No TekMemo Cloud dependency.

## Installation

```bash
npm install @tekbreed/tekmemo-server
```

## Quick Start

```ts
import { createHostedRuntime } from "@tekbreed/tekmemo-server";
import {
  InMemoryMemoryStore,
} from "@tekbreed/tekmemo";

const tek = createHostedRuntime({
  // The only required slot: the memory store (your file replica).
  store: new InMemoryMemoryStore(),
  projectId: "my-project",

  // Optional intelligence slots — each runs its deterministic default
  // when omitted (lexical recall, rule-based extraction, no LLM tier).
  // Inject a provider adapter to upgrade a slot.
  embedder: yourEmbedder,
  reranker: yourReranker,
  extractor: yourExtractor,
  llmClient: yourLlmClient,
});

await tek.writeMemory({ content: "self-hosted runtime runs the engine" });
const hits = await tek.recall("self-hosted");
```

## The one required slot: `store`

A memory runtime needs files to read and write. That is the `store` — your
memory store (the file replica). TekMemo Cloud builds it from Cloudflare R2 +
Turso; you build it from whatever you run (S3 + Postgres, GCS + D1, or anything
else that implements `MemoryStore`). There is no default to fall back on.

## Deterministic defaults, adapter-enhanced

Every intelligence slot is optional. When you omit one, the runtime runs its
**deterministic default**:

| Slot | Omitted default | Upgrade |
|---|---|---|
| `embedder` | Lexical-only recall (BM25 + fuzzy) | Inject for hybrid (vector) recall |
| `reranker` | Lexical token-overlap reranker | Inject for semantic reranking |
| `extractor` | Rule-based graph extractor | Inject for frontier extraction |
| `llmClient` | No LLM tier (regex/deterministic strategist) | Inject for LLM-enhanced intelligence |

The same runtime works zero-config or fully enhanced. Inject only what you need.

## Boundary

This package assembles a `Tekmemo` instance from adapters you provide. It never
reads environment variables, never imports an adapter package, and never hardcodes
a provider. The store and provider choices belong to you (or to the cloud, when
it consumes this same factory).

## Status

Slice 0 (this release) ships the provider-neutral factory plus the `LlmClient`
core contract. The HTTP surface (`recall`, `context`, `graph`, `memory` over
JSON-RPC) lands in the next slice. See the
[execution plan](https://github.com/tekbreed/tekmemo/blob/main/docs/architecture/s3-execution-plan.md)
for the roadmap.

## License

[MIT](./LICENSE)
