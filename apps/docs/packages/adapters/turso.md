# Turso / libSQL Adapter (`@tekmemo/adapter-turso`)

The `@tekmemo/adapter-turso` adapter integrates Turso and libSQL databases into TekMemo, providing a query-optimized metadata axis for index matching, graph relationships, and semantic search tracking.

---

## Installation

```bash
npm install @tekmemo/adapter-turso
```

---

## Usage

Inject Turso to handle index recall storage:

```ts
import { Tekmemo } from "@tekmemo/core";
import { createTursoMetadataStore } from "@tekmemo/adapter-turso";
import { createNodeFsMemoryStore } from "@tekmemo/core/node-fs";

const memo = new Tekmemo({
  store: createNodeFsMemoryStore({ rootDir: "./.tekmemo" }),
  projectId: "turso-project",
  
  // Inject Turso/libSQL for metadata tracking
  recallStore: createTursoMetadataStore({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});
```

---

## Configuration API (`TursoMetadataStoreConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Database endpoint URL (supports `libsql://`, `https://`, `file:`). |
| `authToken` | `string` | No | Authentication token for remote Turso databases. |
| `tableName` | `string` | No | Database table name to use (default: `"tekmemo_metadata"`). |
