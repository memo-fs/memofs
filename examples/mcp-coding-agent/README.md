# Memo FS + your coding agent (Cursor, Claude Code, Codex, Copilot, Gemini)

Give your daily coding agent **persistent, inspectable memory** with Memo FS.
Your agent remembers decisions, constraints, and project facts across sessions —
stored as plain files under `.memofs/` you can `cat`, `git diff`, and roll back.

This is Memo FS's differentiator for **local daily builders**: memory that lives
in your repo, not in a vendor's database.

## What you get

- **MCP server** — `@memofs/mcp-server` exposes `context`, `recall`,
  `remember`, `read_core_memory`, and more to any MCP-compatible coding agent.
- **Agent-rules file** — `memofs generate agent-rules` emits a ≤50-line
  instructions file (per agent) that *tells your agent to actually use the
  memory tools* at the start of every task. Without it, most agents won't call
  the tools on their own.
- **File-first storage** — everything is plain Markdown + JSONL under
  `.memofs/`. Commit it for team-shared memory, or gitignore it for personal.

## 1. Install the Memo FS CLI

```bash
npm install -g memofs
# or use without installing:
npx memofs
```

Initialize memory in your project:

```bash
memofs init
```

This creates `.memofs/` (memory, events, graph, snapshots) and a project ID.

## 2. Generate your agent's rules file

Each coding agent reads instructions from a different path. Memo FS emits the
right file for each:

```bash
# Pick your agent:
memofs generate agent-rules --target claude    # -> CLAUDE.md
memofs generate agent-rules --target cursor    # -> .cursor/rules/memofs.mdc
memofs generate agent-rules --target agents    # -> AGENTS.md          (OpenAI Codex or OpenCode)
memofs generate agent-rules --target copilot   # -> .github/copilot-instructions.md
memofs generate agent-rules --target gemini    # -> GEMINI.md          (Gemini CLI)

# See all targets:
memofs generate agent-rules --list
```

The generated file contains only behavioral rules + pointers — no project facts.
The real project knowledge lives in Memo FS memory, injected at runtime via
`context`.

## 3. Wire the MCP server into your agent

Add the Memo FS MCP server to your agent's MCP config. The server runs locally
over stdio — no API key, no cloud.

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

### Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

### OpenAI Codex (`~/.codex/config.toml`, global)

```toml
[mcp_servers.memofs]
command = "npx"
args = ["-y", "@memofs/mcp-server"]
```

### VS Code / GitHub Copilot (`.vscode/mcp.json`)

```json
{
  "servers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

### Gemini CLI (`.gemini/settings.json`)

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

## 4. Verify it works

Restart your agent, then in a fresh chat ask:

> "What do you know about this project?"

A correctly-wired agent will call `memofs_context` / `memofs_recall` first and
ground its answer in `.memofs/memory/`. To watch it learn, tell it a preference
("I prefer tabs over spaces") and ask it to remember it. Quit, reopen, and ask
again — it recalls.

## Inspect and version your memory

```bash
# See everything
cat .memofs/memory/core.md
cat .memofs/memory/notes.md

# Or via the CLI
memofs read core
memofs search "auth"
memofs inspect
```

Because memory is plain files, you can commit it:

```bash
git add .memofs/memory/
git commit -m "chore: record auth-session decision"
```

…for team-shared memory, or add `.memofs/` to `.gitignore` for personal memory.

## Troubleshooting

- **Agent doesn't call the memory tools** → you skipped step 2. The
  `generate agent-rules` file is what makes agents proactively use memory.
- **`tekmemo` command not found** → run via `npx memofs ...`.
- **Want semantic recall without an API key?** → the MCP server defaults to
  lexical (BM25 + fuzzy) recall. For zero-config hybrid recall, see
  [`@memofs/adapter-transformers`](../../packages/adapter-transformers).

## See also

- [MCP server docs](https://docs.memo.tekbreed.com/packages/mcp/)
- [CLI docs](https://docs.memo.tekbreed.com/packages/cli/)
- [File-first memory](https://docs.memo.tekbreed.com/packages/tekmemo/file-first-memory)
