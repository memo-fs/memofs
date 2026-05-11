# Getting started

TekMemo starts with a normal project folder.

## 1. Install the CLI

```bash
pnpm add -D @tekmemo/cli
```

## 2. Initialize memory

```bash
pnpm exec tekmemo init
```

This creates a `.tekmemo/` directory with core memory, notes, events, indexes, graph files, snapshots, and temp space.

## 3. Store a durable decision

```bash
pnpm exec tekmemo remember "Use Cloudflare D1 for tenant metadata." --kind decision --tag database
```

## 4. Ask for context before coding

```bash
pnpm exec tekmemo context --query "database schema work" --json
```

## 5. Add MCP for coding agents

```bash
pnpm add -D @tekmemo/mcp-server
```

Then configure your MCP client to run `tekmemo-mcp` in local, cloud, or hybrid mode.

## 6. Move to cloud when needed

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"

pnpm exec tekmemo cloud context --query "current task" --json
```
