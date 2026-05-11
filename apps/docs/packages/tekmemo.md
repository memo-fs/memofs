# `tekmemo`

Core runtime package for file-first memory.

## Install

```bash
pnpm add tekmemo
```

## Use it

```ts
import { createMemoryRuntime } from "tekmemo";

const runtime = createMemoryRuntime();
```

## Owns

- memory record contracts
- runtime interfaces
- validation helpers
- provider-neutral memory behavior

## Does not own

- filesystem persistence
- cloud API calls
- billing
- dashboards
- vector provider secrets
