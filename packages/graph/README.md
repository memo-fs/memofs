# `@tekmemo/graph`

Provider-neutral graph memory primitives for TekMemo.

This package adds relationship memory without requiring Neo4j, Turso, Qdrant, Upstash, OpenAI, Voyage, TekMemo Cloud, or any external runtime dependency.

## Why it exists

Vector recall answers:

```txt
What text is semantically close to this query?
```

Graph memory answers:

```txt
Which entities are connected?
Why are they connected?
Which facts came from which source?
Which relationship changed, expired, or superseded another fact?
```

TekMemo needs both because graph memory handles relationship questions that pure vector similarity often misses.

## Package boundary

This package owns:

- graph node and edge contracts
- in-memory graph store
- graph validation
- metadata and source provenance validation
- neighbor traversal
- shortest path search
- node merge
- edge decay
- temporal filtering
- supersession invalidation helpers
- deterministic rule-based extraction
- JSONL parse/serialize helpers
- graph import/export snapshots

It does **not** own:

- filesystem writes to `.tekmemo/`
- vector databases
- embeddings
- reranking
- cloud sync
- auth, billing, tenant logic, or plan checks
- connector fetching
- graph database adapters

## `.tekmemo` fit

The package is designed to back this canonical protocol area:

```txt
.tekmemo/graph/
├─ nodes.jsonl
└─ edges.jsonl
```

A filesystem adapter such as `@tekmemo/fs` should read/write those files. This package only validates, serializes, parses, stores in memory, and queries graph records.

## Install

```bash
pnpm add @tekmemo/graph
```

## Basic usage

```ts
import { createInMemoryGraphStore } from "@tekmemo/graph";

const graph = createInMemoryGraphStore();

await graph.upsertNodes([
  {
    id: "project:tekmemo",
    type: "project",
    label: "TekMemo",
    summary: "File-first memory runtime for AI apps and agents.",
    metadata: { projectId: "proj_1" }
  },
  {
    id: "concept:local-first",
    type: "concept",
    label: "Local-first memory",
    aliases: ["local memory", ".tekmemo files"],
    metadata: { projectId: "proj_1" }
  }
]);

await graph.upsertEdges([
  {
    from: "project:tekmemo",
    to: "concept:local-first",
    type: "uses",
    weight: 0.9,
    directed: true,
    metadata: { projectId: "proj_1" }
  }
]);

const neighbors = await graph.neighbors({
  nodeId: "project:tekmemo",
  direction: "out"
});
```

## Behind the scenes

The in-memory store keeps two maps:

```txt
Map<nodeId, StoredGraphNode>
Map<edgeId, StoredGraphEdge>
```

When an edge does not include an ID, the store creates a deterministic ID from:

```txt
from + type + to + directed
```

That prevents duplicate semantic relationships during repeated ingestion.


## Production safety

The `@tekmemo/graph` package protects your graph memory by rejecting:

- invalid graph IDs
- missing nodes for new edges (when `requireExistingNodes` is enabled)
- self-edges (unless explicitly enabled)
- duplicate IDs within a single batch
- metadata values that are not true JSON values (rejects circular references, `NaN`, `undefined`, functions, etc.)
- unsafe or absolute source reference paths
- malformed JSONL when parsing in strict mode
- traversals that exceed depth or result limits

### Temporal facts

Nodes and edges can use:

```ts
status?: "active" | "deprecated" | "conflicted" | "deleted";
validFrom?: string;
validUntil?: string;
expiresAt?: string;
```

By default, queries skip inactive and expired facts. Pass `includeInactive` or `includeExpired` when inspection tooling needs the full history.

### Provenance

Nodes and edges can include source references:

```ts
sourceRefs: [
  {
    sourceType: "document",
    path: ".tekmemo/memory/core.md",
    span: { start: 120, end: 180 }
  }
]
```

This preserves explainability. TekMemo should never return graph memory without being able to explain where it came from.

### Depth caps

Graph expansion has a default depth and a hard max. This avoids accidental infinite or explosive traversal on dense graphs.

```ts
import { expandFromEntities } from "@tekmemo/graph";

const result = await expandFromEntities({
  store: graph,
  seedNodeIds: ["project:tekmemo"],
  depth: 2,
  limit: 100
});
```

## JSONL helpers

```ts
import {
  serializeGraphNodesJsonl,
  serializeGraphEdgesJsonl,
  parseGraphNodesJsonl,
  parseGraphEdgesJsonl
} from "@tekmemo/graph";
```

Malformed lines throw by default. Inspector tools can use detailed parsing with `onInvalidLine: "skip"`:

```ts
import { parseGraphNodesJsonlDetailed } from "@tekmemo/graph";

const result = parseGraphNodesJsonlDetailed(content, {
  onInvalidLine: "skip"
});

console.log(result.rows);
console.log(result.issues);
```

## Rule-based extraction

This package includes a deterministic extractor for simple structured text. It is intentionally not an LLM extractor.

```ts
import { extractGraphFactsRuleBased } from "@tekmemo/graph";

const facts = extractGraphFactsRuleBased({
  text: "TekMemo -> uses -> Local-first memory",
  sourceRef: {
    sourceType: "document",
    path: ".tekmemo/memory/core.md"
  }
});
```

Supported examples:

```txt
TekMemo -> uses -> Local-first memory
TekMemo depends on TypeScript
User prefers Rust examples
Decision supersedes old pricing model
```

For production LLM extraction, build a separate adapter later. Keep this package provider-neutral.

## Cloud and Provider Neutrality

`@tekmemo/graph` is intentionally provider-neutral and contains no network code. It does not perform cloud calls and does not store provider credentials. It is designed to be wrapped by persistence adapters (like `@tekmemo/fs`) or hosted cloud services that handle long-term storage and LLM-assisted extraction.

