# WF-1 — R2 blob adapter + Turso metadata adapter portable contract

`wayfinder:grilling` · status: open · claimed: yes · blocked-by: none

## Question

Design the reconciled remote-blob storage contract after WF-2's package rename.
The old bundled `@tekmemo/adapter-cloudflare` / D1 direction is superseded by
K1 and S3-Q3: keep storage provider roles decoupled so the package set is N+M,
not N×M.

Decide the contract and package responsibilities for:

1. **`@tekmemo/adapter-r2`** — Cloudflare R2 blob storage only. Confirm the
   public factory shape, streaming behavior, error mapping, and test coverage
   for the `BlobClient` side of `RemoteBlobMemoryStore`.
2. **`@tekmemo/adapter-turso`** — Turso/libSQL metadata storage only. Decide
   whether this should be a new package now or remain temporarily inside
   `@tekmemo/adapter-r2` until extraction. Define the table shape and migration
   ownership for `project_files` / `sync_cursors`.
3. **Core interfaces** — keep `BlobClient` and `MetadataStore` provider-neutral
   in `@tekmemo/core` so Node self-hosters can implement S3/GCS/MinIO/etc.
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
