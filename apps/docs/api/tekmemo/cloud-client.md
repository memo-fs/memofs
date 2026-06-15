# Cloud Client Module

The cloud client module provides a project-scoped TekMemo Cloud API client.

## Import

All cloud client APIs are imported directly from `@tekbreed/tekmemo`:

## Create a client

```ts
import { createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});

const core = await client.memory.readCore();
```

## Features

- Automatic URL construction and auth headers
- Canonical `{ data, meta }` and `{ error, meta }` response envelopes
- Typed errors with status codes and request IDs
- Configurable retries and timeouts
- Works with self-hosted TekMemo Cloud base URLs
- Runtime helpers for CLI, MCP, and AI SDK integrations
