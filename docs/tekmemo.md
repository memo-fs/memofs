# TekMemo Project Notes

TekMemo is the first project family in TekBreed OSS. It is published as one npm package, `@tekbreed/tekmemo`, with all public APIs exported directly from the root entrypoint instead of separate adapter packages or public subpath imports.

## Public Package Shape

Install the package:

```bash
pnpm add @tekbreed/tekmemo
```

Import everything directly from the root entrypoint:

```ts
import { 
  bootstrapMemoryStore, 
  createNodeFsMemoryStore, 
  createOpenAIEmbedder,
  InMemoryMemoryStore
} from "@tekbreed/tekmemo";
```

Do not introduce public subpath imports (e.g., `@tekbreed/tekmemo/fs`, `@tekbreed/tekmemo/openai`). All public capabilities must be re-exported in `packages/tekmemo/src/index.ts`. Add new capabilities as internal modules under `packages/tekmemo/src/<module>/`.

## Canonical Local Protocol

The canonical local memory root is:

```txt
.tekmemo/
  manifest.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

The root `@tekbreed/tekmemo` API owns the protocol constants, validation, document types, event types, chunk records, snapshot records, and provider-neutral contracts. Storage and provider modules implement those contracts without changing the protocol.

## Boundary Rules

- **Core Contracts**: The core protocol contracts must stay provider-neutral. They should not own filesystem persistence, model-provider API calls, vector-provider calls, billing, hosted product policy, or closed-source cloud infrastructure.
- **Filesystem Storage (NodeFs)**: Owns Node.js filesystem persistence, safe root normalization, canonical path resolution, directory creation, atomic writes, append serialization, symlink policy, and missing-file behavior.
- **Recall contracts & Vector Store**: Owns provider-neutral vector recall contracts, filter semantics, namespace semantics, recall result shape, and recall adapter contract tests.
- **Reranking**: Owns provider-neutral reranking contracts, validation, deterministic fallback reranking, score normalization, and reranker contract tests.
- **Provider Adapters**: Provider adapters (such as OpenAI, VoyageAI, Upstash Vector, and Voyage Rerank) translate TekMemo contracts to provider APIs. They should accept credentials from the host app and must not store secrets.

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
- Path safety, malformed input, provider failure, and secret-redaction edge cases are covered where relevant.
- Public docs use `@tekbreed/tekmemo` root imports only.
- package.json exports expose only the root `.` entrypoint.
- `pnpm --filter @tekbreed/tekmemo pack:dry-run` contains only publishable files.
