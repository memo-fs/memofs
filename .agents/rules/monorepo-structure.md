## Monorepo Structure

```
tekmemo/
├── .agents/                      # Workspace agent rules and skills
├── .changeset/                   # Changesets version and publish config
├── .github/
│   ├── ISSUE_TEMPLATE/           # GitHub issue templates
│   ├── workflows/                # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md  # Pull request template
├── apps/
│   ├── cloud/                    # @tekmemo/cloud - Cloudflare web app
│   └── docs/                     # @tekmemo/docs - VitePress documentation site
├── benchmarks/                   # @tekmemo/benchmarks - workspace benchmark runner
├── examples/                     # @tekmemo/examples - integration examples
├── packages/
│   ├── adapter-ai-sdk/           # @tekmemo/adapter-ai-sdk - Vercel AI SDK adapter
│   ├── adapter-openai/           # @tekmemo/adapter-openai - OpenAI embedder adapter
│   ├── adapter-r2/               # @tekmemo/adapter-r2 - Cloudflare R2 blob adapter
│   ├── adapter-turso/            # @tekmemo/adapter-turso - Turso/libSQL metadata adapter
│   ├── adapter-transformers/     # @tekmemo/adapter-transformers - local Transformers.js embedder
│   ├── adapter-voyage/           # @tekmemo/adapter-voyage - Voyage AI embedder/reranker adapter
│   ├── adapter-workers-ai/       # @tekmemo/adapter-workers-ai - Workers AI extractor adapter
│   ├── benchmark-kit/            # @tekmemo/benchmark-kit - reusable benchmark library
│   ├── connectors/               # @tekmemo/connectors - local connector framework
│   ├── core/                     # @tekmemo/core - core runtime and primitives
│   ├── json-rpc/                 # @tekmemo/json-rpc - shared JSON-RPC primitives
│   ├── mcp-server/               # @tekmemo/mcp-server - MCP server for agent tools
│   ├── server/                   # @tekmemo/server - self-hostable runtime server
│   ├── tekmemo/                  # tekmemo - CLI distribution
│   └── testing/                  # @tekmemo/testing - shared tests, fixtures, and fakes
├── tooling/
│   ├── tsdown/                   # @repo/tsdown - shared tsdown configuration
│   ├── typescript/               # @repo/typescript - shared tsconfig base configuration
│   └── utils/                    # @repo/utils - internal workspace utilities
├── biome.json                    # Biome linting and formatting
├── turbo.json                    # Turborepo task pipeline
└── pnpm-workspace.yaml           # pnpm workspace definition
```
