# Local testing

Use local and memory runtimes for fast tests.

## CLI validation

```bash
tekmemo validate --root .
```

## In-memory runtime

Use the in-memory runtime for package tests and documentation examples.

```ts
import { createMemoryRuntime } from "tekmemo";

const runtime = createMemoryRuntime();
```

## What to test

- core memory reads
- note creation
- context packing
- graph node/edge behavior
- secret rejection
- sync event shape
- error handling
