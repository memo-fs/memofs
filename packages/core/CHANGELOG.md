# @memofs/core

## Unreleased

### Minor Changes

- Fused the hybrid recall merge: lexical and vector candidate sets now join by memory id, so a memory surfaced by both retrieval paths scores as one candidate with a gated double-hit bonus (`0.6·v + 0.4·l + 0.25·min(v,l)`, clamped to 1) instead of two half-scored siblings. Single-path hits pass through with the dynamic weight collapse to a full-weight single path.
- Consolidated reranker input to one candidate per memory (best-chunk evidence), so a memory chunked into N pieces gets exactly one recall list entry carrying the strongest chunk's text and merged metadata.
- Added `HYBRID_SCORING_DEFAULTS` and `HYBRID_SINGLE_PATH_WEIGHTS` as frozen, named single-source-of-truth constants for every tuning literal in the scoring path.
- Added a one-time maintenance scrub on first hydration: embedding rows whose `sourceId` predates recall-document identity unification (write timestamps instead of memory ids) are dropped once, recorded via the new optional `maintenance.legacyEmbeddingsScrubbedAt` manifest timestamp so the pass never repeats. The scrub is bounded to `note`-source rows, never touches connector or document indexes, and fails closed (no-op, flag unset) when no memory ids could be hydrated.
- Added optional, feature-detected `listDocuments()` to the `RecallStore` port (implemented by the in-memory and file-backed stores) to enumerate embedding rows without loading embeddings.
- Switched the default local embedding model from `Xenova/all-MiniLM-L6-v2` to `Xenova/bge-small-en-v1.5` (same 384 dimensions, stronger retrieval quality). The default now lives in one exported constant — `DEFAULT_LOCAL_EMBEDDING_MODEL` on `@memofs/core` — shared by the lazy local embedder, resolved config, and the Transformers.js adapter so the three default sites cannot drift.
- Added asymmetric instruction-prefix support for instruction-tuned model families. `EmbedTextsInput` gains `purpose: "query" | "document"` and `MemoryEmbedder` gains an optional `embedQuery()`; the adapter applies the model family's prefixes automatically (`bge` queries get `Represent this sentence for searching relevant passages: `, `e5` gets `query:`/`passage:`, `nomic` gets `search_query:`/`search_document:`). Symmetric models (`all-MiniLM`, `gte`) are unchanged, and returned records always carry the caller's original text. Hybrid recall now embeds queries through `embedQuery` when the embedder provides it.
- Added a cross-model vector guard: chunks are stamped with their producing model in `metadata.model` at index time, and vector queries filter to chunks from the same model as the query embedder. Vectors from different models live in incomparable spaces, so chunks embedded by a previous default model (or unstamped legacy rows) drop out of the vector path instead of polluting scores — lexical (BM25) recall still surfaces them until they are re-written.

## 1.3.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.2

### Minor Changes

- Added `id?: string` as a first-class typed property on `TimestampedNote` and `ConversationEntry` document interfaces.
- Added frontmatter and metadata normalization and serialization support for note identifiers in `normalizeTimestampedNote` and `formatTimestampedNote`.
- Added `idempotencyKey?: string` to `WriteMemoryInput` with runtime deduplication in `writeMemory()`, returning `{ created: false }` without redundant appends to `notes.md` or `memory-events.jsonl` when duplicate keys or existing IDs are provided.
- Added orthogonal status dimensions (`disputed?: boolean`, `stale?: boolean`, `unverified?: boolean`) to `GraphNode`, `GraphEdge`, `GraphNodeInput`, and `GraphEdgeInput` to prevent semantic collisions across temporal deprecation, dispute, code drift, and time decay.
- Updated `markConflictingEdges()` to set `disputed: true` alongside `status: "conflicted"`.

## 1.3.0-beta.1

### Minor Changes

- Added anchor reference support with file paths, hashes, and optional symbols to memory write inputs and prose content via anchor markers.
- Added write-time symbol path extraction for TypeScript files using the TypeScript Compiler API with path traversal security validation.
- Added query-time drift detection inside memory recall and context building. Memories with modified or deleted target files transition to stale status, receive a stale flag on recall items, and get demoted in search relevance with a half score multiplier.
- Added manifest hash caching with modification time invalidation and persistence for cross-session drift checks.
- Added kind-specific decay floors for all seven memory kinds ranging from 30 days for notes to 365 days for decisions.
- Added unverified status for graph facts. Active memories exceeding their decay floor transition to unverified status, set an unverified metadata flag on recall items, and receive a score demotion while remaining accessible for re-verification.
- Added outcome parameters indicating success, failure, or aborted status, ephemeral cleanup flags, and failure reason inputs to session completion functions.
- Implemented a five-row outcome matrix that gates durable memory promotion on successful outcome and durable memory extraction, while governing working and output directory cleanup.
- Added support for session resumption across aborted completions by preserving workspace state.
- Added session failure audit event logging with failure reason telemetry.

## 1.2.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.2

### Patch Changes

- Improved project ID resolution so local workspace operations automatically fall back to the project manifest when omitted in configuration or flags.

## 1.2.0-beta.1

### Minor Changes

- Reduced memory growth during long-running sessions by capping internal caches.
- Improved consistency between search and ranking so results match more reliably.
- Improved search relevance for headings made up of multiple words.
- Improved recall so results aren't held back when only one search method (keyword or vector) finds matches.
- Improved reliability of context building across more JavaScript runtimes, including web workers.
- Added optional logging for background operations like indexing and graph updates, to make debugging easier.
- The recall pipeline now automatically resolves the appropriate recall store without requiring manual configuration.

### Patch Changes

- Fixed a rare bug where two memory graph nodes could collide and silently overwrite each other.
- Fixed a rare bug where two snapshots created in quick succession could end up with the same ID.
- Fixed an issue where a failed write could leave the memory graph in a partially updated state instead of rolling back cleanly.
- Fixed a file-locking bug on macOS that could stall under heavy load.
- Fixed entity matching so short terms like `db` no longer incorrectly match unrelated longer words.
- Fixed an issue where combining results from different memory sources could drop metadata.

## 1.1.0-beta.1

### Minor Changes

- Improved compatibility so core hashing now works in more JavaScript environments, including web workers.

### Patch Changes

- Fixed an issue where restarting could cause previously saved memory and graph data to appear lost.
- Fixed file-locking bugs that could cause conflicts between concurrent sessions.
- Fixed a bug where missing remote data could silently corrupt a saved record instead of raising an error.
- Fixed an issue where a failed memory write could be incorrectly reported as successful.

## 1.0.0-beta.2

### Minor Changes

- A file-first memory runtime — memory lives in your local workspace as the source of truth, not a database.
- A virtual filesystem for project memory, with separate working and output areas.
- A hybrid recall pipeline combining keyword, fuzzy, and vector search with pluggable embedders and rerankers.
- Durable graph memory with nodes, edges, versioned snapshots, and conflict-free writes.
- Support for pluggable embedders, rerankers, recall stores, extractors, and LLM clients.
- A local filesystem-backed memory store for production use, and an in-memory store for testing.
