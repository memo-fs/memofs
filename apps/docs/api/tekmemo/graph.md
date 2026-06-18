# Graph Memory Module

The graph memory module of `@tekbreed/tekmemo` provides the engine and storage structure for managing entities (nodes) and their relationships (edges).

## Import

```ts
import { createInMemoryGraphStore } from "@tekbreed/tekmemo";
```

## Core Concepts

- **Nodes:** Represent discrete entities like a `Decision`, `File`, or `Requirement`.
- **Edges:** Represent the relationships between nodes, such as `depends_on`, `implements`, or `supersedes`.
- **JSONL Storage:** Nodes and edges are stored as JSON Lines for easy appending and stream-parsing.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class exposes graph operations through `memo.graph`:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Create nodes
await memo.graph.upsertNodes({
  nodes: [
    { id: "node_1", type: "decision", label: "Use D1 Database", metadata: { status: "accepted" } },
    { id: "node_2", type: "decision", label: "Use Tailwind CSS" },
  ],
});

// Create edges
await memo.graph.upsertEdges({
  edges: [
    { source: "node_1", target: "node_2", type: "relates_to" },
  ],
});

// Query neighbors
const neighbors = await memo.graph.neighbors({ id: "node_1" });
console.log(`Found ${neighbors.items.length} connected entities.`);

// Find shortest path
const path = await memo.graph.path({ source: "node_1", target: "node_2" });
```

## API Reference

### `Tekmemo.graph` methods

| Method | Purpose |
| --- | --- |
| `memo.graph.upsertNodes(input)` | Create or update graph nodes. |
| `memo.graph.upsertEdges(input)` | Create or update graph edges. |
| `memo.graph.neighbors(input)` | Find adjacent nodes connected to a specific node. |
| `memo.graph.path(input)` | Find the shortest path between two nodes. |
| `memo.graph.listNodes(input)` | Paginate through graph nodes. |
| `memo.graph.listEdges(input)` | Paginate through graph edges. |

### Low-level store helpers

| Helper | Purpose |
| --- | --- |
| `createInMemoryGraphStore(options?)` | Initializes a fast, in-memory graph store (for tests/custom use). |
| `parseGraphNodesJsonl(content)` | Parses raw JSONL text into `GraphNode` objects. |
| `parseGraphEdgesJsonl(content)` | Parses raw JSONL text into `GraphEdge` objects. |
| `expandFromEntities(store, ids, options)` | Traverses the graph to find a neighborhood of related nodes. |
| `extractGraphFactsRuleBased(input)` | Extracts nodes and edges from text using configured rules. |

## Direct usage (advanced)

For standalone graph operations outside of `Tekmemo`:

```ts
import { createInMemoryGraphStore } from "@tekbreed/tekmemo";

const store = createInMemoryGraphStore();

await store.nodes.create({ id: "node_1", type: "decision", label: "Use D1 Database" });
const neighbors = await store.neighbors({ id: "node_1" });
```

## Use Cases

- **Impact Analysis:** See what parts of the system are affected by a change.
- **Architectural Discovery:** Help agents understand how different decisions relate to each other.
- **Context Grounding:** Provide a "neighborhood" of relevant facts to an LLM instead of a flat list.
