## Package Naming Convention

This repo keeps public OSS packages, private apps, and internal tooling in
separate naming lanes.

### Public OSS Packages

Public packages use the `@tekmemo/*` npm scope, except the CLI distribution. The
CLI stays unscoped as `tekmemo` so `npm install -g tekmemo` and `npx tekmemo`
remain the primary install surfaces.

| Package directory | Published name | Scope | Description |
|---|---|---|---|
| `packages/core` | `@tekmemo/core` | `@tekmemo` | Core memory runtime, primitives, stores, recall, graph, AgentFS, and cloud-client contracts |
| `packages/tekmemo` | `tekmemo` | unscoped | CLI tool for local and cloud memory workflows |
| `packages/adapter-ai-sdk` | `@tekmemo/adapter-ai-sdk` | `@tekmemo` | Vercel AI SDK adapter, memory tool, runtime bridge |
| `packages/adapter-openai` | `@tekmemo/adapter-openai` | `@tekmemo` | OpenAI embedder adapter |
| `packages/adapter-r2` | `@tekmemo/adapter-r2` | `@tekmemo` | Cloudflare R2 blob adapter |
| `packages/adapter-turso` | `@tekmemo/adapter-turso` | `@tekmemo` | Turso/libSQL metadata adapter |
| `packages/adapter-transformers` | `@tekmemo/adapter-transformers` | `@tekmemo` | Local ONNX embedder adapter with Transformers.js |
| `packages/adapter-voyage` | `@tekmemo/adapter-voyage` | `@tekmemo` | Voyage AI embedder and reranker adapter |
| `packages/adapter-workers-ai` | `@tekmemo/adapter-workers-ai` | `@tekmemo` | Cloudflare Workers AI extractor adapter |
| `packages/benchmark-kit` | `@tekmemo/benchmark-kit` | `@tekmemo` | Benchmark workloads and runner library |
| `packages/connectors` | `@tekmemo/connectors` | `@tekmemo` | Local connector framework for GitHub, Notion, and future sources |
| `packages/json-rpc` | `@tekmemo/json-rpc` | `@tekmemo` | Shared JSON-RPC 2.0 protocol primitives |
| `packages/mcp-server` | `@tekmemo/mcp-server` | `@tekmemo` | Model Context Protocol server |
| `packages/server` | `@tekmemo/server` | `@tekmemo` | OSS-deployable hosted-memory server |
| `packages/testing` | `@tekmemo/testing` | `@tekmemo` | Shared contract tests, fixtures, and fakes |

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
| `apps/cloud` | `@tekmemo/cloud` | Cloud app | Cloud application running on Cloudflare Workers |
| `apps/docs` | `@tekmemo/docs` | Docs app | Documentation site built with VitePress |
| `benchmarks` | `@tekmemo/benchmarks` | Benchmark runner | Workspace benchmark runner and results owner |
| `examples` | `@tekmemo/examples` | Examples | Example integration scripts and agent templates |

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
