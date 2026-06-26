# ADR 0012: R2-backed MemoryStore as an adapter package, with a provider-neutral remote-blob contract in core

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** "memory runtime" is canonical. See
> `docs/CONTEXT.md` → Canonical product nouns.

## Context

[ADR 0003](./0003-managed-runtime-tier.md) locks the cloud's long-term purpose:
run the **same** local `Tekmemo` runtime on hosted infra against the user's
R2-resident `.tekmemo/` files. [ADR 0011](./0011-managed-runtime-sequencing.md)
sequences that as **phase 3** (after the concurrency layer and Teams).

The hard prerequisite ADR 0003 assumes — "the identical runtime against
R2-resident files" — does not exist. Verified in code (2026-06-24):

- The `Tekmemo` runtime's read/write path runs through a **`MemoryStore`**
  abstraction (`packages/tekmemo/src/fs/node-fs-memory-store.ts`), and the only
  concrete implementations are **`NodeFsMemoryStore`** (Node `fs`) and an
  in-memory store (tests). Both assume a POSIX filesystem.
- **Cloudflare Workers have no Node `fs`.** The `local-strategy`
  (`packages/tekmemo/src/tekmemo/local-strategy.ts`) that orchestrates
  recall/extraction/consolidation reads/writes through the store — it cannot run
  in a Worker unmodified. You cannot "just point the runtime at R2."
- The cloud today is a **pure file replica**: `apps/cloud` exposes only
  `/v1/health`, `/v1/readiness`, `/v1/projects/:id/sync/*`. It imports
  `@tekbreed/tekmemo` **only for `cloud-client` types** (`api/json.ts`,
  `api/sync/shared.ts`, `api/errors.ts`) — never `createTekmemo` /
  `createLocalStrategy`. R2 holds content-addressed blobs
  (`apps/cloud/src/api/sync/index.ts`).

So before phase 3 can run the runtime over cloud-resident files, something must
implement the `MemoryStore` contract against R2 + the cloud's existing Turso
metadata. **Where that implementation lives** is the decision.

This matters because ADR 0003's thesis is explicitly **"self-host the same
engine free (OSS), or pay us to run it"** — the Vercel/Supabase model. If the
R2 store is cloud-internal only, the OSS cannot self-host the managed runtime on
any remote-blob backend, and the thesis weakens. If it is reusable, a user (or
competitor, or contributor) can run the identical hosted runtime on S3, GCS,
Azure Blobs, or R2 in their own account.

## Decision

**Two parts: a provider-neutral *remote-blob memory store* contract in core, and
the R2 implementation in a new adapter package `@tekbreed/tekmemo-adapter-r2`.**

### 1. Contract in core — `RemoteBlobMemoryStore`

Define a **provider-neutral** memory-store contract in core `packages/tekmemo`
(alongside the existing `MemoryStore` / `NodeFsMemoryStore`), implemented
against an injected *blob client* interface rather than any specific cloud.

```
core:  RemoteBlobMemoryStore(opts: { blobClient: BlobClient, metadata: MetadataStore, rootKey: string })
       BlobClient     — minimal: get/put/delete (streaming), keyed by opaque blob id
       MetadataStore  — the canonical-file manifest (paths → blob ids + sizes + sha256)
adapter-r2:  createR2BlobClient(binding: R2Bucket): BlobClient
```

- The store exposes the same surface `local-strategy` already calls (read/write
  the canonical `.tekmemo/` files: `core.md`, `notes.md`, `graph/*.jsonl`,
  `chunks.jsonl`, `embeddings.jsonl`, `connectors.json`, snapshots, …). The
  runtime is unaware whether bytes land on disk or in a bucket.
- `BlobClient` and `MetadataStore` are **interfaces**, not Cloudflare types — so
  a future `@tekbreed/tekmemo-adapter-s3` (or GCS, MinIO) implements the same
  `BlobClient` and the runtime is unchanged. Mirrors exactly the
  `Embedder` / `Extractor` / `Connector` provider-neutral pattern already locked
  (AGENTS.md: "Core protocol contracts must be provider-neutral").

### 2. Implementation in a new adapter — `@tekbreed/tekmemo-adapter-r2`

- A new **published** package `@tekbreed/tekmemo-adapter-r2` (MIT), holding
  `createR2BlobClient(binding: R2Bucket): BlobClient` (+ a Turso-backed
  `MetadataStore` impl reusing the cloud's existing `project_files` /
  `sync_cursors` tables).
- Depends on `@tekbreed/tekmemo` for the contract; depends on the Cloudflare
  `R2Bucket` type (a `@cloudflare/workers-types` peer). The Cloudflare coupling
  lives in the adapter, never in core.
- The cloud Worker (`apps/cloud`) phase-3 wiring: `createLocalStrategy({ store:
  new RemoteBlobMemoryStore({ blobClient: createR2BlobClient(env.TEKMEMO_R2),
  metadata: createTursoMetadataStore(db, projectId), rootKey: projectId }) })`.

### Reuse, don't reinvent, the replica infra (sub-decision, deferred to implementation)

A flagged implementation sub-question (not resolved here): the file-replica sync
handler (`apps/cloud/src/api/sync/`) **already** stores content-addressed R2
blobs + a Turso manifest (`project_files`: path → sha256 → size → blob key). The
phase-3 `RemoteBlobMemoryStore` should **reuse this exact blob layout and
metadata**, not invent a parallel store — the runtime's canonical files *are*
the same files the replica already holds. The detail (one shared `MetadataStore`
impl vs. two views over the same tables) is an implementation choice inside the
adapter, recorded here so phase 3 doesn't accidentally build a second source of
truth.

## Consequences

**Positive:**

- **ADR 0003's "self-host the same engine" thesis holds for real.** The R2
  store is a published adapter; the OSS community (or the founder on a different
  backend) can run the managed runtime anywhere a `BlobClient` exists. The
  cloud's moat stays *operational* (R2/Turso/Workers/keys/uptime), not a
  captive code path.
- **Pattern parity.** Embedder/reranker/extractor/connector all follow
  "interface in core, provider impl in `tekmemo-adapter-*`." The remote-blob
  store follows the identical seam — a new reader of the codebase finds no
  special case.
- **Provider neutrality honored (AGENTS.md).** Core stays free of Cloudflare
  types; the `R2Bucket` coupling is quarantined in the adapter.
- **No second source of truth.** The runtime reads/writes the *same* R2 blobs +
  Turso manifest the file replica already manages (per the reuse sub-decision).
  One set of files; the runtime is a new *reader/writer* over them, not a
  parallel store.

**Negative:**

- **One more package to maintain.** `@tekbreed/tekmemo-adapter-r2` is a real
  published surface with its own tests/tsdown/tsconfig. Accepted: the
  reusability + thesis-integrity payoff justifies it, and the adapter pattern is
  already the house style.
- **The `BlobClient` / `MetadataStore` contracts are load-bearing.** Getting
  them wrong (too Cloudflare-shaped, too narrow, streaming-unfriendly) bakes in
  friction for every future backend. They must be designed against the runtime's
  actual access patterns (canonical-file read/write + graph/chunks JSONL
  appends), not sketched abstractly.
- **Does not, by itself, run the runtime in a Worker.** The store is one of
  three phase-3 prerequisites (ADR 0011): it lands alongside a concrete
  extractor adapter (Q18) and on top of the phase-1 concurrency layer (ADR
  0010). Shipping the store does not ship hosted recall.

## Alternatives considered

1. **R2 store in core `packages/tekmemo` (a new `MemoryStore` impl alongside
   `NodeFsMemoryStore`).** **Rejected:** puts a Cloudflare `R2Bucket` binding
   (and `@cloudflare/workers-types`) into the MIT core — provider coupling in
   the wrong layer, violating AGENTS.md ("Core protocol contracts must be
   provider-neutral") and breaking pattern parity with every other
   cloud-specific integration (embedder/extractor/connector all live in
   adapters). Reusability is incidental rather than designed.
2. **R2 store cloud-internal (`apps/cloud` only, not reusable).** **Rejected:**
   fastest to build, but the OSS cannot self-host the managed runtime on R2 (or
   any remote blob) — directly weakening ADR 0003's "self-host the same engine
   free" thesis. The cloud's moat would become a captive code path rather than
   operational excellence. Also blocks future S3/GCS adapters without a
   contract to implement.
3. **A generic "remote store" in core that is R2-shaped anyway.** **Rejected:**
   if the core contract leaks R2/Cloudflare assumptions (bucket semantics,
   Workers streaming), it is alternative 1 with extra steps. The decision is
   specifically a *provider-neutral* contract + an *adapter* impl, so the seam
   is honest.

## Validation

- **The `MemoryStore` abstraction exists** and is the runtime's I/O seam
  (`packages/tekmemo/src/fs/node-fs-memory-store.ts`); `local-strategy` calls it.
  A new impl slots in without touching recall/extraction/consolidation logic.
- **Only `NodeFsMemoryStore` + in-memory exist today** — confirmed no remote-blob
  impl in any `packages/tekmemo-adapter-*` (the four adapters are
  ai-sdk/openai/transformers/voyage — all embedder/reranker/runtime, none a
  store).
- **The cloud is a pure file replica** — `apps/cloud` imports only
  `cloud-client` types from core, never the runtime; R2 holds content-addressed
  blobs behind the sync handler. The phase-3 store reuses this layout.
- **Provider-neutral contract is the house pattern** — `Embedder`, `Extractor`,
  `Connector` are all interface-in-core + impl-in-adapter. This ADR adds the
  store to the same seam. (AGENTS.md: "Core protocol contracts must be
  provider-neutral.")

## References

- [ADR 0003](./0003-managed-runtime-tier.md) — the thesis this ADR makes
  implementable ("same runtime against R2-resident files").
- [ADR 0011](./0011-managed-runtime-sequencing.md) — phase 3 (managed runtime)
  is when this store is needed; this ADR is its prerequisite.
- [ADR 0010](./0010-cloud-concurrency-control-for-b3.md) — the phase-1 layer
  that must precede the runtime running in the cloud.
- [ADR 0005](./0005-cloud-tech-stack.md) — locks Turso/libSQL + R2; this ADR
  reuses both as the store's backing.
- Decisions log: [`decisions.md`](../architecture/decisions.md) Q31 (this ADR).
- Code: `packages/tekmemo/src/fs/node-fs-memory-store.ts` (the `MemoryStore`
  seam the new impl extends), `apps/cloud/src/api/sync/index.ts` (the existing
  R2-blob + Turso-manifest layout the store reuses).
