# Graph Memory Module

The graph memory module of `@tekbreed/tekmemo` provides the engine and storage structure for managing entities (nodes) and their relationships (edges).

## Import

All graph memory APIs are imported directly from `@tekbreed/tekmemo`:

## Core Concepts

- **Nodes:** Represent discrete entities like a `Decision`, `File`, or `Requirement`.
- **Edges:** Represent the relationships between nodes, such as `depends_on`, `implements`, or `supersedes`.
- **JSONL Storage:** Nodes and edges are stored as JSON Lines for easy appending and stream-parsing.

## API Reference

### Store Helpers

| Helper | Purpose |
| --- | --- |
| `createInMemoryGraphStore(options?)` | Initializes a fast, in-memory graph store. |
| `parseGraphNodesJsonl(content)` | Parses raw JSONL text into `GraphNode` objects. |
| `parseGraphEdgesJsonl(content)` | Parses raw JSONL text into `GraphEdge` objects. |

### Graph Operations

| Helper | Purpose |
| --- | --- |
| `expandFromEntities(store, ids, options)` | Traverses the graph to find a neighborhood of related nodes. |
| `extractGraphFactsRuleBased(input)` | Extracts nodes and edges from text using configured rules. |

## Example: Managing a Graph

```ts
import { createInMemoryGraphStore } from "@tekbreed/tekmemo";

const store = createInMemoryGraphStore();

// Add a node
await store.nodes.create({
  id: "node_1",
  type: "decision",
  label: "Use D1 Database",
  metadata: { status: "accepted" }
});

// Add another node
await store.nodes.create({
  id: "node_2",
  type: "decision",
  label: "Use Tailwind CSS"
});

// Create an edge between them
await store.edges.create({
  source: "node_1",
  target: "node_2",
  type: "relates_to"
});

// Query neighbors
const neighbors = await store.neighbors({ id: "node_1" });
console.log(`Found ${neighbors.nodes.length} connected entities.`);
```

## Use Cases

- **Impact Analysis:** See what parts of the system are affected by a change.
- **Architectural Discovery:** Help agents understand how different decisions relate to each other.
- **Context Grounding:** Provide a "neighborhood" of relevant facts to an LLM instead of a flat list.
