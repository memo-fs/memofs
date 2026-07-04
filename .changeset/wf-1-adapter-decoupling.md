---
"@tekmemo/adapter-r2": minor
"@tekmemo/adapter-turso": minor
"@tekmemo/testing": minor
---

# Blob/metadata-decoupled adapter contract (WF-1)

Splits the bundled `@tekmemo/adapter-r2` (R2 blob **+** Turso metadata) into the
N+M adapter shape the S3 reconciliation (K1 + S3-Q3) mandates: `adapter-r2`
blob-only + a new `@tekmemo/adapter-turso` metadata-only.

## What changed

- **`@tekmemo/adapter-turso`** (new package): holds `createTursoMetadataStore`,
  moved verbatim from `adapter-r2`. Implements core's `MetadataStore` over the
  cloud's existing `project_files` table. Raw libSQL (no drizzle), no
  migrations — a consumer of the cloud-owned schema.
- **`@tekmemo/adapter-r2`**: slimmed to blob-only (`createR2BlobClient`).
  Dropped the `@libsql/client` peer + dev dependency. The metadata export moved
  to `adapter-turso`.
- **`@tekmemo/testing`**: added `defineBlobClientContractTests` +
  `defineMetadataStoreContractTests` + the `MinimalBlobClient` /
  `MinimalBlobEntry` / `MinimalMetadataStore` structural types, mirroring the
  existing embedder/reranker/extractor/memory-store contract family.
- **Consumers repointed**: `apps/cloud-2` runtime worker + its `package.json`
  dep, and `examples/server/README.md`, now import the two adapters from their
  decoupled packages.
- **SSOT docs**: `package-naming.md` + `monorepo-structure.md` reflect the new
  package; `adapter-r2` description corrected to "Cloudflare R2 blob adapter".

## What's unchanged

- **Core contracts** (`BlobClient`, `MetadataStore`, `BlobEntry`,
  `RemoteBlobMemoryStore`) were already provider-neutral and Cloudflare-free in
  `@tekmemo/core` — no change there (Q3 confirmed done).
- **Content addressing** (`r2_key === sha256`) and **schema ownership**
  (`project_files` owned by the cloud's drizzle layer, adapters consume) are
  unchanged — the split is purely a package-boundary correction.
- **No runtime coupling** between the two adapters: they compose through core's
  `RemoteBlobMemoryStore`, proven by the new adapter-turso integration test.

## Why

The bundled adapter coupled two independent provider roles (blob storage +
metadata storage) into one N×M package, forcing every blob-backend ×
metadata-backend pair to ship together. The decoupled N+M shape lets a Node
self-hoster pair the Turso metadata store with any `BlobClient` (S3, GCS,
MinIO), or a future `@tekmemo/adapter-s3` blob client with the Turso metadata
store, without touching the runtime — honoring ADR 0003's "self-host the same
engine" thesis.

## Out of scope (named follow-ups)

- ADR 0012 text amendment (blob/metadata decoupled, two packages) → **WF-5**.
- `project_files` / `sync_cursors` schema + migrations → **WF-4**.
- Real R2 binding Miniflare integration test → **WF-3** (cloud runtime worker).
