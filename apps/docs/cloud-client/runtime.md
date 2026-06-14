# Cloud runtime helpers

The cloud client module can create runtime objects used by CLI, MCP, and AI SDK helpers.

```ts
import { createCloudTekMemoRuntime, createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
});

const runtime = createCloudTekMemoRuntime({
  client,
  projectId: "proj_123",
});

await runtime.recall({ query: "billing" });
```

Hybrid runtimes combine local and cloud runtimes with read/write policies.
