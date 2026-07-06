# Memo FS Cloud Sync Architecture & OSS Refactor Plan

> **Status:** Decision record and refactor specification. **Sequencing revised
> 2026-07-04 by K2** — see the reconciliation banner below.
> **Owner:** Memo FS platform architecture.
> **Scope:** Governs both the OSS package (`packages/core`) refactor **and** the
> future Memo FS Cloud (`apps/cloud` `/v1/projects/:projectId/...`) build target.

> **Reconciliation banner (2026-07-04, K2).** This document's D2 ("cloud v1 =
> sync-only, no hosted recall/vector/graph/extraction") is **reinstated for v1**
> by the [reconciliation](./reconciliation-2026-07-02.md). It had been contradicted
> by S3-Q9 (`CONTEXT.md`), which compressed the full managed runtime into the v1
> launch; K2 retires that compression. **v1 = file-replica sync + dashboard +
> connector control-plane (D2's thesis). The managed memory runtime is a v1.1
> fast-follow** ([ADR 0011](../adr/0011-managed-runtime-sequencing.md) amended).
> D1–D8 otherwise stand. Code-path references to `packages/memofs` in the body
> point at what is now `packages/core` after the K4 rename
> ([ADR 0016](../adr/0016-scope-flip-and-dir-equals-name.md)); the historical
> pointers are left in place as a session record.
> **Relationship to other docs:** This document **replaces** the cloud-engine assumptions in `docs/memofs/build.md` (Memo FS workspace). That file describes a cloud that will not be built at v1. After this refactor, `build.md` must be rewritten to point here.

---

## 0. TL;DR (the one-paragraph principle)

> **The cloud is a file replica, not an engine. The memory engine always runs locally on the authoritative ``.memofs/`` files.** The cloud stores byte-for-byte replicas of the canonical files, and syncs them by file path + sha256 checksum. The cloud never embeds, never recalls, never runs graph traversal, never extracts memory, and never hosts agent sessions. Every one of those operations runs in the local runtime against the same files the cloud mirrors.

Everything else in this document follows from that one principle.

---

## 1. Why this architecture (grounding, not preference)

The current OSS treats the cloud as a peer **engine**: `cloud-strategy.ts` routes `recall`, `memory CRUD`, and `agentSessions` to hosted endpoints (`packages/memofs/src/memofs/cloud-strategy.ts:147, 195, 239, 271, 367, 418, 435`). That commits the OSS client to a cloud that must build embeddings, BM25 search, graph traversal, extraction, and session management server-side — weeks of work, real hosting cost, and a second source of truth that can drift from the local files.

This refactor inverts the relationship. Grounded reasons:

1. **The OSS already does recall locally for $0.** `local-strategy.ts` runs lexical BM25 + fuzzy search with no embedder (`config.ts:65-86`), and the `-transformers` adapter runs ONNX (`Xenova/all-MiniLM-L6-v2`) in-process with no API key. Moving recall to the cloud would *increase* cost to solve a problem the OSS already solves.
2. **Sync is the one thing only the cloud can do.** A local runtime cannot replicate to a second device by itself. That is the irreducible reason a user pays for cloud, and it is the only thing the cloud needs to do at v1.
3. **One source of truth.** If the cloud is an engine, you have two brains that can disagree. If the cloud is a replica, you have one brain (the local files) and a mirror. This is the git model: git never asks a server to run your diff.
4. **Storage economics.** Cloud v1 stores canonical files in Cloudflare R2 (blobs, ~$0.015/GB, free egress) and only the sync manifest/cursors in Turso/libSQL (tiny metadata rows). See Memo FS `docs/memofs/design.md` and `pricing_global_rules.md`. A file-replica cloud is cheap; an engine cloud is expensive.
5. **Honest contract.** The current `MemofsCloudClient` interface (`cloud-client/types.ts:899-916`) declares 14 namespaces. A sync-only cloud implements 1. Freezing a 14-namespace contract into `v1.0.0-alpha.0` for a cloud that ships 1 is an over-promise. Trimming the client to match the real cloud makes the contract honest.

---

## 2. Decision record

| # | Decision | Status | Rationale ref |
|---|---|---|---|
| D1 | Cloud = file replica; engine always local | **Locked** | §1 |
| D2 | Cloud v1 = sync-only. No hosted recall/vector/graph/extraction/agent-sessions | **Locked** | §1.2 |
| D3 | Sync model = **file-based manifest replication** (path → sha256), NOT event-log replication | **Locked** | §4 |
| D4 | Modes: delete `"cloud"`; keep `"local" \| "hybrid" \| "memory"`. Do NOT rename `hybrid`→`sync` (collides with `client.sync` namespace) | **Locked** | §5, §6.4 |
| D5 | Cloud-client surface: keep only `sync` + `health`/`readiness`. Delete 12 namespaces | **Locked** | §7 |
| D6 | Conflict resolution at v1 = last-writer-wins per file + mandatory pre-sync snapshot (the `pre-sync` snapshot type already exists) | **Locked** | §9 |
| D7 | Append-only JSONL files sync as whole canonical files by sha256; indexes re-derive locally after pull. No tail-syncing at v1 | **Locked** | §10 |
| D8 | Publish outcome = clean `v1.0.0-alpha.0` after refactor (not alpha.0-then-deprecate). Refactor happens before first publish | **Locked** | §11 |
| D9 | Memo FS `docs/memofs/build.md` to be rewritten to point at this doc; its 45-endpoint cloud map is superseded | **Locked** | §14 |

---

## 3. Current state (what exists today — the starting point for refactor)

Verified by reading the code. Every claim cites a file.

### 3.1 Runtime modes

`packages/memofs/src/memofs/types.ts` defines `MemofsRuntimeMode = "local" | "cloud" | "hybrid" | "memory"` (referenced throughout `config.ts:267-282`, `Memofs.ts:425-484`).

- `"local"` — filesystem store, local engine. **Unchanged by refactor.**
- `"cloud"` — delegates everything to a hosted engine via `createCloudStrategy`. **Deleted by refactor (D4).**
- `"hybrid"` — composes local + cloud with read/write policies (`Memofs.ts:446-474`). **Kept; redefined to mean local engine + file replication (no cloud engine).**
- `"memory"` — volatile in-process. **Unchanged.**

### 3.2 The cloud engine (to be deleted)

`packages/memofs/src/memofs/cloud-strategy.ts` (563 lines) implements every runtime operation by calling the cloud client's hosted endpoints:

- `recall` → `client.recall.query` (lines 147, 195)
- `memory.readCore / listNotes / createNote` → `client.memory.*` (lines 112, 116, 239, 271, 296)
- `agentSessions` → `client.agentSessions.create / extract / complete` (lines 367, 418, 435)
- `sync` → `client.sync.push / pull / status` (lines 518, 535, 552) — these are **event-based** and get rewritten, not preserved
- Graph + snapshots → already throw "not available yet" (lines 360, 460-512)

### 3.3 The event-based sync model (to be replaced)

`packages/memofs/src/cloud-client/types.ts:197-266` defines **7 types** for event replication:

```
SyncEventInput        — a single memory event (clientEventId, type, path, payload, payloadHash, baseServerVersion)
SyncPushInput         — { clientId, events[], checkpoint? }
SyncPushResult        — accepted/duplicates/rejected/conflicts arrays + serverVersion
SyncPullInput         — { clientId, sinceServerVersion?, limit? }
SyncPullResult        — events[] + serverVersion + nextCursor
SyncStatusInput       — { clientId? }
SyncStatusResult      — serverVersion + clients[] + openConflicts + recentEvents
```

This model makes the cloud an **event processor** (must order, de-dupe, apply, and version events). That is engine-like and contradicts D1.

### 3.4 The cloud client surface (to be trimmed)

`packages/memofs/src/cloud-client/types.ts:899-916` — `MemofsCloudClient` declares **14 namespaces**:

```
health, readiness, memory, recall, context, graph, extraction,
evals, benchmarks, sync, exports, snapshots, providers,
agentSessions, candidates, conflicts
```

D5 keeps only `health`, `readiness`, `sync`. The other 12 are deleted.

### 3.5 Sync hooks (to be rewritten)

`packages/memofs/src/agentfs/sync/`:

- `sync-before-session.ts` — calls `client.sync.pull()` before an agent session
- `sync-after-session.ts` — optionally checkpoints (the `pre-sync` snapshot type), then calls `client.sync.push()`

These stay as orchestration, but `pull`/`push` change from event-replication to file-replication internally (see §8).

### 3.6 The file format (unchanged — this is the sync target)

`packages/memofs/src/core/constants/memory-paths.ts:69-80` defines exactly **10 canonical files** per project:

```
`.memofs/`manifest.json
`.memofs/`memory/core.md
`.memofs/`memory/notes.md
`.memofs/`events/memory-events.jsonl
`.memofs/`events/conversations.jsonl
`.memofs/`indexes/chunks.jsonl
`.memofs/`indexes/embeddings.jsonl
`.memofs/`graph/nodes.jsonl
`.memofs/`graph/edges.jsonl
`.memofs/`snapshots/snapshots.jsonl
```

Plus dynamic snapshots: ``.memofs/`snapshots/<safe-name>.json` (`memory-paths.ts:88, 92`).

`local-strategy.ts:1098` already computes sha256 (`createHash("sha256").update(value).digest("hex")`). `manifest.ts` enumerates every path. **The sync unit and identity primitive already exist** — the refactor wires them into the cloud path instead of events.

### 3.7 Config (minor changes)

`packages/memofs/src/memofs/config.ts:284-327` resolves cloud options from constructor/env/``.memofs/`config.json`. `resolveMode` (line 267) accepts `"cloud"`. After refactor, `"cloud"` is no longer a valid mode (D4); `resolveMode` and `isRuntimeMode` must reject it.

---

## 4. The file-based sync model (D3) — the core of the refactor

### 4.1 Sync unit

**One canonical ``.memofs/`` file.** Identity = canonical path (e.g. ``.memofs/`memory/core.md`). Version = sha256 of file content. The set of sync units is fixed and enumerable: the 10 canonical files + any snapshot files present.

### 4.2 The sync manifest (local, computed)

Before any push or pull, the runtime computes a **local file manifest**: a map of `{ canonicalPath → sha256 }` over every file that currently exists in ``.memofs/`` (canonical files that exist + snapshot files). This is derived, not stored — computed by walking `CANONICAL_MEMOFS_FILES` + matching the snapshot pattern, hashing each present file.

### 4.3 The cloud manifest (stored in Turso)

The cloud stores, per project: `{ canonicalPath → { sha256, r2Key, sizeBytes, updatedAt } }`. This is the cloud's authoritative index of what it holds. Stored as relational metadata (small rows), not as a blob.

### 4.4 Push (file replication)

```
Local computes its file manifest: { path → sha256 }
POST /v1/projects/:projectId/sync/push
  body: { manifest: { path → sha256 }, baseCursor?: string }
Server:
  1. diff local manifest against cloud manifest
  2. for each path where sha256 differs (or path missing on cloud): server needs the bytes
  3. for each path present locally but with different hash: server needs the bytes
  4. issue presigned R2 PUT URLs for the needed files
  returns: { upload: [{ path, sha256, presignedPutUrl }], cursor }
Local:
  PUT each needed file to its presigned URL (R2 object key = sha256 or path-derived)
  re-POST to confirm upload complete:
POST /v1/projects/:projectId/sync/push/complete
  body: { uploaded: [{ path, sha256 }], cursor }
Server:
  1. verify each uploaded object's sha256 matches claimed hash
  2. update cloud manifest { path → { sha256, r2Key, sizeBytes, updatedAt } }
  3. advance cursor
  returns: { cursor, manifest: { path → { sha256, updatedAt } } }
```

### 4.5 Pull (file replication)

```
POST /v1/projects/:projectId/sync/pull
  body: { since?: cursor } | { manifest: { path → sha256 } }
Server:
  1. diff cloud manifest against client-supplied manifest (or all files if no manifest)
  2. for each path where cloud sha256 ≠ client sha256 (or path missing on client):
       include a presigned R2 GET URL
  3. for each path present on client but deleted on cloud: include in `removed[]`
  returns: {
    files: [{ path, sha256, sizeBytes, presignedGetUrl }],
    removed: [path],
    cursor,
    manifest: { path → { sha256, updatedAt } }
  }
Local:
  GET each file, write to `.memofs/`<path>, verify sha256
  delete removed paths
  re-derive indexes locally (see §10)
```

### 4.6 Status

```
GET /v1/projects/:projectId/sync/status
  returns: {
    manifest: { path → { sha256, updatedAt } },
    cursor,
    storageBytes,
    lastSyncAt?
  }
```

### 4.7 Why file-based, not event-based

| | Event-based (current) | File-based (target) |
|---|---|---|
| Cloud must | order, de-dupe, apply, version events | store bytes + a path→hash map |
| Cloud complexity | engine (event processor) | dumb store (replica) |
| Cloud build effort | weeks | weekend |
| Source of truth | two (event log + applied state) | one (files) |
| Conflict surface | event ordering, replay, idempotency | per-file content (simple) |
| Matches git model | no | yes |

---

## 5. Mode model (D4)

### 5.1 Before

`"local" | "cloud" | "hybrid" | "memory"`

### 5.2 After

`"local" | "hybrid" | "memory"`

- **`"cloud"` is deleted.** There is no cloud-engine mode.
- **`"hybrid"` is redefined:** local engine (read + write + recall + graph, all local) **plus** file replication to/from the cloud on sync hooks. `readPolicy`/`writePolicy` (`config.ts:161-176`) govern *whether* sync runs before reads / after writes, not *where* the engine runs (always local).
- **`"local"`** is `hybrid` with sync disabled. (A user who never configures cloud gets `local`.)

### 5.3 What `readPolicy`/`writePolicy` mean after refactor

| Policy | Meaning |
|---|---|
| `local-first` (default) | read/write local files; sync opportunistically |
| `local-only` | never sync (equivalent to `local` mode) |
| `cloud-first` | pull before read; push after write (strongest consistency, most network) |
| `cloud-only` | **remove this option** — implies a cloud engine, which no longer exists. Deleting it is correct and non-breaking for real users (no real user wants "no local files at all" under a replica model) |

### 5.4 Naming note (why not rename `hybrid`→`sync`)

The namespace `client.sync.*` is pervasive (types, hooks, strategy methods). A mode called `"sync"` would collide conceptually with `client.sync` and confuse readers ("`mode: 'sync'`" vs "`client.sync.push`"). Keeping `"hybrid"` avoids the collision while accurately describing "local engine + cloud replication." This is D4.

---

## 6. Refactor work items (per-file)

### 6.1 Delete `packages/memofs/src/memofs/cloud-strategy.ts`

The entire file. Its responsibilities split:
- Sync methods (`syncPush/Pull/Status`) → move into a new file-replication sync module (§8).
- All engine methods (`recall`, `memory.*`, `agentSessions.*`, graph, snapshots) → **deleted**, not relocated. The local engine already provides them.

### 6.2 Update `packages/memofs/src/memofs/Memofs.ts`

- `createStrategy()` (lines 424-484): remove the `mode === "cloud"` branch entirely. The `mode === "hybrid"` branch keeps composing local + cloud, but the "cloud" half is now a **file-replication sync layer**, not an engine strategy.
- Remove the `if (!this.cloud)` guards that throw "Cloud mode requires..." for the deleted `cloud` mode (lines 432-437). Keep the guard for `hybrid` (line 446) since `hybrid` still requires cloud config.

### 6.3 Update `packages/memofs/src/memofs/types.ts`

- `MemofsRuntimeMode`: remove `"cloud"`. Becomes `"local" | "hybrid" | "memory"`.
- `RuntimeReadPolicy` / `RuntimeWritePolicy`: remove `"cloud-only"`. Becomes `"local-first" | "cloud-first" | "local-only"`.

### 6.4 Update `packages/memofs/src/memofs/config.ts`

- `resolveMode` (line 267): remove `"cloud"` from accepted env values (line 276).
- `isRuntimeMode` (line 405): remove `"cloud"` branch.
- `isReadPolicy` / `isWritePolicy` (lines 414-425): remove `"cloud-only"` branch.
- `extractConfigFile` (line 340): no `cloud` runtime value expected.

### 6.5 Trim `packages/memofs/src/cloud-client/types.ts`

**Keep:** `MemofsCloudClient` with only `health`, `readiness`, `sync`.
**Delete namespaces:** `memory`, `recall`, `context`, `graph`, `extraction`, `evals`, `benchmarks`, `exports`, `snapshots`, `providers`, `agentSessions`, `candidates`, `conflicts` (and all their input/result types).
**Rewrite sync types** (lines 197-266) to the file-based model (§4):
- Replace `SyncEventInput`, `SyncPushInput/Result`, `SyncPullInput/Result` with file-manifest types:
  - `FileSyncEntry` — `{ path, sha256, sizeBytes }`
  - `SyncPushInput` — `{ manifest: Record<path, sha256>, baseCursor? }`
  - `SyncPushResult` — `{ upload: Array<{ path, sha256, presignedPutUrl }>, cursor }`
  - `SyncPushCompleteInput` — `{ uploaded: Array<{ path, sha256 }>, cursor }`
  - `SyncPushCompleteResult` — `{ cursor, manifest: Record<path, { sha256, updatedAt }> }`
  - `SyncPullInput` — `{ manifest?: Record<path, sha256>, since?: cursor }`
  - `SyncPullResult` — `{ files: Array<{ path, sha256, sizeBytes, presignedGetUrl }>, removed: path[], cursor, manifest }`
  - `SyncStatusResult` — `{ manifest, cursor, storageBytes, lastSyncAt? }`
- Keep `MemofsCloudSyncClient` interface shape but with the new method signatures. Add `complete(input, signal?)` for the two-phase push.
- Delete `SyncConflictResolution` from the runtime types (no event conflicts in file model; conflicts are per-file, §9).

### 6.6 Update `packages/memofs/src/cloud-client/client.ts`

Rewrite the `sync` namespace methods to call the new endpoints (§4.4-4.6). Delete methods for all removed namespaces. Keep `health`/`readiness`.

### 6.7 Rewrite sync hooks in `packages/memofs/src/agentfs/sync/`

- `sync-before-session.ts`: still calls `client.sync.pull()`, but `pull` now returns presigned GET URLs; the hook (or a new local helper) downloads changed files and writes them to the store, then triggers local index re-derivation.
- `sync-after-session.ts`: still checkpoints (pre-sync snapshot) then calls `client.sync.push()`; the new push computes the local manifest, uploads changed files via presigned PUTs, and completes. The checkpoint-before-push default (`checkpointBeforePush ?? true`, line 41) stays — it is the safety net for D6.

### 6.8 Update tests

- Delete contract/route-parity tests that assert the removed 12 namespaces.
- Delete event-based sync tests; add file-based sync tests (manifest diff, presigned upload/download flow, sha256 verification, removal handling).
- Keep transport-envelope tests (`{ data, meta }` unwrap) — unchanged.
- Keep `cloud-client-route-parity` but reduced to `health`/`readiness`/`sync`.

### 6.9 Update docs and README

- `README.md`: the "Open source vs. Memo FS Cloud" table (lines 130-151) is already correct in spirit — update to state cloud = sync/replication only, engine always local.
- ``.memofs/`config.json` schema docs: remove `cloud` mode and `cloud-only` policy.
- Remove references to hosted recall/graph/extraction as current capabilities.

---

## 7. Cloud-client surface after refactor (D5)

```ts
interface MemofsCloudClient {
  health(signal?: AbortSignal): Promise<MemofsCloudHealthResult>;
  readiness(signal?: AbortSignal): Promise<MemofsCloudHealthResult>;
  sync: {
    push(input, signal?): Promise<SyncPushResult>;
    complete(input, signal?): Promise<SyncPushCompleteResult>;
    pull(input?, signal?): Promise<SyncPullResult>;
    status(input?, signal?): Promise<SyncStatusResult>;
  };
}
```

That is the entire cloud contract frozen into `v1.0.0-alpha.0`. Four sync methods + two health methods. Everything else is local.

---

## 8. New sync module (replaces cloud-strategy sync methods)

Create `packages/memofs/src/memofs/sync/file-replication.ts` (or similar) exporting a `createFileSyncLayer({ client, store, projectId })` that:

1. **`computeLocalManifest()`** — walks canonical files + snapshot files present in `store`, hashes each, returns `Record<path, sha256>`. Reuses the existing `createHash("sha256")` from `local-strategy.ts:1098`.
2. **`push()`** — compute manifest → `client.sync.push(manifest)` → upload to presigned PUT URLs → `client.sync.complete(uploaded)`. Guard: create a `pre-sync` snapshot before mutating anything (uses existing snapshot machinery).
3. **`pull()`** — `client.sync.pull(localManifest)` → download changed files via presigned GET URLs → write to `store` → verify sha256 → delete removed → trigger local index re-derivation.
4. **`status()`** — `client.sync.status()`.

The `hybrid` strategy in `Memofs.ts` wires this layer alongside the local engine: reads/writes go to the local engine; sync hooks invoke this layer.

---

## 9. Conflict resolution (D6)

**v1 policy: last-writer-wins per file, with a mandatory pre-sync snapshot.**

- When `push` and `pull` both touch the same file path with different sha256, the later `updatedAt` (cloud-side wall clock on commit) wins.
- Before any sync that mutates local files, the runtime creates a snapshot of type `pre-sync` (this type already exists in `core/snapshots/snapshot-records.ts:31` — `SNAPSHOT_TYPES` includes `"pre-sync"`). This gives the user a one-click rollback if sync overwrites a local change they wanted to keep.
- There are **no event-level conflicts** in the file model, so `SyncConflictResolution`, `SyncPushResult.conflicts`, and `client.sync.resolveConflict` are deleted.
- Multi-user concurrent editing with merge is **deferred** to a TekTeams-era feature. v1 is single-user-multi-device, where last-writer-wins is the correct and expected behavior (this is how Dropbox/iCloud handle conflicting edits at the file level).

---

## 10. Append-only JSONL files (D7)

Files like `memory-events.jsonl`, `conversations.jsonl`, `graph/nodes.jsonl`, `graph/edges.jsonl`, `chunks.jsonl`, `embeddings.jsonl` are append-only logs. Two options were considered:

- **(a) Tail-sync:** upload only new lines since last checkpoint. Byte-efficient but requires the cloud to understand JSONL append semantics and line cursors — engine-like.
- **(b) Whole-file sync:** treat each JSONL file as one sync unit by sha256. Cloud stores the whole file. After pull, the local runtime re-derives derived indexes (chunks/embeddings) from source files.

**D7 chooses (b).** Rationale:
- Cloud stays a dumb store (no JSONL parsing).
- The chunks/embeddings indexes are **derived** from `core.md` + `notes.md` + events; they can be regenerated locally after any pull. Storing them in the cloud is for convenience/backup, not authority.
- At v1 scale (single user, multi-device), whole-file sync of a few small JSONL files is negligible cost on R2 (one PUT per changed file; egress free).
- Re-derivation is already a local capability (the local engine chunks + embeds on write).

Tail-syncing can be added later as an optimization if a user's events log grows large enough to matter. It is additive (a new sync mode), not a contract break.

---

## 11. Versioning and publish outcome (D8)

- The refactor lands **before** the first npm publish.
- First publish is clean `v1.0.0-alpha.0` with the file-based sync contract (§7). There is no "alpha.0 with cloud engine then alpha.1 deprecating it" cycle.
- The changelog for `v1.0.0-alpha.0` states plainly: cloud = sync/replication only; recall/memory/graph run locally.
- Users who never configure cloud get pure local-first with zero behavior change.

---

## 12. Cloud v1 build target (what `apps/api` implements)

This section is the contract the future Memo FS Cloud must satisfy. It lives here so both repos reference one source of truth.

### 12.1 Endpoints (project-scoped)

```
GET    /v1/health
GET    /v1/readiness
POST   /v1/projects/:projectId/sync/push          → manifest diff + presigned PUTs
POST   /v1/projects/:projectId/sync/push/complete → verify + commit manifest
POST   /v1/projects/:projectId/sync/pull          → manifest diff + presigned GETs
GET    /v1/projects/:projectId/sync/status        → manifest + cursor + storageBytes
```

### 12.2 Storage

- **R2:** one object per canonical file. Key scheme: `memofs/users/{userId}/projects/{projectId}/{safePath}` (or content-addressed `memofs/blobs/{sha256}` with a manifest pointer — either works; content-addressed enables cross-user dedup but adds an indirection. **Recommend content-addressed** for future dedup, path stored in manifest).
- **Turso/libSQL:** `projects`, `project_files` (projectId, path, sha256, r2Key, sizeBytes, updatedAt), `sync_cursors` (projectId, cursor, updatedAt). Plus platform spine: `users`, `api_keys`, `entitlements`, `usage`. Metadata only — no memory content.

### 12.3 Enforcement (entitlement checks, not plan names)

On `push`:
```
bytesUsed = SUM(sizeBytes) WHERE projectId IN user's projects
incoming  = SUM(new/changed file sizeBytes)
limit     = entitlements.maxHostedStorageBytes   // from Pricing/Billing, by plan
if bytesUsed + incoming > limit → 402 with upgrade payload
```
This is the capability-check rule from Memo FS `pricing_global_rules.md` §2.3, made concrete. No app checks `plan === "Pro"`.

### 12.4 Auth

API key: `Authorization: Bearer tm_...`. Validated for hash, revocation, ownership, scopes (`memory:sync`), entitlements, rate limits. Dashboard uses TekAuth session cookies.

---

## 13. What is explicitly NOT in scope for v1

- Hosted recall / embeddings / vector search (stays local; `-transformers` adapter)
- Hosted graph traversal (stays local)
- Hosted extraction (stays local)
- Hosted agent sessions (stays local via AgentFS)
- Candidates / semantic conflicts (local concept; cloud has no opinion)
- BYOK provider credential management (no cloud providers needed when engine is local)
- Hosted exports / snapshots (local feature; user can sync the snapshot file itself like any other)
- Multi-user real-time collaborative merge (deferred to TekTeams era)
- Event-based sync (replaced entirely by file-based)

These may return as **additive premium features** in a future managed-engine tier, but they are not part of the v1 contract and must not be re-introduced as frozen client surface.

---

## 14. Cross-repo doc obligations

After this refactor lands in the OSS:

1. **Memo FS `docs/memofs/build.md`** must be rewritten. Its 45-endpoint cloud map and "aligned to the live cloud implementation" claims are superseded by §12. The new `build.md` points here and describes only the sync endpoints + storage model.
2. **Memo FS `docs/memofs/design.md`** "Core architecture" diagram must be updated: the cloud arrow is "file replication," not "domain services → Turso + Upstash Vector + R2." No Upstash Vector anywhere (Turso native vectors exist if ever needed; not used at v1).
3. **Memo FS `platform_overview.md`** Memo FS summary can stay high-level but should not imply hosted recall at v1.

---

## 15. Acceptance criteria (definition of done for the refactor)

- [ ] `cloud-strategy.ts` deleted.
- [ ] `MemofsRuntimeMode` is `"local" | "hybrid" | "memory"`; `"cloud"` rejected everywhere.
- [ ] `RuntimeReadPolicy`/`WritePolicy` exclude `"cloud-only"`.
- [ ] `MemofsCloudClient` has only `health`, `readiness`, `sync` (+ the 4 file-based sync methods).
- [ ] All 12 non-sync client namespaces and their types deleted.
- [ ] Event-based sync types (`SyncEventInput` etc.) replaced with file-manifest types.
- [ ] `createFileSyncLayer` implemented; `hybrid` mode uses local engine + this layer.
- [ ] `sync-before-session` / `sync-after-session` use file-based pull/push.
- [ ] Pre-sync snapshot created before any sync mutation (D6).
- [ ] All removed-namespace tests deleted; file-based sync tests added and green.
- [ ] `pnpm validate:workspace` (check + typecheck + test + build + lint:package + docs:build) passes.
- [ ] README + ``.memofs/`config.json` docs updated to reflect 3 modes and sync-only cloud.
- [ ] Memo FS `docs/memofs/build.md` rewritten to point here (tracked as a follow-up in the Memo FS workspace).
- [ ] Package publishes as clean `v1.0.0-alpha.0` with the §7 contract.
