# Node.js Server

The `memofs-server` bin boots a `node:http` server that serves the JSON-RPC runtime API.

Install globally if you want the `memofs-server` binary on your PATH:

::: code-group

```sh [npm]
npm install -g @memofs/server
```

```sh [pnpm]
pnpm add -g @memofs/server
```

```sh [yarn]
yarn global add @memofs/server
```

```sh [bun]
bun add -g @memofs/server
```

```sh [deno]
deno install -g --allow-all npm:@memofs/server
```

:::
>Requires Node >= 22

```bash
# Boot the server (defaults to port 8787, in-memory store, auth off)
PORT=8787 memofs-server
```

Health check:

```bash
curl http://127.0.0.1:8787/health
# {"ok":true,"name":"memofs-server","version":"0.1.0"}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `8787` |
| `MEMOFS_SERVER_TOKEN` | Bearer token for auth (auto-enables auth when set) | — |
| `MEMOFS_SERVER_REQUIRE_AUTH` | Explicitly require auth (`"true"`) | — |
| `MEMOFS_PROJECT_ID` | Project ID for the runtime | `"self-host"` |

## Configure the Bundle

The bin ships a deterministic in-memory runtime so it boots out of the box. To wire the real self-host bundle, build the runtime from your adapters and pass it to `handleRuntimeRequest`:

```ts
import { createHostedRuntime, handleRuntimeRequest } from "@memofs/server";
import { createServer } from "node:http";

const runtime = createHostedRuntime({
  store: yourStore,           // e.g. RemoteBlobMemoryStore over R2 + Turso
  projectId: process.env.MEMOFS_PROJECT_ID!,
  embedder: yourEmbedder,     // optional
  // reranker: inject yours (optional), 
  // extractor: inject yours (optional), 
  // llmClient: inject yours (optional)
});

createServer(async (req, res) => {
  // Bridge req/res to a Web Request, then:
  const response = await handleRuntimeRequest(webRequest, {
    runtime,
    requireAuth: true,
    bearerToken: process.env.MEMOFS_SERVER_TOKEN,
  });
  // Write response back...
}).listen(8787);
```

## Secure It

If the port is public, require a bearer token:

```bash
MEMOFS_SERVER_TOKEN="your-secret" memofs-server
```

Setting `MEMOFS_SERVER_TOKEN` auto-enables auth. Clients send `Authorization: Bearer your-secret`. Leave auth off only behind a private network or a Service Binding.
