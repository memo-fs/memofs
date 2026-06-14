<div align="center">

# TekBreed OSS

Open-source ai infrastructure from TekBreed.

**TekMemo** is the first project in this repo: a file-first memory runtime for AI apps, agents, coding tools, and MCP clients.

<p>
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/v/@tekbreed%2Ftekmemo?label=@tekbreed/tekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/oss"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Project status: Alpha" /></a> &nbsp;
  <a href="https://github.com/tekbreed/oss/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/oss/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp;
  <a href="https://oss.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

</div>

---

## Repository Purpose

`tekbreed/oss` is the umbrella monorepo for TekBreed open-source work. It should be organized by product family, not by a sprawl of tiny published packages.

Current product family:

| Project | Published package | Purpose |
| --- | --- | --- |
| TekMemo | `@tekbreed/tekmemo` | File-first memory runtime for AI apps and agents |

Future product families, such as TekCode, should be added beside TekMemo when they are ready.

---

## TekMemo Import Model

TekMemo publishes as **one package**:

```bash
pnpm add @tekbreed/tekmemo
```

All public APIs are imported directly from the root entrypoint:

```ts
import { 
	createNodeFsMemoryStore, 
	createTekMemoMcpServer,
	defineTekMemoTools,
	createOpenAIEmbedder,
	createVoyageEmbedder,
	createUpstashRecallStore,
	createVoyageReranker,
	createAgentfsMemoryStore,
	createTekMemoCloudClient,
	createInMemoryRecallStore,
	BenchmarkRunner,
} from "@tekbreed/tekmemo";
```

Do not introduce separate public TekMemo adapter packages or public subpath imports. Everything is imported directly from `@tekbreed/tekmemo`.

The CLI command remains:

```bash
pnpm add -D @tekbreed/tekmemo
pnpm exec tekmemo
```

---

## Repository Structure

```txt
tekbreed-oss/
├── apps/
│   └── docs/              # TekBreed OSS docs site
├── packages/
│   ├── tekmemo/           # @tekbreed/tekmemo unified source package
│   │   └── src/
│   │       ├── index.ts           # Core memory runtime exports
│   │       ├── agentfs/           # AgentFS session workspaces
│   │       ├── ai-sdk/            # Vercel AI SDK integration
│   │       ├── benchmark-kit/     # Benchmark fixtures and runners
│   │       ├── cli/               # CLI commands and runner
│   │       ├── cloud-client/      # TekMemo Cloud API client
│   │       ├── core/              # Internal: bootstrap, chunking, constants, documents, errors, events, indexes, manifest, search, snapshots, stores, types, validation
│   │       ├── fs/                # Local filesystem memory store
│   │       ├── graph/             # Graph memory for entities/relationships
│   │       ├── mcp-server/        # MCP server for coding agents
│   │       ├── openai/            # OpenAI embedding adapter
│   │       ├── recall/            # Recall contracts and local store
│   │       ├── rerank/            # Rerank contracts and fallback
│   │       ├── rerank-voyage/     # VoyageAI reranking adapter
│   │       ├── testing/           # Testing utilities
│   │       ├── upstash-vector/    # Upstash Vector recall adapter
│   │       └── voyageai/          # VoyageAI embedding adapter
│   ├── tekcode-cli/       # future TekCode CLI package placeholder
│   └── tekcode-desktop/   # future TekCode desktop package placeholder
├── projects/
│   └── tekmemo/           # TekMemo planning, architecture, and product notes
├── tooling/               # private @repo/* workspace tooling
├── docs/                  # repo operations notes
├── scripts/               # repo maintenance scripts
├── biome.json
├── turbo.json
└── pnpm-workspace.yaml
```

 Keep docs focused on the core OSS package, architecture, and contribution flow.

---

## Workspace Commands

Run commands from the repo root.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm format-and-lint
pnpm format-and-lint:fix
pnpm lint:package
pnpm docs:dev
pnpm docs:build
pnpm validate:workspace
```

## Contributing And Security

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a PR.

For security reports, read [`SECURITY.md`](./SECURITY.md). Do not open a public GitHub issue for security vulnerabilities.

---

## License

MIT. See [`LICENSE`](./LICENSE).
