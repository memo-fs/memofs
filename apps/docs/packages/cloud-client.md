# `@tekmemo/cloud-client`

Project-scoped TekMemo Cloud API client.

## Install

```bash
pnpm add @tekmemo/cloud-client
```

## Create a client

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});

const core = await client.memory.readCore();
```

## Owns

- URL construction
- auth headers
- canonical `{ data, meta }` and `{ error, meta }` envelopes
- typed errors
- retries/timeouts where configured
- self-hosted cloud base URLs
- runtime helpers for CLI, MCP, and AI SDK integrations
