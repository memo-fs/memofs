# Memory Sub-APIs

## `memo.core`

Read and update the core memory document (`.memofs/memory/core.md`).

```ts
// Read core memory (returns raw markdown string)
const text = await memo.core.read();
console.log(text);

// Overwrite core memory
await memo.core.update("# Project Rules\n\nAlways use TypeScript strict mode.");
```

## `memo.notes`

Read and record timestamped notes (`.memofs/memory/notes.md`).

```ts
// Read all notes
const notes = await memo.notes.read();

// Record a new note (auto-timestamped)
await memo.notes.record({
  content: "Deployment checklist added on July 4th.",
  kind: "decision",
});
```

## `memo.conversations`

Read and append to the conversation log (`.memofs/events/conversations.jsonl`).

```ts
const entries = await memo.conversations.read({ limit: 20 });
await memo.conversations.append({
  role: "user",
  content: "How does auth work?",
});
```