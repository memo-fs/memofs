---
title: "@memofs/adapter-turso"
description: "Turso / libSQL metadata manifest adapter for MemoFS remote-blob memory stores."
---

# Turso / libSQL Adapter (`@memofs/adapter-turso`)

The `@memofs/adapter-turso` adapter implements MemoFS's [`MetadataStore`](/api/core#metadatastore) contract over a Turso or libSQL SQLite database.

It manages the canonical file manifest (`path` → `BlobEntry` mapping) and provides transactional serialization (`BEGIN IMMEDIATE`) to prevent concurrent write hazards in distributed environments.

## Installation

::: code-group

```sh [pnpm]
pnpm add @memofs/adapter-turso @libsql/client
```

```sh [npm]
npm install @memofs/adapter-turso @libsql/client
```

```sh [yarn]
yarn add @memofs/adapter-turso @libsql/client
```

```sh [bun]
bun add @memofs/adapter-turso @libsql/client
```

:::

> [!NOTE]
> Requires **Node.js >= 22** or the **Cloudflare Workers** runtime.

## Usage

Create a `MetadataStore` with `createTursoMetadataStore()` and pass it alongside a `BlobClient` to `RemoteBlobMemoryStore`:

```ts
import { MemoFS, RemoteBlobMemoryStore } from "@memofs/core";
import { createTursoMetadataStore } from "@memofs/adapter-turso";
import { createR2BlobClient } from "@memofs/adapter-r2";
import { createClient } from "@libsql/client";

// 1. Create a libSQL client instance
const dbClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const projectId = "my-project-123";

// 2. Instantiate the Turso metadata store
const metadata = createTursoMetadataStore({
  client: dbClient,
  projectId,
});

// 3. Compose with an R2 blob client into a RemoteBlobMemoryStore
const store = new RemoteBlobMemoryStore({
  blobClient: createR2BlobClient({ binding: env.BLOBS }),
  metadata,
  rootKey: projectId,
});

// 4. Initialize MemoFS
const memo = new MemoFS({
  store,
  projectId,
  mode: "local",
});
```

## Schema & Manifest Architecture

`@memofs/adapter-turso` operates against the `project_files` table, matching the MemoFS cloud replication layout:

```sql
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, path)
);
```

### Manifest Operations

* **`getEntry(path)`:** Queries `SELECT sha256, r2_key, size_bytes FROM project_files WHERE project_id = ? AND path = ?`.
* **`upsertEntry(path, entry)`:** Performs `INSERT ... ON CONFLICT (project_id, path) DO UPDATE SET sha256 = excluded.sha256, r2_key = excluded.r2_key, size_bytes = excluded.size_bytes, updated_at = current_timestamp`.
* **`deleteEntry(path)`:** Runs `DELETE FROM project_files WHERE project_id = ? AND path = ?`.
* **`listEntries()`:** Streams all registered canonical paths for the project via `SELECT path, sha256, r2_key, size_bytes FROM project_files WHERE project_id = ?`.

## Concurrency Control (`withTransaction`)

When multiple AI coding agents write to the same project concurrently, interleaving non-atomic file writes can cause file corruption.

`@memofs/adapter-turso` implements `MetadataStore.withTransaction`:
1. Opens a serialized transaction using `BEGIN IMMEDIATE`.
2. Guarantees that mutating operations (`write`, `append`, `delete`) execute atomically.
3. Automatically commits on success (`COMMIT`) or rolls back on exceptions (`ROLLBACK`).

## Configuration API (`CreateTursoMetadataStoreOptions`)

The `createTursoMetadataStore(options)` factory accepts `CreateTursoMetadataStoreOptions`:

| Option | Type | Required | Description |
|---|---|---|---|
| `client` | `Client` | **Yes** | An initialized `@libsql/client` instance (or Drizzle's `db.$client`). |
| `projectId` | `string` | **Yes** | The project identifier scoping this manifest. |

## See Also

- [Adapters Overview](/adapters/)
- [Cloudflare R2 Adapter Reference](/adapters/r2)
- [RemoteBlobMemoryStore API Reference](/api/core#remoteblobmemorystore)
- [Self-Hosting on Cloudflare](/server/cloudflare)

