# @tekmemo/server

Hono-based TekMemo memory server for self-hosted deployments.

The package contains the runtime-neutral API layer used by the Docker and Cloudflare self-host templates. It is intentionally separate from TekMemo Cloud billing, marketing, CMS, and SaaS-only features.

```ts
import { createInMemoryTekMemoServer } from "@tekmemo/server";

const app = createInMemoryTekMemoServer();
```

Use this package when you want to expose a TekMemo-compatible `/api/v1` HTTP API that works with `@tekmemo/cloud-client`.
