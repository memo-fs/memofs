# `@tekmemo/core` API

The `@tekmemo/core` package provides the unified `Tekmemo` client and baseline runtime engine.

## Classes

### `Tekmemo`
The central manager orchestrating all storage axes and intelligence roles.

#### Constructor

```ts
const memo = new Tekmemo(config?: TekmemoConfig);
```

#### Methods

- **`read(input: ReadMemoryInput): Promise<MemoryDocumentResult>`**
- **`write(input: WriteMemoryInput): Promise<WriteMemoryResult>`**
- **`recall(input: RecallInput): Promise<RecallResult>`**
- **`snapshot.create(): Promise<SnapshotMemoryResult>`**
- **`snapshot.restore(input: RestoreSnapshotInput): Promise<void>`**

---

## Interfaces

### `MemoryStore`
The abstraction representing the file replica layer (AgentFS). Custom storage adapters (like R2) implement this interface.

- `read(path: string): Promise<string>`
- `write(path: string, content: string): Promise<void>`
- `delete(path: string): Promise<void>`
- `exists(path: string): Promise<boolean>`
- `list(prefix?: string): Promise<string[]>`

### `MemoryEmbedder`
Generates vector representations for text.
- `embed(texts: string[]): Promise<EmbeddingRecord[]>`

### `Reranker`
Reorders retrieval results by relevance.
- `rerank(input: RerankInput): Promise<RerankResult>`
