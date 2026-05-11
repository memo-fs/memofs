# Hosting

TekMemo packages run in any JavaScript environment. The key constraint is keeping Cloud API keys server-side.

| Runtime | Best for | See |
| --- | --- | --- |
| Node.js | Express, Fastify, NestJS, CLI tools, MCP servers, background jobs | [Node](./node) |
| Cloudflare Workers | Edge functions, Workers AI, D1-backed apps | [Cloudflare Workers](./cloudflare-workers) |
| Vercel | Next.js route handlers, server actions, edge middleware | [Vercel](./vercel) |
| Security principles | All runtimes | [Security](./security) |

## Minimum environment

```bash
TEKMEMO_CLOUD_URL=https://memo.tekbreed.com/api/v1
TEKMEMO_API_KEY=tk_live_...
TEKMEMO_PROJECT_ID=proj_...
```

## Client creation pattern

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL,
  apiKey: process.env.TEKMEMO_API_KEY,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID,
});
```
