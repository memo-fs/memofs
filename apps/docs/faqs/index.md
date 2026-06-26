# What is TekMemo?

TekMemo is a **layered memory runtime for AI agents and applications**. It gives LLMs durable, project-scoped context so they stay accurate and consistent across sessions — instead of relying solely on ephemeral context windows.

## How is memory organized?

TekMemo uses four memory layers:

| Layer | File | Purpose |
| --- | --- | --- |
| **Core** | `core.md` | Stable project briefing — facts the agent must know every time |
| **Notes** | `notes.md` | Durable records: decisions, constraints, summaries |
| **Recall** | `chunks.jsonl` | Indexed fragments for semantic retrieval |
| **Graph** | `nodes.jsonl` · `edges.jsonl` | Entities and relationships for architectural queries |

See [Core concepts](/packages/tekmemo/concepts) for details.

## Why file-first?

Memory is stored as plain text and JSON files in your project's `.tekmemo/` directory. This means:

- It works without any cloud setup.
- It can be version-controlled alongside your code.
- It is easy to inspect during code review.
- Agents get durable context without a hosted dashboard.
- Nothing is hidden inside opaque model prompts.

See [File-first memory](/packages/tekmemo/file-first-memory) for the rationale.

## When should I use cloud instead of local-only?

Use TekMemo Cloud when you need:

- Hosted sync across machines or team members
- API keys and authentication
- Hosted recall with vector search and reranking
- Graph API endpoints
- Team access and dashboard observability
- Connector data integrations

Local-only memory is fine for single-developer projects, CI, or when you want everything on-disk.

## What is the hybrid runtime?

Hybrid mode combines the **local** filesystem store and the **cloud** client, routing every read and write through a [read/write policy](/packages/tekmemo/client#read-and-write-policies) (`local-first`, `cloud-first`, or `local-only`). Reads hit the primary store and fall back to the secondary on error; writes go to the primary first and then the secondary, with failures surfaced as warnings rather than thrown. Configure it with:

```bash
npx tekmemo config init --runtime hybrid
```

See [The `Tekmemo` client](/packages/tekmemo/client) for the policy matrix and [CLI runtime modes](/packages/cli/) for the CLI breakdown.

## How do I add TekMemo to my coding agent?

There are **two MCP paths**, depending on where your memory lives:

- **Hosted server (cloud-only)** — point your client at `https://mcp.memo.tekbreed.com/` with a bearer token. Zero local setup; uses TekMemo Cloud as the backing store.
- **Self-hosted stdio server** — run `@tekbreed/tekmemo-mcp-server` as a subprocess for file-first memory in `.tekmemo/` (supports `local`, `cloud`, and `hybrid` modes).

Hosted example:

```json
{
  "mcpServers": {
    "tekmemo": {
      "url": "https://mcp.memo.tekbreed.com/",
      "headers": {
        "Authorization": "Bearer <your TEKMEMO_MCP_BEARER_TOKEN>"
      }
    }
  }
}
```

Stdio example (local memory):

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

See [MCP getting started](/packages/mcp/) for the comparison, [Hosted MCP](/packages/mcp/hosted) for the hosted endpoint, and [Client setup](/packages/mcp/client-setup) for client-specific examples.

## How do I use TekMemo with the Vercel AI SDK?

Import AI SDK tools directly from `@tekbreed/tekmemo` and use the provided tools inside your `generateText` or `streamText` calls. The package wraps core memory, notes, recall, and graph operations as AI SDK-compatible tools. See [AI SDK](/packages/tekmemo/ai-sdk/) for the overview and [Agent patterns](/packages/tekmemo/ai-sdk/agent-patterns) for integration examples.

## What is graph memory for?

Graph memory stores **entities** (files, concepts, decisions) and **relationships** (depends-on, related-to, constrains). It answers questions like:

- "What depends on this module?"
- "How are these two decisions connected?"
- "Which files are affected by this change?"

See [Graph memory](/packages/tekmemo/architecture/graph-memory) for the architecture details.

## Where can I run the runtime?

The open-source runtime runs in any modern JavaScript environment. It's server-side only (it touches the filesystem), so the constraint is keeping it out of browser bundles:

| Runtime | Best for |
| --- | --- |
| **Node.js** | Express, Fastify, CLI tools, MCP servers, background jobs |
| **Cloudflare Workers** | Edge functions, Workers AI, D1-backed apps |
| **Vercel / Next.js** | Route handlers, server actions, edge middleware |

Cloud API keys are server-side only — never ship them to the browser. If you want hosted memory without running the runtime yourself, that's what [TekMemo Cloud](https://memo.tekbreed.com) is for.

## What is a context package?

A context package is the structured payload TekMemo sends to an AI model or tool. It combines core memory, notes, recall results, graph context, and source metadata into a single, coherent prompt injection. You don't usually build one manually — the CLI, MCP server, and AI SDK all compose context packages automatically.

## How does sync work?

Sync resolves memory state between your local `.tekmemo/` filesystem and the TekMemo Cloud database. In hybrid mode, the CLI writes locally first, then syncs to cloud in the background. Events track changes over time, making conflict resolution and audit trails possible.

See [Sync and events](/packages/tekmemo/architecture/sync-events) for the full architecture.

## How do I inspect or validate my memory?

Use the CLI:

```bash
# Inspect current memory state
npx tekmemo inspect

# Validate memory structure
npx tekmemo validate

# Get composed context for a task
npx tekmemo context --query "current task"
```

Since memory is file-first, you can also directly read `.tekmemo/core.md` and `.tekmemo/notes.md` in your editor.

## Do I need to install multiple packages?

Only two for the core experience: `@tekbreed/tekmemo` (the runtime) and `@tekbreed/tekmemo-cli` (the command line). Everything else is opt-in:

- **`@tekbreed/tekmemo`** — the runtime engine, `Tekmemo` client, recall, graph, and the cloud client. The one package every integration builds on.
- **`@tekbreed/tekmemo-cli`** — the `tekmemo` command (`init`, `remember`, `context`, `sync`, `connectors`, …).
- **`@tekbreed/tekmemo-mcp-server`** — the MCP server for coding agents (Claude Code, Cursor, Codex).
- **`@tekbreed/tekmemo-adapter-ai-sdk`** — AI SDK tool/runtime helpers.
- **`@tekbreed/tekmemo-connectors`** — the connector framework (GitHub, Notion) and `tekmemo connectors`.
- **Provider adapters** (optional) — `@tekbreed/tekmemo-adapter-transformers` (zero-key local embeddings), `-openai`, `-voyage`.

Install just core + CLI to start; add the others as you need them. See [Installation](/packages/tekmemo/installation) for the full matrix.
