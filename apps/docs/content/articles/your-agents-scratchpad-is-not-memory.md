---
title: "Your Agent's Scratchpad Is Not Memory: Session-Outcome-Gated Memory in MemoFS"
description: "Every AI memory tool today treats agent output as immediately durable. AgentFS provides virtual scratchpad workspaces where only successful outcomes promote discoveries to long-term memory."
category: Engineering
publishedAt: "2026-08-17"
authorName: "Christopher S. Aondona"
authorRole: "Founder & Engine Lead"
authorInitials: "CS"
authorHandle: "christophersesugh"
authorAvatarUrl: "https://github.com/christophersesugh.png"
featured: false
tags: [agentfs, sessions, memory, write-intelligence, outcome-gating, engineering]
---

You assign an agent to debug a complex authentication issue. It fires up, reads your codebase, and attempts a fix. It tries three different approaches. The first two are dead ends based on misunderstandings of your OAuth flow. The third one finally works.

If you are using any traditional AI memory tool today, you now have a problem: all three of those approaches (the working fix along with the two dead ends) are now persisted as "facts" in your agent's long-term memory. Tomorrow, a different agent will query that memory, read a hallucinated constraint from attempt #2, and break your app. 

The industry treats agent output as immediately durable: the moment an agent "thinks" something, it is embedded and indexed. But an aborted refactor shouldn't leave half-baked architectural decisions in your recall index. The signal-to-noise ratio of your memory degrades with every failed task. 

Working state is not memory. A scratchpad is not a system of record. 

MemoFS addresses this memory pollution through **AgentFS**: a session-gated workspace architecture where agents work in isolated scratchpads, and memory is only promoted to the durable index when the session concludes with a successful outcome. 

Here is how we built it, the semantic rules that govern it, and how to use it in your own agents today.

## The AgentFS Workspace Structure

Instead of dumping an agent directly into your live repository with write access to your `.memofs/` store, AgentFS provisions an isolated virtual workspace for the duration of the task. 

Every session gets a deterministic directory structure:

1. `context/`: Read-only snapshots. The `core.md` briefing, recalled notes, and project manifest injected at the start of the session. The agent reads this to understand its environment.
2. `working/`: The scratchpad. Contains `plan`, `commands`, `errors`, `changes`, and `notes`. This is where the agent thinks out loud, tracks its progress, and records intermediate findings. 
3. `output/`: The distillation. Contains `summary`, `followUps`, and critically, `durableMemory`. 

This structure is not just a convention; it is the physical mechanism for isolating messy thought processes from clean, durable records.

## The Session Lifecycle

A complete AgentFS session follows a strict, four-step lifecycle:

### 1. Prepare
The caller initializes the session, and MemoFS synchronizes the latest state from the cloud replica (if connected). 
```ts
const session = createMemoFsAgentSession({
  client,
  memory,
  task: "Fix OAuth redirect loop",
  sessionId: "sess_123"
});
const { paths } = await session.prepare();
```

### 2. Scratchpad Work
The agent goes to work. It reads from `paths.context.core`, makes plans in `paths.working.plan`, and records its raw findings in `paths.working.notes`. None of this touches the permanent memory store yet.

### 3. Extract
The agent synthesizes what it learned. Instead of writing directly to the memory index, it writes candidate facts into `paths.output.durableMemory`.
```ts
const extracted = await session.extract();
console.log(extracted.durableMemory); // Candidate facts
```

### 4. Complete
The caller terminates the session, declaring an outcome. This final step triggers the promotion logic and lifecycle hooks.

## Outcome Semantics

The `complete` operation is the gatekeeper. It accepts a `SessionOutcome` ("success", "failure", or "aborted") and applies strict semantic rules to the workspace.

```ts
export type SessionOutcome = "success" | "failure" | "aborted";
```

### Success
When `outcome === "success"`, MemoFS takes the contents of `output/durableMemory` and promotes them to the durable index. It then cleans up the ephemeral `working/` scratchpad. 

```ts
await session.complete({ 
  outcome: "success", 
  extractDurableMemory: true 
});
// workingCleaned: true, durableMemoryWritten: true
```

### Failure
When a task fails, we want an audit trail, but we *never* want to pollute the retrieval index. When `outcome === "failure"`, durable memory is explicitly blocked from promotion. MemoFS writes a `session.failed` event to the append-only `memory-events.jsonl` log, preserving the failure reason. The workspace can optionally be cleaned via the `ephemeral` flag.

```ts
await session.complete({ 
  outcome: "failure", 
  reason: "OAuth endpoint returning 500, could not verify fix",
  ephemeral: true 
});
// durableMemoryWritten: false, failureEventWritten: true
```

### Aborted
Sometimes a user pauses an agent, or a long-running process is preempted. `"aborted"` tells MemoFS to preserve the entire workspace. No cleanup runs, no sync happens, and no memory is promoted. The agent can resume the exact same `sessionId` later.

```ts
await session.complete({ outcome: "aborted" });
// preserved: true, durableMemoryWritten: false, sync.skipped: true
```

## Write Intelligence: The Gate and The Classifier

Even on a `"success"` outcome, the promotion from `output/durableMemory` into the `.memofs/memory/notes.md` file is not guaranteed. It must survive **Write Intelligence**.

Retrieval quality is downstream of write quality. MemoFS enforces two automatic filters before bytes hit the disk:

### 1. The Secret Blocklist
Agents are notorious for scraping `.env` files and summarizing them into notes. The `assertWriteAllowed` gate runs synchronously on all promoted memory.

```ts
// From packages/core/src/security/secret-blocklist.ts
export function assertWriteAllowed(texts: string[], path?: string): void {
  const all: BlocklistViolation[] = [];
  for (const text of texts) {
    const violations = detectBlockedContent(text);
    if (violations.length > 0) all.push(...violations);
  }
  if (all.length === 0) return;
  throw new MemoryWriteBlockedError(
    `Write blocked: content matched ${all.length} secret pattern(s). ` +
    `Redact or drop the secret material and retry.`
  );
}
```
If an agent tries to promote a JWT, a PEM block, or an AWS access key, the blocklist catches it. The promotion fails, returning `durableMemoryWritten: false`, and the secret never touches the syncable file.

### 2. The Durability Classifier
Not every successful observation deserves to steer future tasks. MemoFS uses a deterministic, zero-config `classifyDurability` function to route memory into two tiers: `"durable"` or `"transient"`.

Facts classified as `"transient"` (due to low confidence, very short content, or being a temporary `note`) are appended to the audit trail but **excluded from the recall index and graph**. 

Only `"durable"` memories (high-confidence `decision`, `constraint`, or `preference` facts) are indexed for semantic search.

## Sync Integration

MemoFS is designed to synchronize across machines and teams. AgentFS hooks directly into this replication layer during the session lifecycle:

- `syncBeforeSession` runs during `prepare()`, ensuring the agent starts with the freshest knowledge from the team.
- `syncAfterSession` runs during `complete()`.

Crucially, sync behavior is also outcome-gated. If a session is `aborted`, the push is skipped entirely. We do not broadcast half-finished work to the rest of the team. If a session completes (success or failure), MemoFS checkpoints the local state and pushes the `sync.push()` operation safely.

## For Agents Using MCP

If you are using an agent that speaks the Model Context Protocol (MCP) like Cursor or Claude Desktop, you don't need to write SDK code to get outcome-gating. The `@memofs/mcp-server` exposes the exact same lifecycle as standard tools:

- `memofs_agent_session_start`
- `memofs_agent_session_read`
- `memofs_agent_session_write`
- `memofs_agent_session_append`
- `memofs_agent_session_extract`
- `memofs_agent_session_complete`

Your agent calls `start` to get a workspace, uses the file tools to work within it, and calls `complete` with `"success"` or `"failure"` when it finishes. The MCP server enforces the blocklist, the classification, and the sync hooks transparently.

## Limitations

Outcome-gating prevents the worst forms of memory pollution, but memory is an evolving discipline. Here is what this architecture doesn't solve yet:

- **Staleness within a successful session**: If an agent succeeds but its rationale includes a subtle hallucination about a dependency version, that hallucination still gets promoted. Our hash-anchored drift detection catches when the *code* changes, but we cannot yet algorithmically verify the epistemic truth of the memory itself without a human in the loop.
- **Poisoning**: The blocklist stops secrets, but it does not stop adversarial memory poisoning (e.g., an agent scraping an external untrusted document that tells it to rewrite project constraints).

## Stop Remembering Everything

A human researcher or engineer doesn't publish their rough scratchpad as final findings. They synthesize messy working notes into clean, verifiable conclusions. AI agents need the exact same affordance.

By separating working state from durable memory, and by gating promotion strictly on task success, AgentFS ensures your project's memory stays dense and relevant, no matter how many dead ends your agents take to get there.

---

*Ready to give your agents a scratchpad? Check out the [MemoFS Core documentation](https://memofs.dev/packages/core/) to wire up AgentFS today.*
