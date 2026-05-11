# Vector adapters

TekMemo vector adapters connect recall to external vector stores.

## Upstash Vector

```bash
pnpm add @tekmemo/upstash-vector
```

Provider keys and credentials should be supplied by the caller. Low-level adapters do not own billing or hosted credential storage.

## Convenience import

```ts
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
```

This reexports `@tekmemo/upstash-vector` through the adapters package. Install `@upstash/vector` when using this adapter.
