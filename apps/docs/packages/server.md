# @tekmemo/server

`@tekmemo/server` is the Hono-based API layer for self-hosted TekMemo memory servers.

It is not TekMemo Cloud. It excludes billing, public marketing pages, CMS content, hosted signup, and SaaS-only workflows.

## Root import

Use the root import for runtime-neutral app construction and contracts:

```ts
import { createTekMemoServer } from "@tekmemo/server";
```

The root import intentionally avoids Node-only dependencies so Cloudflare Workers can keep using the shared Hono app.

## Node import

Use the Node subpath for Node/Docker/Railway/Fly deployments:

```ts
import {
	createNodeTekMemoObjectStore,
	createNodeTekMemoQueue,
	createNodeTekMemoStore,
} from "@tekmemo/server/node";
```

The Node runtime supports:

- Postgres memory persistence.
- `pgvector` extension-ready schema.
- Postgres-backed job queue.
- S3-compatible object storage.
- Local filesystem object storage for development.

## Portable Node app

The recommended Node deployment target is `apps/self-host-node`.

It can run as one API process plus one worker process from the same image:

```bash
pnpm --filter @tekmemo/self-host-node server
pnpm --filter @tekmemo/self-host-node worker
```

This is the correct path for Railway, Fly.io, Render, Coolify, Northflank, and similar hosts.

## Docker Compose

`apps/self-host-docker` is packaging around the Node runtime. It starts:

- `tekmemo-api`
- `tekmemo-worker`
- `postgres` with pgvector
- `minio` for S3-compatible object storage

```bash
cp apps/self-host-docker/.env.example apps/self-host-docker/.env
docker compose -f apps/self-host-docker/docker-compose.yml up --build
```

## Compatible client

Use `@tekmemo/cloud-client` against the self-hosted base URL:

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
	baseUrl: "http://localhost:8787/api/v1",
	apiKey: process.env.TEKMEMO_API_KEY,
	defaultProjectId: "default",
});
```

## Status

Node/Docker now has a durable baseline. Cloudflare still uses the in-memory alpha wrapper and should be upgraded next with D1, R2, and Cloudflare Queues adapters.
