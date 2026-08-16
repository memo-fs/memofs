---
title: "@memofs/core API Reference"
description: "Comprehensive technical API reference for @memofs/core, @memofs/core/node-fs, and @memofs/core/cloud-client."
---

# `@memofs/core` API Reference

Complete TypeScript API reference for all exported classes, interfaces, types, constants, and functions across the three subpath entry points.

## Subpath Overview

```ts
// 1. Root entry (Worker-safe & environment-agnostic)
import { MemoFS, RemoteBlobMemoryStore, InMemoryMemoryStore } from "@memofs/core";

// 2. Node.js filesystem adapter
import { createNodeMemoFs, createNodeFsMemoryStore, NodeFsMemoryStore } from "@memofs/core/node-fs";

// 3. Cloud replication client
import { createMemoFsCloudClient, createMemoFsCloudClientFromEnv } from "@memofs/core/cloud-client";
```

## 1. Primary Client & Factories

### `createNodeMemoFs(config?: MemoFsConfig): MemoFS`
*(Exported from `@memofs/core/node-fs`)*

Constructs a `MemoFS` instance configured for Node.js. Automatically parses `.memofs/config.json`, instantiates a `NodeFsMemoryStore` at `rootDir`, and configures local embedders if enabled.

```ts
import { createNodeMemoFs } from "@memofs/core/node-fs";

const memofs = createNodeMemoFs({
  rootDir: ".",
  mode: "local",
});
```

### `new MemoFS(config?: MemoFsConfig)`
*(Exported from `@memofs/core`)*

Instantiates the unified MemoFS client. In non-Node environments (Cloudflare Workers, Browsers), an explicit `store` must be provided.

```ts
import { MemoFS, InMemoryMemoryStore } from "@memofs/core";

const memofs = new MemoFS({
  store: new InMemoryMemoryStore(),
  projectId: "proj_123",
  mode: "local",
});
```

## 2. Storage Adapters

### `MemoryStore`
The fundamental 5-method interface required by all MemoFS storage adapters:

```ts
interface MemoryStore {
  read(path: MemoryPath): Promise<string>;
  write(path: MemoryPath, content: string): Promise<void>;
  append(path: MemoryPath, content: string): Promise<void>;
  exists(path: MemoryPath): Promise<boolean>;
  delete(path: MemoryPath): Promise<void>;
}
```

### `NodeFsMemoryStore`
*(Exported from `@memofs/core/node-fs`)*

Node.js POSIX filesystem implementation of `MemoryStore`. Supports directory creation, permissions, symlink traversal guards, and advisory cross-process locking (`.memofs/.lock`).

```ts
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const store = createNodeFsMemoryStore({
  rootDir: "./workspace",
  createRoot: true,
  missingFileBehavior: "throw", // "throw" | "empty"
  disallowSymlinks: true,
  directoryMode: 0o700,
  fileMode: 0o600,
  lock: true,
  lockMaxAgeMs: 3600000,
});
```

### `RemoteBlobMemoryStore`
*(Exported from `@memofs/core`)*

Worker-safe implementation of `MemoryStore` backed by an opaque `BlobClient` (e.g. Cloudflare R2, S3) and a `MetadataStore` (e.g. Turso, SQLite, D1).

```ts
import { RemoteBlobMemoryStore } from "@memofs/core";

const store = new RemoteBlobMemoryStore({
  blobClient: r2BlobClient,
  metadata: tursoMetadataStore,
  rootKey: "project-123",
});
```

### `InMemoryMemoryStore`
*(Exported from `@memofs/core`)*

Testing and ephemeral in-memory implementation of `MemoryStore`.

```ts
import { InMemoryMemoryStore } from "@memofs/core";

const store = new InMemoryMemoryStore({
  ".memofs/memory/core.md": "# Initial Rules\n",
});

const snapshot = store.snapshot();
store.clear();
```

## 3. Provider Contracts

Core protocol contracts are strictly provider-neutral:

### `MemoryEmbedder`
```ts
interface MemoryEmbedder {
  readonly name: string;
  readonly dimension: number;
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}
```

### `Reranker`
```ts
interface Reranker {
  rerank(input: {
    query: string;
    documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>;
    topK?: number;
  }): Promise<Array<{ id: string; text: string; score: number; rank: number; metadata?: Record<string, unknown> }>>;
}
```

### `Extractor`
```ts
interface Extractor {
  readonly name: string;
  extract(input: {
    text: string;
    sourceRef?: GraphSourceRef;
    defaultNodeType?: GraphNodeType;
    maxFacts?: number;
    mode?: "fast" | "balanced" | "quality";
  }): Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    contradictions?: Array<{ from: string; to: string; type: string }>;
    model?: string;
    usage?: { promptTokens?: number; totalTokens?: number };
  }>;
}
```

### `LlmClient`
```ts
interface LlmClient {
  readonly name: string;
  complete(input: {
    system?: string;
    user: string;
    schema?: JsonObject;
    mode?: "fast" | "balanced" | "quality";
  }): Promise<{
    text: string;
    structured?: JsonObject;
    model?: string;
    usage?: { promptTokens?: number; totalTokens?: number };
  }>;
}
```

### `MemoFSMemoryRuntime`
Framework-neutral runtime contract implemented by AI framework adapters (Vercel AI SDK, LangChain, Mastra):

```ts
interface MemoFSMemoryRuntime {
  readCoreMemory(signal?: AbortSignal): Promise<{ content: string; updatedAt?: string; version?: number }>;
  updateCoreMemory(input: { content: string }, signal?: AbortSignal): Promise<{ content: string; updatedAt?: string; version?: number }>;
  listNotes(input?: MemoryRuntimeListNotesInput, signal?: AbortSignal): Promise<MemoryRuntimePage<MemoryRuntimeNote>>;
  createNote(input: MemoryRuntimeCreateNoteInput, signal?: AbortSignal): Promise<MemoryRuntimeNote>;
  recall(input: MemoryRuntimeRecallInput, signal?: AbortSignal): Promise<MemoryRuntimeRecallResult>;
  index?(input?: MemoryRuntimeIndexInput, signal?: AbortSignal): Promise<MemoryRuntimeIndexResult>;
}
```

## 4. Graph Engine & Consolidation

### `GraphStore`
```ts
interface GraphStore {
  upsertNodes(nodes: GraphNode[]): Promise<StoredGraphNode[]>;
  upsertEdges(edges: GraphEdge[]): Promise<StoredGraphEdge[]>;
  getNode(id: string): Promise<StoredGraphNode | undefined>;
  getEdge(id: string): Promise<StoredGraphEdge | undefined>;
  queryNodes(query?: GraphNodeQuery): Promise<StoredGraphNode[]>;
  queryEdges(query?: GraphEdgeQuery): Promise<StoredGraphEdge[]>;
  neighbors(query: GraphNeighborQuery): Promise<GraphNeighbor[]>;
  fewestHopsPath(query: GraphShortestPathQuery): Promise<GraphPath | undefined>;
  weightedShortestPath(query: GraphShortestPathQuery): Promise<GraphPath | undefined>;
  mergeNodes(input: GraphMergeNodesInput): Promise<StoredGraphNode>;
  decayEdges(input: GraphDecayInput): Promise<{ updated: number; deleted: number }>;
  deleteNode(id: string, options?: { cascadeEdges?: boolean }): Promise<boolean>;
  deleteEdge(id: string): Promise<boolean>;
  clear(): Promise<void>;
  stats(): Promise<GraphStats>;
  exportSnapshot(): Promise<GraphSnapshot>;
  importSnapshot(snapshot: GraphSnapshot, options?: { clear?: boolean }): Promise<void>;
}
```

### Graph Functions
- `createRuleBasedExtractor(): Extractor`: Creates zero-dependency rule-based extractor.
- `consolidateGraph(input: ConsolidationInput): ConsolidationResult`: Computes pure consolidation plan.
- `applyConsolidation(store: ConsolidationStore, plan: ConsolidationResult): Promise<{ mergesApplied: number; retirementsApplied: number }>`: Persists consolidation plan.
- `resolveCurrentFacts(options)`: Filters active facts for temporal validity.
- `expandFromEntities(input)`: Graph traversal starting from seed entities.

## 5. Security & Write Intelligence

- `classifyDurability(input: DurabilityInput): DurabilityDecision`: Evaluates whether a memory is `"durable"` or `"transient"`.
- `detectBlockedContent(text: string): BlocklistViolation[]`: Pure scanner detecting secret patterns.
- `containsBlockedContent(text: string): boolean`: Quick boolean secret check.
- `assertWriteAllowed(texts: string[], path?: string): void`: Throws `MemoryWriteBlockedError` if secrets are found.
- `redactSecrets(message: string): string`: Redacts credentials from log and error strings.

## 6. Standalone Cloud Client

*(Exported from `@memofs/core/cloud-client`)*

```ts
import {
  createMemoFsCloudClient,
  createMemoFsCloudClientFromEnv,
  createProjectScopedClient,
} from "@memofs/core/cloud-client";

const cloud = createMemoFsCloudClient({
  baseUrl: "https://memofs.dev/api/v1",
  apiKey: "tm_live_...",
  defaultProjectId: "proj_123",
});

const pushRes = await cloud.sync.push({ manifest: localManifest });
const commitRes = await cloud.sync.complete({ cursor: pushRes.cursor, uploaded: [] });
const pullRes = await cloud.sync.pull({ manifest: localManifest });
const statusRes = await cloud.sync.status();
```

## 7. Constants & Enums

```ts
// Canonical Path Constants
export const MEMOFS_DIR = ".memofs";
export const MANIFEST_PATH = ".memofs/manifest.json";
export const CORE_MEMORY_PATH = ".memofs/memory/core.md";
export const NOTES_MEMORY_PATH = ".memofs/memory/notes.md";
export const MEMORY_EVENTS_PATH = ".memofs/events/memory-events.jsonl";
export const CONVERSATIONS_MEMORY_PATH = ".memofs/events/conversations.jsonl";
export const CHUNKS_INDEX_PATH = ".memofs/indexes/chunks.jsonl";
export const EMBEDDINGS_INDEX_PATH = ".memofs/indexes/embeddings.jsonl";
export const GRAPH_NODES_PATH = ".memofs/graph/nodes.jsonl";
export const GRAPH_EDGES_PATH = ".memofs/graph/edges.jsonl";
export const SNAPSHOTS_INDEX_PATH = ".memofs/snapshots/snapshots.jsonl";
export const CONNECTORS_PATH = ".memofs/connectors.json";

// Taxonomy & Thresholds
export const TASK_TYPES = ["coding", "debug", "refactor", "docs", "general"] as const;
export const SESSION_OUTCOMES = ["success", "failure", "aborted"] as const;
export const TRANSIENT_CONFIDENCE_THRESHOLD = 0.4;
export const TRANSIENT_CONTENT_MIN_LENGTH = 20;
export const EXPIRY_DAYS = {
  decision: 365,
  constraint: 180,
  reference: 180,
  goal: 120,
  preference: 90,
  summary: 60,
  note: 30,
} as const;
```

## 8. Error Hierarchy

```
MemoFsError (Base error)
├── MemoryPathError (Invalid path / traversal attempt)
├── MemoryNotFoundError (File or asset not found)
├── MemoryValidationError (Schema / data validation error)
├── MemoryParseError (JSON / JSONL parse failure)
├── MemoryCommandError (Command execution failure)
├── MemoryStoreError (Storage driver failure)
│   └── FsMemoryStoreError (Node filesystem error)
│       └── LockHeldError (Advisory .lock held by another process)
├── MemoryWriteBlockedError (Secret blocklist hard rejection)
├── GraphError
│   ├── GraphValidationError
│   └── GraphNotFoundError
├── RerankError
│   └── RerankValidationError
└── MemoFSCloudError
    ├── MemoFsCloudAuthError (401)
    ├── MemoFSCloudPermissionError (403)
    ├── MemoFsCloudValidationError (400, 422)
    ├── MemoFSCloudRateLimitError (429)
    ├── MemoFSCloudNotFoundError (404)
    ├── MemoFSCloudConflictError (409)
    ├── MemoFSCloudServerError (>= 500)
    ├── MemoFSCloudNetworkError
    └── MemoFSCloudTimeoutError
```
