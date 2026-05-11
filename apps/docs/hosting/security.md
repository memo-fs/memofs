# Hosting security

## Rules for all runtimes

| Rule | Why |
| --- | --- |
| Keep secrets server-side | `TEKMEMO_API_KEY` grants full project access |
| Use least-privilege API keys | Scope keys to specific projects |
| Set request timeouts | Protect against hanging memory operations |
| Validate user input | Don't pass raw user input directly to memory writes |
| Don't store secrets in memory | Evict after use, don't log |

## Secret management by platform

| Platform | Mechanism |
| --- | --- |
| Node.js | `process.env` (loaded via dotenv, never committed) |
| Cloudflare Workers | `env` bindings, `wrangler secret put` |
| Vercel | Dashboard env vars, `vercel env add` |
| Netlify | Build environment variables |
| Deno Deploy | Environment variables in dashboard |
| Docker | Secrets mounted via file or env |

## Input validation

Before writing memory from user-supplied content:

```ts
import { z } from "zod";

const memoryInput = z.object({
  path: z.string().startsWith(".tekmemo/memory/"),
  content: z.string().min(1).max(100_000),
});

async function safeWrite(client: TekMemoCloudClient, input: unknown) {
  const { path, content } = memoryInput.parse(input);
  await client.memory.write(path, content, { source: "api" });
}
```

## Rate limiting

Use your framework's rate limiting middleware to protect memory endpoints:

```ts
// Express
import rateLimit from "express-rate-limit";
const limiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use("/api/memory", limiter);

// Hono
import { rateLimiter } from "hono-rate-limiter";
app.use("/api/memory", rateLimiter({ windowMs: 60_000, limit: 100 }));
```

## Request timeouts

```ts
const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
  timeout: 30_000, // 30 second timeout
});
```
