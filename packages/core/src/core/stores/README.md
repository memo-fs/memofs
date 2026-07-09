# `core/stores/` — MemoryStore placement rules

The `MemoryStore` **interface** lives in [`core/types/memory-store.ts`](../types/memory-store.ts) — that is the single source of truth for the contract every store impl satisfies. This directory holds the **Worker-safe, zone-free** implementations only.

## Where each store impl lives

| Impl | Location | Why |
| --- | --- | --- |
| `InMemoryStore` | `core/stores/` (here) | Zero deps, Worker-safe, no zone coupling. |
| `RemoteBlobMemoryStore` | `core/stores/` (here) | Worker-safe (Web Crypto, no `node:*`); blobs + manifest are injected, so it has no zone deps. |
| `AgentfsMemoryStore` | `agentfs/stores/` | Coupled to the agentfs client/zone — stays in its zone, not here. |
| `NodeFsMemoryStore` | `fs/` (behind `@memofs/core/node-fs`) | Node-only (`node:fs`/`node:path`/`node:crypto`) — must never load in the Worker bundle, so it stays behind the gated subpath, not here. |

## Rules

1. **Interface here is NOT redefined** — import `MemoryStore` from `core/types/`, never duplicate it.
2. **A store lands here only if** it imports nothing from `node:*` and has no zone (agentfs, fs, cloud-client) dependency. Anything with a zone dep stays in its zone; anything Node-only stays behind `./node-fs`.
3. **The Worker wall is inviolable**: adding a file here that transitively pulls `node:*` breaks the runtime Worker. The grep gate (`grep -rn "from \"node:" src/`) catches this.
