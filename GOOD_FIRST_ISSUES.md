# Good First Issues

Welcome. 👋 TekMemo is built so that a first contribution can be small,
self-contained, and genuinely useful. Every issue below is scoped to a single
file or surface, comes with pointers to where the work lives, and needs no
prior knowledge of the whole codebase.

If you get stuck, open a draft PR early and ask — we'd rather unblock you than
have you guess. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for repository setup.

> These issues are also tracked on GitHub with the
> [`good first issue`](https://github.com/tekbreed/tekmemo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
> label. If an issue below isn't on GitHub yet, it's queued and will appear soon.

---

## How to pick one

| You like… | Try… |
| --- | --- |
| Writing docs / examples | the **docs & examples** group below |
| Small, well-defined code changes | the **code** group below |
| Explaining things clearly | a docs-accuracy or README pass |

Every issue states: **what** to change, **where** it lives, and **how to know
it's done.**

---

## Docs & examples

### Add a LangGraph (TypeScript) integration example
**Where:** new folder `examples/langgraph/`, modeled on
[`examples/ai-sdk/`](./examples/ai-sdk/).
**Done when:** a runnable `agent.ts` demonstrates TekMemo memory in a LangGraph
graph; `examples/README.md` links it; it typechecks against the real `@tekbreed/tekmemo` API.

### Write a README for `@tekbreed/tekmemo-adapter-transformers`
**Where:** `packages/tekmemo-adapter-transformers/README.md` (currently missing).
**Done when:** it explains what the package is, the zero-API-key local ONNX
embedder story, install, and a minimal code snippet — matching the style of
[`packages/tekmemo-adapter-openai/README.md`](./packages/tekmemo-adapter-openai/README.md).

### Add benchmark results to the docs site
**Where:** new page `apps/docs/packages/tekmemo/benchmarks.md` + sidebar entry in
`apps/docs/.vitepress/config/sidebar.mts`.
**Done when:** the page summarizes TekMemo-vs-vector-DB results from
`@tekbreed/tekmemo-benchmark-kit` in plain language, with a link to reproduce.

---

## Code

### Add the `recall` block to `config.schema.json`
**Where:** `apps/docs/public/config.schema.json` (and the versioned copy in
`apps/docs/public/1.0.0-alpha.0/`).
**Done when:** the schema documents `recall.engine`, `recall.localEmbeddings`,
and `recall.embeddingModel`, plus the `TEKMEMO_RECALL_ENGINE`,
`TEKMEMO_LOCAL_EMBEDDINGS`, `TEKMEMO_EMBEDDING_MODEL` env vars.

### Improve CLI error messages for common mistakes
**Where:** `packages/tekmemo-cli/src/commands/` (look for `CliValidationError`
throws).
**Done when:** at least three confusing error paths (e.g., missing args, invalid
read targets) produce actionable, single-sentence messages that name the fix.

### Doc-accuracy pass on the MCP tools page
**Where:** `apps/docs/packages/mcp/tools.md`.
**Done when:** every documented tool name and parameter matches the live tool
definitions in `packages/tekmemo-mcp-server/src/tools/definitions.ts`.

---

## After your first PR

You're now a [contributor](./CONTRIBUTORS.md). Repeat contributors who show good
judgment move toward maintainer access — see [`GOVERNANCE.md`](./GOVERNANCE.md).

Thanks for making TekMemo better.
