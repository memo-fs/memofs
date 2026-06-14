## Monorepo Structure

```
tekbreed-oss/
├── .github/
│   └── workflows/
├── apps/
│   └── docs/                   # TekBreed OSS docs site, with TekMemo as the first project
├── benchmarks/                 # TekMemo benchmark runners
├── packages/
│   └── tekmemo/                # @tekbreed/tekmemo - single package with subpath exports
├── projects/
│   └── tekmemo/                # TekMemo roadmap, architecture, strategy, and planning docs
├── tooling/
│   ├── test-utils/             # @repo/test-utils - testing utilities
│   ├── tsdown-config/          # @repo/tsdown-config - shared tsdown base
│   ├── typescript-config/      # @repo/typescript-config - shared tsconfig bases
│   └── utils/                  # @repo/utils - shared utility helpers
├── biome.json                  # Linting + formatting (Biome)
├── turbo.json                  # Turborepo pipeline config
└── pnpm-workspace.yaml         # PNPM workspace configuration
```