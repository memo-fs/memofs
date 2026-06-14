## Package Naming Convention

This repo uses **two namespace conventions** — keep them separate:

| Package directory | Published name | Scope |
|---|---|---|
| `packages/tekmemo` | `@tekbreed/tekmemo` (root) + subpaths | `@tekbreed` - TekMemo single package |

**Subpath exports from `@tekbreed/tekmemo`:**
- `@tekbreed/tekmemo/fs`
- `@tekbreed/tekmemo/agentfs`
- `@tekbreed/tekmemo/ai-sdk`
- `@tekbreed/tekmemo/graph`
- `@tekbreed/tekmemo/mcp`
- `@tekbreed/tekmemo/cli`
- `@tekbreed/tekmemo/cloud`
- `@tekbreed/tekmemo/openai`
- `@tekbreed/tekmemo/voyageai`
- `@tekbreed/tekmemo/recall`
- `@tekbreed/tekmemo/rerank`
- `@tekbreed/tekmemo/rerank-voyage`
- `@tekbreed/tekmemo/upstash-vector`
- `@tekbreed/tekmemo/benchmark-kit`
- `@tekbreed/tekmemo/adapters`
- `@tekbreed/tekmemo/server`
- `@tekbreed/tekmemo/testing`

| Package directory | Published name | Scope |
|---|---|---|
| `tooling/test-utils` | `@repo/test-utils` | `@repo` — internal tooling only |
| `tooling/tsdown-config` | `@repo/tsdown-config` | `@repo` — internal tooling only |
| `tooling/typescript-config` | `@repo/typescript-config` | `@repo` — internal tooling only |
| `tooling/utils` | `@repo/utils` | `@repo` — internal tooling only |

**Rule:** Public OSS packages → `@tekbreed/tekmemo` (root) or `@tekbreed/tekmemo/*` (subpaths). Internal workspace tooling only → `@repo/*`. Never mix them. No separate `@tekbreed/tekmemo-*` packages exist.

When referencing internal tooling in `devDependencies`, use `"workspace:*"`:

```json
"devDependencies": {
  "@repo/typescript-config": "workspace:*"
}
```