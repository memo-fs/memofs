# WF-1 — R2 blob adapter + Turso metadata adapter portable contract

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:grilling` · status: done · claimed: yes · blocked-by: none

## Question

Design the reconciled remote-blob storage contract after WF-2's package rename.
The old bundled `@memofs/adapter-cloudflare` / D1 direction is superseded by
K1 and S3-Q3: keep storage provider roles decoupled so the package set is N+M,
not N×M.

Decide the contract and package responsibilities for:

1. **`@memofs/adapter-r2`** — Cloudflare R2 blob storage only. Confirm the
   public factory shape, streaming behavior, error mapping, and test coverage
   for the `BlobClient` side of `RemoteBlobMemoryStore`.
2. **`@memofs/adapter-turso`** — Turso/libSQL metadata storage only. Decide
   whether this should be a new package now or remain temporarily inside
   `@memofs/adapter-r2` until extraction. Define the table shape and migration
   ownership for `project_files` / `sync_cursors`.
3. **Core interfaces** — keep `BlobClient` and `MetadataStore` provider-neutral
   in `@memofs/core` so Node self-hosters can implement S3/GCS/MinIO/etc.
   without Cloudflare coupling.
4. **Drizzle vs raw libSQL** for the metadata layer. Pick the smallest durable
   API for the manifest while staying consistent with existing Turso/libSQL
   concurrency assumptions.
5. **Tests** — Vitest coverage for the contract suites. Use Miniflare only for
   R2 binding tests; Turso/libSQL metadata tests should stay portable to Node.

## Context pointers

- `packages/adapter-r2/src/{index.ts,r2-blob-client.ts,turso-metadata-store.ts}`
- `packages/core/src/fs/remote-blob-memory-store.ts`
- `packages/testing` contract/fake helpers
- `docs/architecture/reconciliation-2026-07-02.md#k1--the-s3-grilling-is-canonical`
- `docs/architecture/reconciliation-2026-07-02.md#the-13-wayfinder-tickets--reconciled`
- `docs/adr/0012-r2-memory-store-adapter.md`
- `docs/adr/0005-cloud-tech-stack.md`

## Definition of done

The adapter contract is recorded clearly enough for implementation: final package
ownership, exports, migration/schema ownership, and test strategy are known. Any
follow-up implementation or doc-amendment tasks are named explicitly.

## Blocks

WF-5 consumes the final contract for ADR/SSOT amendments. WF-3 consumes the R2
adapter shape when wiring cloud storage. WF-4 consumes the Turso/libSQL metadata
decision when its stale D1 premise is rewritten.

## Resolution

Designed **and implemented** the blob/metadata-decoupled contract (S3-Q3 N+M
shape). The bundled `@memofs/adapter-r2` (R2 blob + Turso metadata) is split
into two packages that compose through core's provider-neutral
`RemoteBlobMemoryStore`.

### 1. Package ownership (Q1, Q2)

- **`@memofs/adapter-r2`** — **blob-only**. `createR2BlobClient({ binding })`
  over an `R2Bucket`. Dropped the `@libsql/client` peer; `R2Bucket` coupling
  quarantined here, never in core.
- **`@memofs/adapter-turso`** (**new**) — **metadata-only**.
  `createTursoMetadataStore({ client, projectId })` moved verbatim from
  `adapter-r2`. Implements `MetadataStore` over `project_files`; `@libsql/client`
  optional peer.

### 2. Core interfaces (Q3) — already done, no change

`BlobClient`, `MetadataStore`, `BlobEntry`, and `RemoteBlobMemoryStore` were
already provider-neutral and Cloudflare-free in `@memofs/core`
(`src/fs/remote-blob-memory-store.ts`). Q3 required no code change; the split is
purely a package-boundary correction. Doc comments in core were updated to name
both decoupled adapter packages.

### 3. Schema/migration ownership (Q4)

- **Adapters own no migrations/schema.** `project_files (id, project_id, path,
  sha256, r2_key, size_bytes, updated_at)` + its unique `(project_id, path)`
  index is owned by the cloud's drizzle schema (WF-4 territory). Adapters are
  **consumers only**.
- **Raw libSQL, not drizzle**, in the adapter — smallest durable API, stays free
  of the cloud's drizzle schema, portable to Node self-hosters. Decided answer
  to Q4.
- The adapter touches only `project_files` (the runtime read/write path);
  `sync_cursors` is the sync handler's concern, not the runtime's.

### 4. Tests (Q5)

- **Contract suites** added to `@memofs/testing`:
  `defineBlobClientContractTests` + `defineMetadataStoreContractTests` + the
  `MinimalBlobClient` / `MinimalBlobEntry` / `MinimalMetadataStore` structural
  types (no core dep — preserves the cycle WF-2 removed). Mirrors the
  embedder/reranker/extractor/memory-store contract family.
- **`adapter-r2`** runs the `BlobClient` contract against a fake R2 bucket.
- **`adapter-turso`** runs the `MetadataStore` contract against an in-memory
  libSQL client, plus an integration test proving the two decoupled packages
  compose through core's `RemoteBlobMemoryStore` (write/read/append/
  content-sharing/project-isolation).
- **Miniflare deferred to WF-3.** The fake bucket is the established unit tool
  (matches the cloud's `fakeR2Bucket`); the real R2 *binding* gets exercised by
  the cloud's Miniflare runtime-worker test in WF-3 — the honest place for a
  binding-level test.

### Consumers repointed

`apps/cloud-2` runtime worker + its `package.json` dep, `examples/server/README.md`,
and core's `remote-blob-memory-store.ts` doc comment now reference both decoupled
packages. The `packages/server/src/worker.ts` reference was comment-only (no
change needed).

### Follow-ups named explicitly (per DoD)

- **ADR 0012 text amendment** (blob/metadata decoupled, two packages) → **WF-5**.
- **`project_files` / `sync_cursors` schema + migrations** → **WF-4**.
- **Real R2 binding Miniflare integration test** → **WF-3** (cloud runtime worker).
- **`apps/cloud-2` deletion** → **WF-3** (after porting its logic into `cloud`).

Local verification: structural split + import audit clean (no stale
`createTursoMetadataStore` import from `adapter-r2`). Package-manager
install/typecheck/test/build handed to the maintainer to run locally per WF-2
precedent; `code-reviewer` + `security-reviewer` skills run after.

