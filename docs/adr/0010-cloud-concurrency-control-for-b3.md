# ADR 0010: Cloud concurrency-control layer for B3 (one memory, many agents)

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** uses of "engine" in this ADR refer to what
> is canonically the "memory runtime." See `docs/CONTEXT.md` → Canonical
> product nouns.

## Context

ADR 0003 framed the cloud's long-term purpose as a managed-runtime tier: run
the *same* local `Tekmemo` engine on hosted infra against the user's
R2-resident `.tekmemo/` files. Decisions log Q18 then locked four cloud
differentiators that only centralization enables, including **B3: "one memory,
many agents"** — the IDE agent, the CI agent, and a Slack bot addressing the
*same* memory via `tm_…` API keys.

An industry review (2026-06-22) flagged the structural problem with B3 that the
file-first thesis walks directly into:

> *The moment you support concurrent multi-agent writers, raw file writes
> silently corrupt — you need a transactional layer (SQLite, a queue, file
> locks) in front of the files. For a single-agent, single-session use case,
> plain files are genuinely fine.*

TekMemo's current concurrency model is correct for the cases it was designed
for, and **wrong for B3**:

- **D6 (last-writer-wins + mandatory pre-sync snapshot)** — correct for
  single-user multi-device (the Dropbox/iCloud model: one human, occasional
  conflicts, snapshots as rollback). The research explicitly endorses this for
  that case.
- **Connector isolation (Q3)** — content-deterministic writes so re-ingestion
  of unchanged external content reproduces identical bytes (no phantom
  conflicts). Correct for *that* case.
- **B3 is neither case.** B3 is: the CI agent and the IDE agent both finish a
  task at 3pm, both call `tekmemo.remember`, both `sync.push`. Under
  last-writer-wins, **one of those writes silently loses.** The snapshot lets
  you roll back, but rolling back doesn't *merge* the two facts — it picks one.
  The 3pm CI decision vanishes. This is exactly the "silent corruption" the
  research names, on the exact differentiator (B3) the cloud roadmap commits
  to.

So the cloud has a locked headline feature (B3) that its locked concurrency
model (D6) cannot safely support. This ADR closes that gap.

## Decision

**Add a Turso/libSQL concurrency-control layer in front of the cloud's R2 file
replica, used as a write-serialization point for multi-agent access (B3).**
The files in R2 remain the durable source of truth; the DB is a derived,
rebuildable concurrency-control layer.

### What the layer does

Multi-agent writers to the same project **serialize** through the Turso layer:

```
agent push → acquire project lock (Turso) → validate against current manifest
          → apply writes → release lock
```

- **Project-scoped locking**, not global. Two different projects' agents don't
  contend.
- **Validate-against-manifest** before apply: the push's `baseCursor` must match
  the current `sync_cursors.seq`, exactly the two-phase push contract
  (`tekmemo.sync_push` → `tekmemo.sync.complete`). Under contention, a push
  whose base is stale is rejected with the current state — the client re-runs
  its writes against the new manifest and retries.
- **The lock is on the metadata/index, not the blobs.** R2 presigned PUT/GET
  URLs (the existing sync mechanism, ADR 0005) are unaffected; serialization
  happens at the manifest-commit boundary.

### What this does NOT change

- **D1/D2 hold.** The cloud is still a file replica — it does not run recall,
  embed, extract, or ingest at v1. The Turso layer is concurrency control, not
  an engine.
- **D6 holds for its cases.** Single-user multi-device sync is unchanged:
  last-writer-wins + pre-sync snapshot. The concurrency layer only engages when
  the push pattern indicates multi-writer contention (e.g. distinct API keys,
  or a base-cursor mismatch that suggests a concurrent commit).
- **File-first holds.** The R2 blobs are the durable source of truth; the Turso
  layer is derived and rebuildable from them — the same relationship the local
  recall store has to local files. If Turso is lost, it is reconstructed from
  the R2 manifests exactly as the local index is reconstructed from `.tekmemo/`
  files on a `bootstrapMemoryStore` reindex.
- **Local runtime is unaffected.** The local `Tekmemo` runtime has no
  concurrency layer and needs none — its single-process contract is enforced
  separately (advisory file lock, Q28). This ADR is cloud-only.

### Why Turso (already in the stack)

Turso/libSQL is already locked for the cloud's metadata DB (ADR 0005 / Q8) —
`accounts`, `api_keys`, `projects`, `project_files`, `sync_cursors`. The
concurrency-control layer reuses the **same Turso instance** as a
write-serialization point. No new infrastructure; the DB the cloud already runs
gets a second job: metadata store *and* concurrency control.

The serialization primitive is ordinary SQL: a `SELECT ... FOR UPDATE` on the
project row (or an advisory application-level lock keyed by `project_id`) held
within a transaction that validates + commits the manifest update. This is
boring, well-understood database concurrency — exactly what the research means
by "a transactional layer in front of the files."

## Consequences

**Positive:**

- **B3 becomes safe.** The locked cloud differentiator ("one memory, many
  agents") is physically deliverable. Multi-agent writers serialize cleanly;
  none silently loses.
- **No new infrastructure.** Turso is already in the stack; this is a new use
  for an existing component.
- **File-first holds in both tiers.** Local: files + advisory lock (Q28).
  Cloud: R2 file replica + Turso serialization. Neither makes the DB the source
  of truth.
- **Honest local/cloud asymmetry.** This is the *first* capability the cloud
  has that the local runtime does not — and the correct one to break symmetry
  on: concurrency is a cloud-scale problem (many agents over the network), not
  a local-scale problem (single process). The local runtime stays pure
  file-first; the cloud adds the layer the multi-agent case requires. Same
  shape as the managed-runtime tier itself (ADR 0003): the cloud runs the *same
  engine* plus *additional infra* for the scale problems local doesn't have.

**Negative:**

- **First cloud-only capability.** Until now, cloud and local were
  operationally symmetric (same engine; cloud is a replica + managed
  convenience). This ADR introduces a real behavioral difference: the cloud
  safely handles a workload (multi-agent concurrent writers) the local runtime
  refuses. This is a positioning shift worth being honest about in docs — the
  cloud isn't just "hosted local," it's "hosted local + safe multi-agent."
- **Serialization, not parallelism.** The layer serializes contending writes;
  it does not make them parallel. A burst of N simultaneous agent pushes to one
  project becomes N sequential commits. For B3's real workload (a few agents
  per project, occasional pushes), this is fine; for a hypothetical
  high-throughput multi-tenant writer, it would be a bottleneck. Defer
  parallelism until a real workload demands it.
- **The client retry path is now load-bearing.** When a push is rejected for a
  stale base cursor, the client must re-run its writes against the new manifest
  and retry. For `tekmemo.remember` (append-only notes), the merge is trivial
  (append wins). For `core.md` (replace-whole-file) or graph mutations, the
  client-side merge is non-trivial and may surface a genuine conflict to the
  user/agent. This is real client-side work, scoped to the B3 path.
- **Revises ADR 0003.** The managed-runtime tier was framed as "same engine +
  managed infra." This ADR adds "+ concurrency control" to that framing. ADR
  0003's thesis still holds; its scope is widened.

## Alternatives considered

1. **Defer B3 until a later major version.** Rejected: B3 is a locked headline
   cloud differentiator (Q18) and the one feature that makes the cloud
   compelling for team/CI/IDE usage. Deferring it pushes a marquee feature
   right, and the fix (reuse Turso) is not large.
2. **Application-level merge on push (the git model) — no server-side
   transactional layer.** The cloud detects a stale `baseCursor`, rejects with
   current state, and the client merges (deterministic for notes; semantic for
   conflicts). Rejected as the *primary* mechanism: it pushes non-trivial
   merge logic onto every client, and graph-mutation / core-memory merges are
   genuinely hard client-side. The server-side Turso serialization (this ADR)
   handles the common case (serialize) cleanly; client-side merge remains the
   fallback for the cases that survive serialization (genuine semantic
   conflicts), where it belongs.
3. **R2-native concurrency (conditional PUTs / ETags).** Rejected: R2's
   consistency model and API surface make per-file ETag gates possible but
   multi-file atomic commits (a push touches manifest + multiple blobs) are not
   atomic across objects. A manifest commit that spans N blobs cannot be made
   transactional at the R2 layer alone. Turso holds the manifest-commit
   transaction; R2 holds the blobs.
4. **Make the local runtime also support concurrency (symmetry).** Rejected:
   local is single-process by contract; a second local process is almost always
   accidental (two windows), not a workload, and is handled by the advisory
   file lock (Q28). Building real concurrency control into the local runtime
   would be cloud-scale machinery in a single-user tool. The asymmetry is
   correct.

## Validation

- **B3 is a locked differentiator** (decisions log Q18, "one memory, many
  agents via API keys").
- **D6 (last-writer-wins + pre-sync snapshot) is verified insufficient for
  concurrent multi-writer**: `packages/tekmemo/src/tekmemo/sync/file-replication.ts`
  calls `createPreSyncSnapshot()` before mutating push/pull (lines 204, 226) —
  the snapshot enables rollback, not merge. Two simultaneous pushes pick one
  winner; the loser vanishes.
- **Turso is already in the cloud stack** (ADR 0005 / Q8): `apps/cloud/src/db/schema.ts`
  ships five tables (`accounts`, `api_keys`, `projects`, `project_files`,
  `sync_cursors`) with the Q12 naming convention. The concurrency layer reuses
  this DB; it does not provision a new one.
- **The two-phase push contract exists** (`tekmemo.sync_push` →
  `tekmemo.sync.complete`, with `baseCursor` per Q14's plain-decimal-string
  cursor): the serialization point is the existing manifest-commit boundary,
  not a new API surface.
- **File-first is preserved**: the Turso layer is derived from / rebuildable
  from R2 manifests, exactly as the local recall store is derived from /
  rebuildable from `.tekmemo/` files.
- **The decision is locked** in [`decisions.md`](../architecture/decisions.md)
  Q25b (shape C).

## References

- Decisions log: [`decisions.md`](../architecture/decisions.md) — Q18 (B3
  differentiator), Q25b (concurrency-control layer, locked shape C).
- [ADR 0003](./0003-managed-runtime-tier.md) — managed-runtime tier (this ADR
  widens its scope from "same engine + managed infra" to "same engine +
  managed infra + concurrency control").
- [ADR 0005](./0005-cloud-tech-stack.md) — locks Turso/libSQL as the cloud
  metadata DB (this ADR reuses it as the concurrency-control layer).
- [ADR 0002](./0002-connectors-run-locally.md) — the connector `secretRef`
  model: another place the cloud holds metadata + a pointer, never the data
  itself. Same shape.
- Q28 / [ADR 0009](./0009-intelligent-retrieval-model.md) — the local
  counterpart: advisory file lock for the single-process local contract. This
  ADR is the cloud counterpart for the multi-agent cloud contract.
- Code: `packages/tekmemo/src/tekmemo/sync/file-replication.ts` (the sync layer
  whose D6 model B3 strains), `apps/cloud/src/db/schema.ts` (the Turso schema
  this ADR's layer extends).
