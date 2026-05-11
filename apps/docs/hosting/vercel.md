# Vercel

Use server routes, server actions, or edge middleware. Never expose `TEKMEMO_API_KEY` to browser bundles.

## Next.js App Router

### Server action

```ts
// app/actions.ts
"use server";

import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

export async function getContext(query: string) {
  return client.context.compose({ query });
}
```

### Route handler

```ts
// app/api/memory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const context = await client.context.compose({ query });
  return NextResponse.json(context);
}
```

## Environment variables

Set in Vercel dashboard or `vercel env add`:

```bash
TEKMEMO_CLOUD_URL=https://memo.tekbreed.com/api/v1
TEKMEMO_API_KEY=tk_live_...
TEKMEMO_PROJECT_ID=proj_...
```

## Edge runtime

```ts
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const client = createTekMemoCloudClient({
    baseUrl: process.env.TEKMEMO_CLOUD_URL!,
    apiKey: process.env.TEKMEMO_API_KEY!,
    defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
  });
  // ... same pattern as above
}
```

## Security checklist

- Mark env vars with `!` or validate them at startup
- Keep `TEKMEMO_API_KEY` out of `NEXT_PUBLIC_*` prefixed variables
- Use `"use server"` directives for server actions
- Avoid importing cloud client in client components
