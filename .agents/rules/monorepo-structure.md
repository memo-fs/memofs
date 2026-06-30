## Monorepo Structure

```
tekmemo/
├── .agents/                      # Workspace agents rules and skills
├── .changeset/                   # Code version and publish configs (Changesets)
├── .github/
│   ├── ISSUE_TEMPLATE/           # GitHub issue templates
│   ├── workflows/                # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md  # Pull request templates
├── apps/
│   ├── cloud/                    # @tekbreed/tekmemo-cloud - Cloudflare worker/pages web application (React Router)
│   └── docs/                     # @tekbreed/docs - TekMemo documentation site (VitePress)
├── benchmarks/                   # @tekbreed/benchmarks - Workspace-wide benchmark suites and performance runner
├── examples/                     # @tekbreed/examples - Example integration scripts and agent code templates
├── packages/
│   ├── tekmemo/                  # @tekbreed/tekmemo - Core OSS memory runtime and engine
│   ├── tekmemo-adapter-ai-sdk/   # @tekbreed/tekmemo-adapter-ai-sdk - Vercel AI SDK integration adapter
│   ├── tekmemo-adapter-openai/   # @tekbreed/tekmemo-adapter-openai - OpenAI Embedder integration adapter
│   ├── tekmemo-adapter-r2/       # @tekbreed/tekmemo-adapter-r2 - Cloudflare R2 + Turso remote-blob store adapter
│   ├── tekmemo-adapter-transformers/ # @tekbreed/tekmemo-adapter-transformers - Local Transformers.js ONNX embedder adapter
│   ├── tekmemo-adapter-voyage/   # @tekbreed/tekmemo-adapter-voyage - Voyage AI Embedder/Reranker adapter
│   ├── tekmemo-adapter-workers-ai/ # @tekbreed/tekmemo-adapter-workers-ai - Cloudflare Workers AI extractor adapter
│   ├── tekmemo-benchmark-kit/    # @tekbreed/tekmemo-benchmark-kit - Shared benchmark suites and utilities
│   ├── tekmemo-cli/              # @tekbreed/tekmemo-cli - CLI tool for local memory administration/inspection
│   ├── tekmemo-connectors/       # @tekbreed/tekmemo-connectors - Connectors for Notion, GitHub, and other third-party inputs
│   ├── tekmemo-mcp-server/       # @tekbreed/tekmemo-mcp-server - Model Context Protocol (MCP) server for agent tools
│   └── tekmemo-testing/          # @tekbreed/tekmemo-testing - Shared test contract suites and fakes/fixtures
├── tooling/
│   ├── tsdown/                   # @repo/tsdown - Shared tsdown configurations and build factory
│   ├── typescript/               # @repo/typescript - Shared tsconfig base configurations
│   └── utils/                    # @repo/utils - Shared utility helpers for builds and linting
├── biome.json                    # Linting + formatting configuration (Biome)
├── turbo.json                    # Turborepo task pipeline orchestration config
└── pnpm-workspace.yaml           # PNPM workspace definition
```