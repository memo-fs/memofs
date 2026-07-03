## Package Boundaries

Respect the boundaries between packages in the monorepo to maintain modularity, testability, and product neutrality:

| Zone | Packages | Dependency Rules |
|---|---|---|
| **OSS Core** | `@tekmemo/core` | Must remain completely product-neutral and free of provider-specific cloud dependencies. Cannot import from adapters, CLI, server, or the cloud app. |
| **Optional Adapters** | `@tekmemo/adapter-*` (openai, voyage, ai-sdk, r2, transformers, workers-ai) | Can import `@tekmemo/core`. Cannot import from other provider adapters or the cloud app. |
| **Connectors** | `@tekmemo/connectors` | Can import `@tekmemo/core`. Used to ingest external data sources (Notion, GitHub, etc.). |
| **Distributions** | `tekmemo`, `@tekmemo/mcp-server` | Can import `@tekmemo/core` and required adapters. Must not contain core memory logic; they only wrap the core for specific interfaces. |
| **Testing & Tooling** | `@tekmemo/testing`, `@repo/*` | Used for builds, contract tests, and fakes. Testing/tooling code is never published externally. |
| **Applications** | `@tekmemo/cloud` (`apps/cloud`) | The proprietary/hostable cloud application. Can depend on core, adapters, and connectors. **No package in any other zone may import from the cloud app.** |

### Key Import Rules

1. **No Circular Dependencies**: Ensure there are no dependency cycles across packages.
2. **Adapter Isolation**: Adapters must be fully self-contained. For example, `@tekmemo/adapter-openai` must not import anything from `@tekmemo/adapter-voyage`.
3. **Core Neutrality**: Any cloud or provider-specific code (e.g. database schema, Cloudflare-specific APIs, third-party LLM parameters) belongs in the cloud app or the respective adapter, never in `@tekmemo/core`.
4. **Tooling Scope**: `@repo/*` packages are for build-time and development-time tooling only. They can only be referenced in `devDependencies`.
