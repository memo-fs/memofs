# Cloudflare Workers

The `@memofs/server/worker` subpath export provides the Worker entry point.

```ts
import { createRuntimeFetchHandler } from "@memofs/server/worker";

export default {
  fetch: createRuntimeFetchHandler({
    createRuntime: (env) => buildRuntimeFromBindings(env),
    requireAuth: false, // behind a private Service Binding
  }),
};
```

`createRuntimeFetchHandler` takes a `createRuntime` function that builds a `MemoFS` instance from Worker bindings (R2, D1/Turso, AI, etc.) and an optional `requireAuth` flag. The runtime is built lazily per invocation.