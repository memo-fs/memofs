# Recall & Context

## `memo.recall`

Performs lexical, vector, or hybrid query recall to retrieve relevant memory fragments.

- **Parameters:** `query: string, options?: { limit?, filter?, namespace?, workspaceId?, projectId? }`
- **Returns:** `Promise<RecallResult>`

```ts
const results = await memo.recall("how does auth work?", { limit: 5 });
for (const item of results.items) {
  console.log(item.text, item.score);
}
```

## `memo.context`

Builds a progressive-disclosure context briefing for an agent — core + entities + recall + recent + notes, packed into `maxBytes`.

- **Parameters:** `MemoryContextInput` — see below
- **Returns:** `Promise<MemoryContextResult>`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | `""` | Task description to prioritize matching memories |
| `taskType` | `TaskType` | `"general"` | Task kind for strategist query augmentation: `coding`, `debug`, `refactor`, `docs`, `general` |
| `detail` | `"compact" \| "full"` | `"compact"` | Progressive disclosure level |
| `maxBytes` | `number` | — | Maximum output size in bytes |

```ts
const ctx = await memo.context({
  query: "how does auth work?",
  taskType: "debug",
  detail: "compact",
  maxBytes: 6000,
});
console.log(ctx.text);
```

When `taskType` is set (anything other than `"general"`), the strategist expands the recall query with task-specific lexicon and prepends a task-type phrase so the most relevant memories surface first.

## `memo.writeMemory`

Writes a memory entry with kind, tags, source refs, and durability classification.

```ts
const result = await memo.writeMemory({
  content: "We chose Cloudflare D1 for metadata storage.",
  kind: "decision",
  tags: ["architecture", "database"],
});
console.log(result.id, result.tier, result.tierReason);
```

## `memo.listRecentMemories`

Lists recent memory events from the event log.

```ts
const recent = await memo.listRecentMemories({ limit: 10 });
```