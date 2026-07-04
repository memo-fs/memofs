# TekMemo Core Package Notes (`@tekmemo/core`)

> **Scope:** this document covers the **core** `@tekmemo/core` package only.
> For the full product architecture (9 published packages, cloud, adapters), see
> [`docs/CONTEXT.md`](./CONTEXT.md).

TekMemo ships as multiple focused packages under the `@tekmemo/` scope (see
[`CONTEXT.md` → Key entry points](./CONTEXT.md#key-entry-points) and the
[README packages table](../README.md#packages)). The **core** package is
`@tekmemo/core`. Framework-specific integrations, embedder/reranker
adapters, and connectors live in their own published packages following the
adapter pattern (e.g. `@tekmemo/adapter-ai-sdk`,
`@tekmemo/adapter-openai`).

## Core Package Shape

Install the core package:

```bash
pnpm add @tekmemo/core
```

Import core capabilities directly from the root entrypoint:

```ts
import {
  bootstrapMemoryStore,
  createNodeFsMemoryStore,
  InMemoryMemoryStore,
  Tekmemo
} from "@tekmemo/core";
```

Do not introduce public subpath imports on core (e.g., `@tekmemo/core/fs`,
`@tekmemo/core/graph`). All core public capabilities must be re-exported in
`packages/core/src/index.ts`. Add new capabilities as internal modules under
`packages/core/src/<module>/`.

Provider-specific integrations (AI SDK, OpenAI embeddings, Voyage reranker, etc.)
belong in **adapter packages**, not in core — per AGENTS.md ("Core protocol
contracts must be provider-neutral") and ADR 0007.

## Canonical Local Protocol

The canonical local memory root is:

```txt
.tekmemo/
  manifest.json
  connectors.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

The root `@tekmemo/core` API owns the protocol constants, validation,
document types, event types, chunk records, snapshot records, and
provider-neutral contracts. Storage and provider modules implement those
contracts without changing the protocol.

## Boundary Rules

- **Core Contracts**: The core protocol contracts must stay provider-neutral.
  They should not own filesystem persistence, model-provider API calls,
  vector-provider calls, billing, hosted product policy, or closed-source cloud
  infrastructure.
- **Filesystem Storage (NodeFs)**: Owns Node.js filesystem persistence, safe
  root normalization, canonical path resolution, directory creation, atomic
  writes, append serialization, symlink policy, and missing-file behavior.
- **Recall contracts & Vector Store**: Owns provider-neutral vector recall
  contracts, filter semantics, namespace semantics, recall result shape, and
  recall adapter contract tests.
- **Reranking**: Owns provider-neutral reranking contracts, validation,
  deterministic fallback reranking, score normalization, and reranker contract
  tests.
- **Provider Adapters**: Provider adapters (such as OpenAI, VoyageAI, and Voyage
  Rerank) translate TekMemo contracts to provider APIs. They live in their own
  `@tekmemo/adapter-*` packages and should accept credentials from the
  host app — must not store secrets.

## Release Layers

Release in layers so each step produces a usable system:

1. Stabilize core protocol and NodeFs storage.
2. Add AI SDK and AgentFS integration.
3. Add recall contracts, embeddings, and vector adapters.
4. Add reranking contracts and provider rerankers.
5. Add CLI, MCP, graph memory, benchmark tooling, and production hardening.

## Acceptance Gate

A TekMemo capability is not release-ready until:

- ESM and CJS builds are emitted.
- Type declarations are emitted.
- Typecheck passes.
- Unit tests pass.
- Contract tests pass when the capability implements a shared contract.
- Path safety, malformed input, provider failure, and secret-redaction edge
  cases are covered where relevant.
- Public docs use `@tekmemo/core` root imports only (for core APIs).
- package.json exports expose only the root `.` entrypoint.
- `pnpm --filter @tekmemo/core pack:dry-run` contains only publishable
  files.
