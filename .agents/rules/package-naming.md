## Package Naming Convention

This repo uses **two namespace conventions** — keep them separate:

| Package directory | Published name | Scope |
|---|---|---|
| `packages/tekmemo` | `@tekbreed/tekmemo` | `@tekbreed` — Core memory runtime |
| `packages/tekmemo-cli` | `@tekbreed/tekmemo-cli` | `@tekbreed` — CLI distribution |
| `packages/tekmemo-mcp-server` | `@tekbreed/tekmemo-mcp-server` | `@tekbreed` — Model Context Protocol server |
| `packages/tekmemo-adapter-openai` | `@tekbreed/tekmemo-adapter-openai` | `@tekbreed` — OpenAI embedder adapter |
| `packages/tekmemo-adapter-voyage` | `@tekbreed/tekmemo-adapter-voyage` | `@tekbreed` — Voyage AI embedder/reranker adapter |
| `packages/tekmemo-testing` | `@tekbreed/tekmemo-testing` | `@tekbreed` — Testing contract suites and mock drivers |
| `packages/tekmemo-benchmark-kit` | `@tekbreed/tekmemo-benchmark-kit` | `@tekbreed` — Benchmark workloads and runner |

| Package directory | Published name | Scope |
|---|---|---|
| `tooling/tsdown` | `@repo/tsdown` | `@repo` — internal tooling only |
| `tooling/typescript` | `@repo/typescript` | `@repo` — internal tooling only |
| `tooling/utils` | `@repo/utils` | `@repo` — internal tooling only |

**Rule:** Public OSS packages must be published under the `@tekbreed` scope (either as the core `@tekbreed/tekmemo` package or as `@tekbreed/tekmemo-*` modular packages). Internal workspace tooling is published under the `@repo/*` scope and is never published externally.

When referencing internal tooling in `devDependencies`, use `"workspace:*"`:

```json
"devDependencies": {
  "@repo/typescript": "workspace:*"
}
```