# API Reference

## `createHostedRuntime(options)`

Assembles a `MemoFS` instance from injected adapters. Provider-neutral — never reads env vars, never imports an adapter package.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `MemoryStore` | Yes | The memory store (file replica) |
| `projectId` | `string` | Yes | Project ID scoping this runtime |
| `embedder` | `MemoryEmbedder` | No | Inject for hybrid (vector) recall |
| `recallStore` | `RecallStore` | No | Persisted embeddings store |
| `reranker` | `Reranker` | No | Inject for semantic reranking |
| `extractor` | `Extractor` | No | Inject for frontier graph extraction |
| `llmClient` | `LlmClient` | No | Inject for LLM-enhanced intelligence |
| `name` | `string` | No | Runtime name (health output). Default: `"memofs-server"` |
| `version` | `string` | No | Runtime version (health output). Default: `"0.1.0"` |

## `handleRuntimeRequest(request, options)`

Framework-free HTTP core. Takes a Web `Request` + an assembled `MemoFS` runtime + options, returns a Web `Response`.

| Option | Type | Description |
|--------|------|-------------|
| `runtime` | `MemoFS` | The assembled runtime (required) |
| `requireAuth` | `boolean` | Require a bearer token on `POST /` |
| `bearerToken` | `string` | The expected bearer token |
| `allowedOrigins` | `readonly string[]` | Allowed browser origins for CORS |

## `createRuntimeFetchHandler(options)`

Cloudflare Worker fetch handler factory.

| Option | Type | Description |
|--------|------|-------------|
| `createRuntime` | `(env) => MemoFS` | Builds the runtime from Worker bindings |
| `requireAuth` | `boolean` | Require a bearer token |

## See Also

- [Self-host deploy guide](https://github.com/memo-fs/memofs/tree/main/examples/server)
- [Core Client API](/packages/core/client/)
- [Configuration](/packages/core/configuration)
