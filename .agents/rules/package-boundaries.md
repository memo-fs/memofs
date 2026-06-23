## Package Boundaries

Respect the OSS package boundaries:

| Zone | Packages | Rule |
|---|---|---|
| **OSS core** | `@tekbreed/tekmemo` (root + `/fs`, `/agentfs`, `/ai-sdk`, `/graph`, `/mcp`, `/cli`, `/testing`) | Must be product-neutral, zero cloud dependencies |
| **Optional OSS** | `@tekbreed/tekmemo/cloud`, `@tekbreed/tekmemo/openai`, `@tekbreed/tekmemo/voyageai`, `@tekbreed/tekmemo/recall`, `@tekbreed/tekmemo/rerank`, `@tekbreed/tekmemo/rerank-voyage`, `@tekbreed/tekmemo/benchmark-kit`, `@tekbreed/tekmemo/server` | Ship only when stable |
| **Internal tooling** | `@repo/tsdown`, `@repo/typescript`, `@repo/utils` | Never published externally |
