# Cloud client

`@tekmemo/cloud-client` is the shared Cloud API boundary for TekMemo packages.

CLI, MCP, AI SDK tools, and custom apps should use this package instead of building raw Cloud URLs.

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
```

Responses use canonical `{ data, meta }` and `{ error, meta }` envelopes.
