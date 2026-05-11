# Cloud client quickstart

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

await client.memory.createNote({
  kind: "decision",
  content: "Use local-first sync for developer workflows.",
  tags: ["sync"],
});

const context = await client.context.compose({
  query: "sync design",
  topK: 8,
});
```

## Self-hosted Cloud

Set `baseUrl` to your own Cloud deployment ending in `/api/v1`.
