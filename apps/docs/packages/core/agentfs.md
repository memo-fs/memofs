# AgentFS

AgentFS is the custom virtual filesystem layer built into the `@memofs/core` runtime. It abstracts directory access, file reading, writing, and synchronization into a single interface.

---

## Canonical Memory Path Structure

Inside the project root directory, AgentFS manages memory assets within the `.memofs/` subfolder:

```
.memofs/
├── config.json              # Workspace configuration file
├── manifest.json            # Versioned manifest of all tracked memory assets
├── memory/
│   ├── core.md              # Core canonical memory
│   └── notes.md             # Archival memory notes
├── events/
│   └── conversations.jsonl  # Indexed fragments for recall
└── snapshots/
    └── snapshot_123.json    # Serialized graph restore points
```

---

## The Virtual Path Contract

AgentFS does not interact directly with Node's `fs` or other runtime environments. Instead, it interacts with an injected `MemoryStore` interface. This allows AgentFS to run seamlessly in any Javascript execution context, including web browsers and Cloudflare Workers.

### Injected Store Operations

An implementation of `MemoryStore` exposes five primitives:

- `read(path: string): Promise<string>`
- `write(path: string, content: string): Promise<void>`
- `delete(path: string): Promise<void>`
- `exists(path: string): Promise<boolean>`
- `list(prefix?: string): Promise<string[]>`

---

## File Locks and Leases

To avoid concurrency conflicts and race conditions when multiple agent steps write to the same memory layers, AgentFS implements a lightweight locking protocol.

- **Start Session:** Acquires a lock (lease) for the active agent session.
- **Auto-renew:** Active locks are renewed to ensure the agent context remains exclusive during compilation or code edits.
- **Release Lock:** Releases the lock upon successful transaction execution or unexpected execution errors.

```ts
const session = await memo.agentSession.start({
  leaseMs: 30000, // 30-second lock
});

try {
  // Perform memory updates...
  await session.write({ kind: "notes", content: "..." });
  await session.complete();
} catch (err) {
  await session.rollback();
}
```
