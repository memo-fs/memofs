# MCP

`@tekmemo/mcp-server` exposes TekMemo memory to MCP-compatible tools such as Claude Code, Codex-style tools, Cursor, and other agent clients.

## Install

```bash
pnpm add -D @tekmemo/mcp-server
```

## Local mode

```bash
tekmemo-mcp --runtime local --root .
```

## Cloud mode

```bash
tekmemo-mcp \
  --runtime cloud \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY" \
  --project-id proj_123
```

## Boundary

MCP is a boundary adapter. It does not own billing, tenancy, database storage, embeddings, dashboards, or provider calls. Cloud mode delegates to `@tekmemo/cloud-client`.
