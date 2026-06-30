## Package Naming Convention

This repo uses namespaces and conventions to keep public OSS packages, internal tooling, and private apps separated:

### Public OSS Packages (`@tekbreed` Scope)

These packages are published to npm under the `@tekbreed` scope:

| Package directory | Published name | Scope | Description |
|---|---|---|---|
| `packages/tekmemo` | `@tekbreed/tekmemo` | `@tekbreed` | Core memory runtime for AI apps and agents |
| `packages/tekmemo-adapter-ai-sdk` | `@tekbreed/tekmemo-adapter-ai-sdk` | `@tekbreed` | Vercel AI SDK adapter, memory tool, runtime bridge |
| `packages/tekmemo-adapter-openai` | `@tekbreed/tekmemo-adapter-openai` | `@tekbreed` | OpenAI embedder adapter |
| `packages/tekmemo-adapter-r2` | `@tekbreed/tekmemo-adapter-r2` | `@tekbreed` | Cloudflare R2 + Turso/libSQL remote-blob adapter |
| `packages/tekmemo-adapter-transformers` | `@tekbreed/tekmemo-adapter-transformers` | `@tekbreed` | Local ONNX embedder adapter (Transformers.js) |
| `packages/tekmemo-adapter-voyage` | `@tekbreed/tekmemo-adapter-voyage` | `@tekbreed` | Voyage AI embedder/reranker adapter |
| `packages/tekmemo-adapter-workers-ai` | `@tekbreed/tekmemo-adapter-workers-ai` | `@tekbreed` | Cloudflare Workers AI extractor adapter |
| `packages/tekmemo-benchmark-kit` | `@tekbreed/tekmemo-benchmark-kit` | `@tekbreed` | Benchmark workloads and runner library |
| `packages/tekmemo-cli` | `@tekbreed/tekmemo-cli` | `@tekbreed` | CLI tool for local memory inspection |
| `packages/tekmemo-connectors` | `@tekbreed/tekmemo-connectors` | `@tekbreed` | Local connector framework (GitHub, Notion, etc.) |
| `packages/tekmemo-mcp-server` | `@tekbreed/tekmemo-mcp-server` | `@tekbreed` | Model Context Protocol (MCP) server |
| `packages/tekmemo-testing` | `@tekbreed/tekmemo-testing` | `@tekbreed` | Shared contract tests and mock drivers |

### Internal Workspace Tooling (`@repo` Scope)

Internal packages under the `@repo` scope are strictly for local workspace tooling and must never be published externally:

| Package directory | Published name | Scope | Description |
|---|---|---|---|
| `tooling/tsdown` | `@repo/tsdown` | `@repo` | Shared tsdown base build configurations |
| `tooling/typescript` | `@repo/typescript` | `@repo` | Shared tsconfig base configurations |
| `tooling/utils` | `@repo/utils` | `@repo` | Shared internal workspace utilities |

### Private Applications and Workspaces

These workspaces are marked `"private": true` and are not published:

| Directory | Name | Type | Description |
|---|---|---|---|
| `apps/cloud` | `@tekbreed/tekmemo-cloud` | Cloud App | Cloud application running on Cloudflare Workers/Pages |
| `apps/docs` | `@tekbreed/docs` | Docs App | Documentation site built with VitePress |
| `benchmarks` | `@tekbreed/benchmarks` | Benchmark Runner | Performance benchmarking runner |
| `examples` | `@tekbreed/examples` | Examples | Example integration projects (AI SDK, Next.js, etc.) |

**Rule:** Public OSS packages must be published under the `@tekbreed` scope. Internal workspace tooling is published under the `@repo/*` scope and is never published externally. Private applications or workspaces are marked private.

When referencing internal tooling or workspace packages in `devDependencies` / `dependencies`, use `"workspace:*"` or `"workspace:^"`:

```json
"devDependencies": {
  "@repo/typescript": "workspace:*"
}
```