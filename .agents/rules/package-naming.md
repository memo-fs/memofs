## Package Naming Convention

This repo keeps public OSS packages, private apps, and internal tooling in
separate naming lanes.

### Public OSS Packages

Public packages use the `@memofs/*` npm scope. The CLI is published as
`@memofs/cli`; the binary name remains `memofs` so `npx memofs` and
`npm install -g @memofs/cli` are the primary install surfaces.

| Package directory | Published name | Scope | Description |
|---|---|---|---|
| `packages/core` | `@memofs/core` | `@memofs` | Core memory runtime, primitives, stores, recall, graph, AgentFS, and cloud-client contracts |
| `packages/cli` | `@memofs/cli` | `@memofs` | CLI tool for local and cloud memory workflows |
| `packages/adapter-ai-sdk` | `@memofs/adapter-ai-sdk` | `@memofs` | Vercel AI SDK adapter, memory tool, runtime bridge |
| `packages/adapter-openai` | `@memofs/adapter-openai` | `@memofs` | OpenAI embedder adapter |
| `packages/adapter-r2` | `@memofs/adapter-r2` | `@memofs` | Cloudflare R2 blob adapter |
| `packages/adapter-turso` | `@memofs/adapter-turso` | `@memofs` | Turso/libSQL metadata adapter |
| `packages/adapter-transformers` | `@memofs/adapter-transformers` | `@memofs` | Local ONNX embedder adapter with Transformers.js |
| `packages/adapter-voyage` | `@memofs/adapter-voyage` | `@memofs` | Voyage AI embedder and reranker adapter |
| `packages/adapter-workers-ai` | `@memofs/adapter-workers-ai` | `@memofs` | Cloudflare Workers AI extractor adapter |
| `packages/benchmark-kit` | `@memofs/benchmark-kit` | `@memofs` | Benchmark workloads and runner library |
| `packages/connectors` | `@memofs/connectors` | `@memofs` | Local connector framework for GitHub, Notion, and future sources |
| `packages/json-rpc` | `@memofs/json-rpc` | `@memofs` | Shared JSON-RPC 2.0 protocol primitives |
| `packages/mcp-server` | `@memofs/mcp-server` | `@memofs` | Model Context Protocol server |
| `packages/server` | `@memofs/server` | `@memofs` | OSS-deployable hosted-memory server |
| `packages/testing` | `@memofs/testing` | `@memofs` | Shared contract tests, fixtures, and fakes |

### Internal Workspace Tooling

Internal packages under the `@repo/*` scope are only for local workspace
tooling. They must not be published as public OSS packages.

| Package directory | Package name | Scope | Description |
|---|---|---|---|
| `tooling/tsdown` | `@repo/tsdown` | `@repo` | Shared tsdown base build configuration |
| `tooling/typescript` | `@repo/typescript` | `@repo` | Shared tsconfig base configuration |
| `tooling/utils` | `@repo/utils` | `@repo` | Shared internal workspace utilities |

### Private Applications And Workspaces

These workspaces are marked `"private": true` and are not published.

| Directory | Package name | Type | Description |
|---|---|---|---|
| `apps/cloud` | `@memofs/cloud` | Cloud app | Cloud application running on Cloudflare Workers |
| `apps/docs` | `@memofs/docs` | Docs app | Documentation site built with VitePress |
| `benchmarks` | `@memofs/benchmarks` | Benchmark runner | Workspace benchmark runner and results owner |
| `examples` | `@memofs/examples` | Examples | Example integration scripts and agent templates |

**Rule:** directory name equals the package name without its scope for every
public package directory. Internal tooling stays under `@repo/*`; public OSS
packages do not use `@repo/*`.

When referencing workspace packages from `dependencies` or `devDependencies`,
use `"workspace:*"` or `"workspace:^"`:

```json
"devDependencies": {
	"@repo/typescript": "workspace:*"
}
```
