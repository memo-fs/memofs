# `@memofs/core` API

`@memofs/core` provides the `MemoFS` client, provider-neutral contracts, and
runtime-safe memory stores. Start with the [core package guide](../packages/core/)
for setup and runtime boundaries.

## `MemoFS`

```ts
const memo = new MemoFS(config);
```

The client groups document operations under `core`, `notes`, `conversations`,
`graph`, `snapshots`, `agentfs`, and (in hybrid mode) `sync`.

- `memo.core.read()` / `memo.core.update(content)` manage Core Memory.
- `memo.notes.read()` / `memo.notes.record(note)` manage timestamped notes.
- `memo.recall(query, options)` and `memo.context(input)` retrieve memory.
- `memo.writeMemory(input)` records a classified memory entry.
- `memo.snapshots.create()`, `list()`, and `restore(id)` manage checkpoints.
- `memo.validate()`, `memo.consolidate()`, and `memo.health()` provide runtime utilities.

See the [client API guides](../packages/core/client/) for examples and input
details.

## `MemoryStore`

`MemoryStore` is the canonical-file abstraction implemented by filesystem,
in-memory, and remote-blob stores:

- `read(path): Promise<string>`
- `write(path, content): Promise<void>`
- `append(path, content): Promise<void>`
- `exists(path): Promise<boolean>`
- `delete(path): Promise<void>`

## Provider Contracts

- `MemoryEmbedder` implements `embedText` and `embedTexts`.
- `Reranker` reorders retrieval candidates.
- `RecallStore` persists and queries vector documents.
- `Extractor` derives graph entities and edges from text.

## Runtime Helpers

`sha256Hex(value)` returns a `Promise<string>` containing the lowercase
SHA-256 digest of a UTF-8 string. It uses Web Crypto so it works in both Node and Worker environments.

## Code Anchoring

- `AnchorRef` — `{ file: string, hash: string, symbol?: string }`. Binds a memory to a source file for drift detection.
- `computeFileHash(filePath)` — returns `Promise<string>` containing the SHA-256 hex digest of a file's bytes.
- `isSafeAnchorPath(filePath, rootDir)` — validates that an anchor path does not escape the project root (path-traversal guard).
- `resolveWriteAnchor(input)` — resolves an `AnchorRef` from explicit input or `@anchor(file=…, symbol=…)` markers in content.
- `applyAnchorDrift(items, rootDir)` — recall-time post-merge seam; recomputes file hashes and flags stale items (`score *= 0.5`).
- `parseAnchorMarkers(content)` — regex parser for `@anchor(file=…, symbol=…)` markers in memory content.
- `extractSymbolPath(filePath, symbolName)` — uses the TypeScript Compiler API to extract and validate a dotted symbol path from `.ts`/`.tsx` files.

## Memory Decay

- `EXPIRY_DAYS` — `Record<MemoryKind, number>` mapping each of the 7 memory kinds to their expiry threshold in days.
- `isMemoryDecayed(kind, createdAt, now?)` — pure helper returning `true` when a memory exceeds its kind-specific decay floor.
- `applyDecay(items, graphStore)` — recall-time post-merge seam; flags unverified items (`score *= 0.6`).

## Memory Archive

- `memo.archiveDeprecated()` — moves deprecated memories to `.memofs/archive/<id>.json` and removes them from active recall.
- `memo.restoreMemory(id)` — restores an archived memory back to `notes.md` and reactivates its graph nodes.
- `memo.migrateAnchors()` — backfills `AnchorRef` onto existing notes by detecting file-path references.

## Session Outcomes

- `SessionOutcome` — `"success" | "failure" | "aborted"` enum type.
- `SESSION_OUTCOMES` — `["success", "failure", "aborted"]` const array.
- `isSessionOutcome(value)` — type guard for `SessionOutcome`.
- `AgentSessionCompleteInput` — extended with `outcome?`, `ephemeral?`, and `reason?` fields.
- `AgentSessionCompleteResult` — named result type for `complete()`.

## Graph Fact Status

`GraphFactStatus` is a union of six status values: `"active" | "deprecated" | "conflicted" | "deleted" | "stale" | "unverified"`.

## Memory Event Types

`MemoryEventType` includes `"memory.archived"`, `"memory.restored"`, and `"session.failed"` in addition to the existing event types.
