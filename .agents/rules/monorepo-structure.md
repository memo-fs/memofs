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
│   ├── cloud/                    # @memofs/cloud - Cloudflare web app (GITIGNORED — never tracked)
│   └── docs/                     # @memofs/docs - VitePress documentation site
├── benchmarks/                   # @memofs/benchmarks - workspace benchmark runner
├── docs/                         # Internal decision layer (GITIGNORED — never tracked)
│   ├── CONTEXT.md                #   working glossary (canonical nouns + code contracts)
│   ├── open-issues.md            #   execution signpost → GitHub Issues
│   ├── adr/                      #   ADRs 0002..0017 (signed, self-current decisions)
│   └── architecture/             #   decisions log, locked specs, execution plan, archive/
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

### Never tracked (gitignored)

The `docs/` internal decision layer (`docs/adr/`, `docs/architecture/`,
`docs/CONTEXT.md`) and `apps/cloud/` are **gitignored and never tracked** —
they are local-only working artifacts, not public. See AGENTS.md → General
Rules → "Never track internal docs or the cloud app in git."
