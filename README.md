<div align="center">

<img src="./assets/logo.svg" alt="TekBreed Logo" width="120" />

# TekBreed OSS

Open-source AI infrastructure from TekBreed — starting with **TekMemo**, a file-first memory runtime for AI apps, agents, coding tools, and MCP clients.

<p>
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/v/@tekbreed%2Ftekmemo?label=@tekbreed/tekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekbreed-oss"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Project status: Alpha" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekbreed-oss/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekbreed-oss/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp;
  <a href="https://oss.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

</div>

---

## Repository Purpose

`tekbreed/tekbreed-oss` is the umbrella monorepo for TekBreed open-source work. It should be organized by product family, not by a sprawl of tiny published packages.

Current product family:

| Project | Published packages | Purpose |
| --- | --- | --- |
| TekMemo | `@tekbreed/tekmemo`<br>`@tekbreed/tekmemo-cli`<br>`@tekbreed/tekmemo-mcp-server` | File-first memory runtime for AI apps and agents |


---

## TekMemo Packages

TekMemo is the first product family and is published as three main packages:

### `@tekbreed/tekmemo`

The core memory runtime package.

```bash
npm install @tekbreed/tekmemo
```

All public APIs are imported directly from the core package root entrypoint:

```ts
import { 
	createNodeFsMemoryStore, 
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

### `@tekbreed/tekmemo-cli`

The CLI distribution package.

```bash
npx @tekbreed/tekmemo-cli
# or install locally:
npm install -D @tekbreed/tekmemo-cli
npx tekmemo
```

### `@tekbreed/tekmemo-mcp-server`

The Model Context Protocol server for coding agents.

```bash
npx @tekbreed/tekmemo-mcp-server
```

---

## Repository Structure

```txt
tekbreed-oss/
├── apps/
│   └── docs/              # TekBreed OSS docs site
├── packages/
│   ├── tekmemo/           # TekMemo core runtime package
│   ├── tekmemo-cli/       # TekMemo CLI package
│   ├── tekmemo-mcp-server/# TekMemo MCP server package
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
