# Self-host the `memofs-server` runtime

Run the **same** memory engine MemoFS Cloud runs, on your own infra. No vendor
lock-in, no MemoFS Cloud dependency — you bring the storage and the providers,
`memofs-server` runs the engine.

This example covers the two deploy targets: a **single Node process**
for self-hosters (Fly / Railway / Render / a VPS), and a **Cloudflare Worker**
for the cloud's two-Worker topology. Both run identical `memofs-server` code.

## What you need

- A **blob store** for the memory files (the file replica). At launch: an
  R2-compatible bucket (Cloudflare R2, MinIO, any S3-compatible endpoint).
- A **metadata store** for the file manifest. At launch: Turso / libSQL (free,
  easy). Postgres comes post-launch.
- **Providers** for intelligence (all optional — each has a deterministic
  default): an embedder, a reranker, an extractor, an LLM client. The canonical
  self-host bundle pairs the R2-compatible bucket + Turso with OpenAI for
  extraction and the LLM tier.

The deterministic defaults run zero-config (lexical recall, rule-based
extraction). Inject a provider adapter only to upgrade a slot.

## Deploy as a Node single process

The `memofs-server` bin boots a `node:http` server that serves the JSON-RPC
runtime API. Build once, run anywhere Node 22+ runs:

```bash
# From the repo root (builds every package, including @memofs/server)
pnpm install
pnpm packages:build

# Boot the server. Defaults to port 8787, in-memory store, auth off.
PORT=8787 node packages/server/dist/bin/memofs-server.mjs
```

Health check:

```bash
curl http://127.0.0.1:8787/health
# {"ok":true,"name":"memofs-server","version":"0.1.0"}
```

### Configure the bundle (storage + providers)

The bin ships a deterministic in-memory runtime so it boots out of the box. To
wire the real self-host bundle, build the runtime from your adapters and pass it
to the same `handleRuntimeRequest` core the bin uses:

```ts
import { createHostedRuntime, handleRuntimeRequest } from "@memofs/server";
import { createServer } from "node:http";
import { createR2BlobClient } from "@memofs/adapter-r2";
import { createTursoMetadataStore } from "@memofs/adapter-turso";
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

const runtime = createHostedRuntime({
  store: yourStore,           // RemoteBlobMemoryStore over R2 + Turso
  projectId: process.env.MEMOFS_PROJECT_ID!,
  embedder: createVoyageEmbedder({ apiKey: process.env.VOYAGE_API_KEY! }),
  // reranker, extractor, llmClient — inject what you need
});

createServer(async (req, res) => {
  // ...bridge req/res to a Web Request, then:
  const response = await handleRuntimeRequest(webRequest, { runtime });
  // ...write response back
}).listen(8787);
```

### Secure it

If the port is public, require a bearer token:

```bash
MEMOFS_SERVER_TOKEN="your-secret" node dist/bin/memofs-server.mjs
```

Setting `MEMOFS_SERVER_TOKEN` auto-enables auth. Clients send
`Authorization: Bearer your-secret`. Leave auth off only behind a private
network or a Service Binding.

## Deploy as a Cloudflare Worker

The cloud runs `@memofs/server` as the **runtime Worker** behind a Service
Binding (the two-Worker split). The Worker entry is
`packages/server/src/worker.ts`:

```ts
import { createRuntimeFetchHandler } from "@memofs/server/worker";

export default {
  fetch: createRuntimeFetchHandler({
    createRuntime: (env) => buildRuntimeFromBindings(env), // your bundle
    requireAuth: false, // behind a private Service Binding
  }),
};
```

`wrangler.jsonc` points `main` at the entry. This example shows the
runtime-Worker shape so a self-hoster can deploy the same Worker topology if
they prefer Cloudflare to Node.

## The runtime API (JSON-RPC over HTTP)

Both deploys serve the same surface — `POST /` with a JSON-RPC 2.0 body:

| Method | What it does | Status |
|---|---|---|
| `health` | Liveness probe | Live |
| `recall` | Semantic/hybrid recall | Live |
| `context` | Task briefing (progressive disclosure) | Live |
| `memory.readCore` / `readNotes` / `readConversations` | Read memory docs | Live |
| `memory.listRecent` / `validate` | Recent events / integrity | Live |
| `graph.listNodes` / `listEdges` / `neighbors` / `path` | Graph reads | Live |
| `snapshots.list` | List snapshots | Live |
| `memory.write` / `recordNote` / `updateCore` / `appendConversation` | **Mutating** | **Gated (`503`)** |
| `graph.upsertNodes` / `upsertEdges` | **Mutating** | **Gated (`503`)** |
| `consolidate` / `snapshots.create` / `snapshots.restore` | **Mutating** | **Gated (`503`)** |

### The write-gate (important)

Every mutating method returns **`503`** until the concurrency layer ships.
This is deliberate: concurrent writes to the same project would silently lose
data under last-writer-wins, so no write surface is reachable before the
serialization layer that makes writes safe exists. The gate is "method
rejects," never "method present unsafely."

Reads work fully today. To write memory programmatically before the gate lifts,
use the `MemoFS` client directly in-process (the engine supports writes; only
the *concurrent-over-HTTP* path is gated).

## See also

- [`@memofs/server` README](../../packages/server/README.md)
- [Full Documentation](https://docs.memofs.dev/packages/server/)
