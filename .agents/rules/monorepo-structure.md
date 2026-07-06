## Monorepo Structure

```
^memofs/
├── .agents/                      # Workspace agent rules and skills
├── .changeset/                   # Changesets version and publish config
├── .github/
│   ├── ISSUE_TEMPLATE/           # GitHub issue templates
│   ├── workflows/                # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md  # Pull request template
├── apps/
│   ├── cloud/                    # @memofs/cloud - Cloudflare web app
│   └── docs/                     # @memofs/docs - VitePress documentation site
├── benchmarks/                   # @memofs/benchmarks - workspace benchmark runner
├── examples/                     # @memofs/examples - integration examples
├── packages/
│   ├── adapter-ai-sdk/           # @memofs/adapter-ai-sdk - Vercel AI SDK adapter
│   ├── adapter-openai/           # @memofs/adapter-openai - OpenAI embedder adapter
│   ├── adapter-r2/               # @memofs/adapter-r2 - Cloudflare R2 blob adapter
│   ├── adapter-turso/            # @memofs/adapter-turso - Turso/libSQL metadata adapter
│   ├── adapter-transformers/     # @memofs/adapter-transformers - local Transformers.js embedder
│   ├── adapter-voyage/           # @memofs/adapter-voyage - Voyage AI embedder/reranker adapter
│   ├── adapter-workers-ai/       # @memofs/adapter-workers-ai - Workers AI extractor adapter
│   ├── benchmark-kit/            # @memofs/benchmark-kit - reusable benchmark library
│   ├── connectors/               # @memofs/connectors - local connector framework
│   ├── core/                     # @memofs/core - core runtime and primitives
│   ├── json-rpc/                 # @memofs/json-rpc - shared JSON-RPC primitives
│   ├── mcp-server/               # @memofs/mcp-server - MCP server for agent tools
│   ├── server/                   # @memofs/server - self-hostable runtime server
│   ├── memofs/                  # memofs - CLI distribution
│   └── testing/                  # @memofs/testing - shared tests, fixtures, and fakes
├── tooling/
│   ├── tsdown/                   # @repo/tsdown - shared tsdown configuration
│   ├── typescript/               # @repo/typescript - shared tsconfig base configuration
│   └── utils/                    # @repo/utils - internal workspace utilities
├── biome.json                    # Biome linting and formatting
├── turbo.json                    # Turborepo task pipeline
└── pnpm-workspace.yaml           # pnpm workspace definition
```
