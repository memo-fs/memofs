# `@memofs/server` API

The `@memofs/server` package exports the hosted runtime assembly factories and HTTP handlers.

## Functions

### `createHostedRuntime`
Assembles a unified `Tekmemo` client using an injected storage and optional intelligence adapters.

```ts
function createHostedRuntime(options: HostedRuntimeOptions): Tekmemo;
```

### `handleRuntimeRequest`
Parses and dispatches HTTP POST payloads containing JSON-RPC 2.0 requests.

```ts
function handleRuntimeRequest(
  request: Request,
  options: RuntimeHttpOptions
): Promise<Response>;
```

### `createRuntimeFetchHandler`
Creates a Cloudflare Workers-compatible fetch handler.

```ts
function createRuntimeFetchHandler(
  options: RuntimeFetchHandlerOptions
): RuntimeFetchHandler;
```
