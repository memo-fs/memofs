# Cloud Client Module

The cloud client module provides a project-scoped TekMemo Cloud API client.

## Import

Cloud client APIs are available from two entrypoints:

```ts
// Root entrypoint (re-exported)
import { createTekMemoCloudClient, isTekMemoCloudError } from "@tekbreed/tekmemo";

// Dedicated subpath entrypoint (tree-shakeable)
import {
  createTekMemoCloudClient,
  createTekMemoCloudClientFromEnv,
  createProjectScopedClient,
  isTekMemoCloudError,
} from "@tekbreed/tekmemo/cloud-client";
```

## Create a client

### Manual configuration

```ts
import { createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});

const core = await client.memory.readCore();
```

### From environment variables

```ts
import { createTekMemoCloudClientFromEnv } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClientFromEnv(process.env);
```

Reads `TEKMEMO_CLOUD_URL` (or `TEKMEMO_API_URL`), `TEKMEMO_API_KEY`, `TEKMEMO_PROJECT_ID`, and `TEKMEMO_WORKSPACE_ID`.

### Project-scoped wrapper

```ts
import { createTekMemoCloudClient, createProjectScopedClient } from "@tekbreed/tekmemo";

const baseClient = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
});

const client = createProjectScopedClient(baseClient, "proj_123");
// All calls automatically include projectId: "proj_123"
```

## Features

- Automatic URL construction and auth headers
- Canonical `{ data, meta }` and `{ error, meta }` response envelopes
- Typed errors with status codes and request IDs
- Configurable retries and timeouts
- Works with self-hosted TekMemo Cloud base URLs
- Runtime helpers for CLI, MCP, and AI SDK integrations

## Error handling

```ts
import { isTekMemoCloudError, redactSecrets } from "@tekbreed/tekmemo";

try {
  await client.memory.readCore();
} catch (error) {
  if (isTekMemoCloudError(error)) {
    console.error(error.code, error.status, error.requestId);
  }
}
```

The SDK automatically redacts common secret patterns (`tk_live_...`, `Bearer ...`, provider keys) from error messages.

## See also

- [`Cloud Client` guide](/packages/tekmemo/cloud-client) for the full API reference and route map
- [`Errors`](/packages/tekmemo/errors) for the complete error hierarchy
