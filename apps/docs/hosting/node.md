# Node.js hosting

Use Node for Express, Fastify, NestJS, CLI tools, MCP servers, and background jobs.

## Setup

```bash
npm install @tekmemo/cloud-client
```

## Express example

```ts
import express from "express";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const app = express();
const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

app.get("/api/memory", async (req, res) => {
  const context = await client.context.compose({ query: req.query.q });
  res.json(context);
});

app.listen(3000);
```

## Fastify example

```ts
import Fastify from "fastify";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const fastify = Fastify();
const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

fastify.get("/api/memory", async (req) => {
  const { q } = req.query as { q?: string };
  return client.context.compose({ query: q });
});

fastify.listen({ port: 3000 });
```

## NestJS example

```ts
import { Injectable, Module, Controller, Get, Query } from "@nestjs/common";
import { createTekMemoCloudClient, type TekMemoCloudClient } from "@tekmemo/cloud-client";

@Injectable()
export class MemoryService {
  private client: TekMemoCloudClient;

  constructor() {
    this.client = createTekMemoCloudClient({
      baseUrl: process.env.TEKMEMO_CLOUD_URL!,
      apiKey: process.env.TEKMEMO_API_KEY!,
      defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
    });
  }

  async compose(query?: string) {
    return this.client.context.compose({ query });
  }
}

@Controller("api/memory")
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Get()
  async getContext(@Query("q") q?: string) {
    return this.memory.compose(q);
  }
}

@Module({ controllers: [MemoryController], providers: [MemoryService] })
export class MemoryModule {}
```

## CLI and MCP

```bash
# CLI
TEKMEMO_CLOUD_URL=https://memo.tekbreed.com/api/v1 \
TEKMEMO_API_KEY=tk_live_... \
TEKMEMO_PROJECT_ID=proj_... \
npx @tekmemo/cli context compose --query "auth middleware"

# MCP server
npx @tekmemo/mcp-server --runtime cloud
```

## Production checklist

- Set `NODE_ENV=production`
- Use process managers (PM2, systemd) or container orchestration
- Configure request timeouts appropriate to your memory operations
- Use least-privilege API keys scoped to specific projects
