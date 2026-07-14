# Turso / libSQL Adapter (`@memofs/adapter-turso`)

The `@memofs/adapter-turso` adapter integrates Turso and libSQL databases into MemoFS, providing a query-optimized metadata axis for index matching, graph relationships, and semantic search tracking.

## Installation

::: code-group

```sh [npm]
npm install @memofs/adapter-turso
```

```sh [pnpm]
pnpm add @memofs/adapter-turso
```

```sh [yarn]
yarn add @memofs/adapter-turso
```

```sh [bun]
bun add @memofs/adapter-turso
```

```sh [deno]
deno add npm:@memofs/adapter-turso
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

## Usage

Inject Turso to handle index recall storage:

```ts
import { MemoFS } from "@memofs/core";
import { createTursoMetadataStore } from "@memofs/adapter-turso";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "./.memofs" }),
  projectId: "turso-project",
  
  // Inject Turso/libSQL for metadata tracking
  recallStore: createTursoMetadataStore({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});
```

## Configuration API (`TursoMetadataStoreConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Database endpoint URL (supports `libsql://`, `https://`, `file:`). |
| `authToken` | `string` | No | Authentication token for remote Turso databases. |
| `tableName` | `string` | No | Database table name to use (default: `"memofs_metadata"`). |
