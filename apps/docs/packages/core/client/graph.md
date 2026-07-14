# Graph Sub-API

## `memo.graph`

Entity-relationship graph operations — upsert nodes/edges, query neighbors, find paths.

```ts
await memo.graph.upsertNodes({
  nodes: [{ id: "auth", type: "feature", label: "Authentication" }],
});

const neighbors = await memo.graph.neighbors({
  nodeId: "auth",
  direction: "both",
});
```