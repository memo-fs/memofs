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
