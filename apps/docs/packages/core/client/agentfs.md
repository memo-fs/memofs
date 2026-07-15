# AgentFS Sub-API

## `memo.agentfs`

Agent session lifecycle — start, read/write files, extract durable memory, complete.

```ts
const session = await memo.agentfs.startSession({
  task: "implement auth flow",
});

await memo.agentfs.writeFile({
  sessionId: session.sessionId,
  path: "plan.md",
  content: "# Auth Plan",
});

const extracted = await memo.agentfs.extract({ sessionId: session.sessionId });
const completed = await memo.agentfs.complete({
  sessionId: session.sessionId,
  extractDurableMemory: true,
});

console.log(completed.durableMemoryWritten);
```

Set `extractDurableMemory` when you want the durable-memory output to be
appended to Notes Memory. A secret-blocked output is intentionally skipped and
reports `durableMemoryWritten: false`; storage and sync failures are surfaced
to the caller so they cannot be mistaken for a completed durable write.

For applications that already provide an `AgentfsLikeClient`, use
`memo.agentfs.createSession(...)`. Its returned session exposes `prepare()`,
`extract()`, and `complete()` and provides the same durable-memory result.
