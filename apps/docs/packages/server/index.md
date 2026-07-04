# Server Deployment

`@tekmemo/server` is the self-hostable, open-source hosted memory server for TekMemo. It runs the exact same local-first memory engine the cloud runs but is packaged as a standard web server that you can deploy to Node.js or Cloudflare Workers.

---

## Features

- **Provider-Neutral Factory:** Resolves embedders, storage backends, and LLM clients strictly through dependency injection.
- **Node.js Binary:** Includes a CLI binary (`tekmemo-server`) to start Node servers immediately.
- **Worker Entry Point:** Subpath exports for deployment to Cloudflare Workers.
- **JSON-RPC over HTTP Protocol:** Exposes memory commands (`recall`, `context`, `graph`, `memory`) over standard POST requests.

---

## Deployment Option A: Node.js Server

You can run TekMemo Server as a standalone Node.js process using the published bin command.

### Installation

Install the package globally or locally in your deployment workspace:

```bash
npm install -g @tekmemo/server
```

### Running the Server

Start the server by running:

```bash
tekmemo-server --port 8080 --rootDir ./.tekmemo
```

---

## Deployment Option B: Cloudflare Workers

Because `@tekmemo/server` is written using Worker-safe primitives, you can deploy it directly behind Cloudflare Workers.

### Setup and Import

Configure your Worker script to use the `./worker` subpath export:

```ts
import { createRuntimeFetchHandler } from "@tekmemo/server/worker";
import { createR2BlobClient } from "@tekmemo/adapter-r2";
import { createTursoMetadataStore } from "@tekmemo/adapter-turso";

export default {
  async fetch(request, env, ctx) {
    const handler = createRuntimeFetchHandler({
      store: createR2BlobClient({ bucket: env.BUCKET }),
      recallStore: createTursoMetadataStore({ url: env.TURSO_URL }),
    });
    return handler(request, env, ctx);
  }
};
```

---

## API Protocol (JSON-RPC 2.0)

All communication with TekMemo Server uses the JSON-RPC 2.0 protocol over `POST /rpc`.

### Example: Querying Memory (Recall)

Send a JSON payload to search the memory store:

**Request (`POST /rpc`):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "recall",
  "params": {
    "query": "how to deploy database",
    "limit": 3
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "items": [
      {
        "content": "Database migrations run via Drizzle Migrator.",
        "score": 0.89,
        "source": { "kind": "notes", "path": "memory/notes.md" }
      }
    ]
  }
}
```
