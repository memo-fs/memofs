# Getting started

TekMemo starts with a normal project folder.

## 1. Install the CLI

Install `@tekbreed/tekmemo-cli` as a devDependency in your project:

```bash
npm install -D @tekbreed/tekmemo-cli
```

## 2. Initialize memory

```bash
npx tekmemo init
```

This creates a `.tekmemo/` directory with core memory, notes, events, indexes, graph files, snapshots, and temp space.

## 3. Bootstrap your coding agents

Generate the per-platform instructions file that tells your agents (Claude Code, Cursor, Codex, etc.) how to use TekMemo — load context, recall, and remember on every task. Run one per agent you use:

```bash
npx tekmemo generate agent-rules claude      # → CLAUDE.md
npx tekmemo generate agent-rules cursor      # → .cursor/rules/tekmemo.mdc
npx tekmemo generate agent-rules agents      # → AGENTS.md
```

Each file is behavioral only (no project facts — those live in memory) and includes a pointer to where that platform stores its MCP server config. Commit them so every contributor's agents start with the same workflow. See [Generate agent rules](../cli/generate-agent-rules.md) for all targets.

## 4. Store a durable decision

```bash
npx tekmemo remember "Use Cloudflare D1 for tenant metadata." --kind decision --tag database
```

## 5. Ask for context before coding

```bash
npx tekmemo context --query "database schema work" --json
```

## 6. Connect coding agents via MCP

There are two ways to expose TekMemo to MCP-compatible agents (Claude Code, Cursor, Codex, etc.):

- **Hosted server (cloud-only, zero setup)** — point the client at the hosted endpoint with a bearer token:

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

- **Self-hosted stdio server (local/cloud/hybrid)** — install and run `@tekbreed/tekmemo-mcp-server` for file-first memory in `.tekmemo/`:

  ```bash
  npm install -D @tekbreed/tekmemo-mcp-server
  npx tekmemo-mcp --runtime local --root .
  ```

  Then register the command with your MCP client.

The hosted server can't read your local files, so use the stdio server when you want file-first `local` or `hybrid` memory with an agent. See the [MCP guide](../mcp/) and [Client setup](../mcp/client-setup) for per-client instructions.

## 7. Move to cloud when needed

Configure the CLI or MCP server with your TekMemo Cloud credentials:

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"

npx tekmemo cloud context --query "current task" --json
```
