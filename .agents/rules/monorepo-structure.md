## Monorepo Structure

```
tekmemo/
├── .agents/                      # workspace agents rules and skills
├── .changeset/                   # code version and publish
├── .github/
│   ├── ISSUE_TEMPLATE/           # github issue templates
│   ├── workflows/                # CI workflows
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md  # Pull request template
├── apps/
│   └── docs/                     # TekMemo docs site, with TekMemo as the first project
├── benchmarks/                   # TekMemo benchmark runners
├── packages/
│   ├── tekmemo/                  # @tekbreed/tekmemo - tekmemo core runtime
│   ├── tekmemo-cli/              # @tekbreed/tekmemo-cli - tekmemo CLI for local development and memory inspection
│   └── tekmemo-mcp-server/       # @tekbreed/tekmemo-mcp-server - tekmemo MCP server for for AI agents
├── tooling/
│   ├── tsdown/                   # @repo/tsdown - shared tsdown base
│   ├── typescript/               # @repo/typescript - shared tsconfig bases
│   └── utils/                    # @repo/utils - shared utility helpers
├── biome.json                    # Linting + formatting (Biome)
├── turbo.json                    # Turborepo pipeline config
└── pnpm-workspace.yaml           # PNPM workspace configuration
```