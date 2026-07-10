# MemoFS Core Package Notes (`@memofs/core`)

> **Scope:** this document covers the **core** `@memofs/core` package only.
> For the full product architecture (9 published packages, cloud, adapters), see
> [`docs/CONTEXT.md`](./CONTEXT.md).

MemoFS ships as multiple focused packages under the `@memofs/` scope (see
[`CONTEXT.md` → Key entry points](./CONTEXT.md#key-entry-points) and the
[README packages table](../README.md#packages)). The **core** package is
`@memofs/core`. Framework-specific integrations, embedder/reranker
adapters, and connectors live in their own published packages following the
adapter pattern (e.g. `@memofs/adapter-ai-sdk`,
`@memofs/adapter-openai`).

## Core Package Shape

Install the core package:

```bash
pnpm add @memofs/core
```

Import core capabilities directly from the root entrypoint:

```ts
import {
  bootstrapMemoryStore,
  createNodeFsMemoryStore,
  InMemoryMemoryStore,
  Memofs
} from "@memofs/core";
```

Do not introduce public subpath imports on core (e.g., `@memofs/core/fs`,
`@memofs/core/graph`). All core public capabilities must be re-exported in
`packages/core/src/index.ts`. Add new capabilities as internal modules under
`packages/core/src/<module>/`.

Provider-specific integrations (AI SDK, OpenAI embeddings, Voyage reranker, etc.)
belong in **adapter packages**, not in core — per AGENTS.md ("Core protocol
contracts must be provider-neutral") and ADR 0007.

## Canonical Local Protocol

The canonical local memory root is:

```txt
`.memofs/`
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

The root `@memofs/core` API owns the protocol constants, validation,
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
  Rerank) translate MemoFS contracts to provider APIs. They live in their own
  `@memofs/adapter-*` packages and should accept credentials from the
  host app — must not store secrets.

## Release Layers

Release in layers so each step produces a usable system:

1. Stabilize core protocol and NodeFs storage.
2. Add AI SDK and AgentFS integration.
3. Add recall contracts, embeddings, and vector adapters.
4. Add reranking contracts and provider rerankers.
5. Add CLI, MCP, graph memory, benchmark tooling, and production hardening.

## Acceptance Gate

A MemoFS capability is not release-ready until:

- ESM and CJS builds are emitted.
- Type declarations are emitted.
- Typecheck passes.
- Unit tests pass.
- Contract tests pass when the capability implements a shared contract.
- Path safety, malformed input, provider failure, and secret-redaction edge
  cases are covered where relevant.
- Public docs use `@memofs/core` root imports only (for core APIs).
- package.json exports expose only the root `.` entrypoint.
- `pnpm --filter @memofs/core pack:dry-run` contains only publishable
  files.
