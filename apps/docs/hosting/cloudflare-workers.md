# Cloudflare Workers

Use Workers environment bindings for secrets. TekMemo Cloud works on Workers, Pages Functions, and Durable Objects.

## Setup

```bash
pnpm add @tekmemo/cloud-client
```

## Worker example

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

export interface Env {
  TEKMEMO_CLOUD_URL: string;
  TEKMEMO_API_KEY: string;
  TEKMEMO_PROJECT_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createTekMemoCloudClient({
      baseUrl: env.TEKMEMO_CLOUD_URL,
      apiKey: env.TEKMEMO_API_KEY,
      defaultProjectId: env.TEKMEMO_PROJECT_ID,
    });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const context = await client.context.compose({ query });
    return Response.json(context);
  },
};
```

## wrangler.toml

```toml
name = "tekmemo-worker"
main = "src/index.ts"

[vars]
TEKMEMO_CLOUD_URL = "https://memo.tekbreed.com/api/v1"

# Use `wrangler secret put` for these:
# TEKMEMO_API_KEY
# TEKMEMO_PROJECT_ID
```

Set secrets:

```bash
wrangler secret put TEKMEMO_API_KEY
wrangler secret put TEKMEMO_PROJECT_ID
```

## Hono on Workers

```ts
import { Hono } from "hono";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

type Bindings = {
  TEKMEMO_CLOUD_URL: string;
  TEKMEMO_API_KEY: string;
  TEKMEMO_PROJECT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/memory", async (c) => {
  const client = createTekMemoCloudClient({
    baseUrl: c.env.TEKMEMO_CLOUD_URL,
    apiKey: c.env.TEKMEMO_API_KEY,
    defaultProjectId: c.env.TEKMEMO_PROJECT_ID,
  });

  const q = c.req.query("q");
  const context = await client.context.compose({ query: q });
  return c.json(context);
});

export default app;
```

## Caching

Consider caching composed context with Workers KV or Cache API for repeated queries:

```ts
const cacheKey = new Request(`https://cache.internal/memory?q=${query}`);
const cached = await caches.default.match(cacheKey);
if (cached) return cached;

const context = await client.context.compose({ query });
const response = Response.json(context);
caches.default.put(cacheKey, response.clone());
return response;
```
