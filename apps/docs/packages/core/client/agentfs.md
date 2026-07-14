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
await memo.agentfs.complete({ sessionId: session.sessionId });
```