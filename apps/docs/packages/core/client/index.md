# Client API Reference

The `MemoFS` class is the central entry point for all memory operations in your application.

```ts
import { MemoFS } from "@memofs/core";
```

## Constructor

Instantiates a new unified client:

```ts
const memo = new MemoFS(config?: MemoFsConfig);
```

### Configuration Options (`MemoFsConfig`)

| Option | Type | Default | Description |
|---|---|---|---|
| `store` | `MemoryStore` | (Required) | Memory store adapter (filesystem or in-memory). |
| `mode` | `MemoFSRuntimeMode` | `"local"` | Runtime mode: `"local" \| "hybrid"`. |
| `projectId` | `string` | `undefined` | Unique identifier for the project workspace. |
| `cloud` | `MemoFsCloudOptions` | `undefined` | Cloud client config (`baseUrl`, `apiKey`) for hybrid sync. |
| `embedder` | `MemoryEmbedder` | `undefined` | Vector embedding client. |
| `reranker` | `Reranker` | `undefined` | Hybrid search results reranker. |
| `extractor` | `Extractor` | `undefined` | Entity/relationship graph extractor. |
| `llmClient` | `LlmClient` | `undefined` | Provider-neutral LLM client. |