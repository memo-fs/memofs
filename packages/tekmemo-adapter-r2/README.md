<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-adapter-r2"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo-adapter-r2?label=%40tekbreed%2Ftekmemo-adapter-r2&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-adapter-r2"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo-adapter-r2?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/packages/tekmemo/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

# `@tekbreed/tekmemo-adapter-r2`

## What is this?

**Cloudflare R2 + Turso/libSQL adapter for TekMemo's remote-blob memory store.**
Implements core's provider-neutral `BlobClient` and `MetadataStore` contracts so
the TekMemo runtime can read/write its canonical `.tekmemo/` files against R2
blobs + a Turso manifest — running the *same* runtime on hosted infra as on a
local filesystem (ADR 0003 / ADR 0012).

## Installation

```bash
npm install @tekbreed/tekmemo-adapter-r2
```

Peer dependencies: `@cloudflare/workers-types` (for the `R2Bucket` type) and
`@libsql/client` (for the metadata client). Both are optional peers — you only
need the one(s) you use.

## Quick Start

```ts
import { RemoteBlobMemoryStore } from "@tekbreed/tekmemo";
import {
  createR2BlobClient,
  createTursoMetadataStore,
} from "@tekbreed/tekmemo-adapter-r2";

const store = new RemoteBlobMemoryStore({
  blobClient: createR2BlobClient({ binding: env.BLOBS }),
  metadata: createTursoMetadataStore({ client: db.$client, projectId }),
  rootKey: projectId,
});

// The store implements MemoryStore — pass it to the Tekmemo runtime:
//   new Tekmemo({ store, projectId, mode: "local", ... })
```

## Reuse, not reinvent

The Turso metadata store reads/writes the **existing** `project_files` table
(`project_id`, `path`, `sha256`, `r2_key`, `size_bytes`, `updated_at` with a
unique `(project_id, path)` index) — the exact layout the cloud file-replica
sync handler manages. Blobs are content-addressed: the R2 key **is** the sha256
of the content, so the runtime and the sync handler share the same R2 objects.
One set of files; the runtime is a new reader/writer over them, not a parallel
store (ADR 0012 reuse sub-decision).

## Boundary

This package owns the Cloudflare R2 blob client + the Turso/libSQL metadata
store adapter implementations. It does not own the TekMemo core contracts
(`BlobClient` / `MetadataStore` / `RemoteBlobMemoryStore`), other adapters, or
the R2/Turso services themselves.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
