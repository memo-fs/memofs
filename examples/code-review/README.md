# CI / hosted agents (no checkout) — Claude Code & Codex

Wire a CI / hosted agent to MemoFS **without ever checking out the repo on the runner**. The agent speaks MCP over HTTP against your project's hosted endpoint. Memory flows one way — read-only by default — so a fresh CI run gets grounded in durable project memory and writes go through human PR review.

This is the right setup when:

- A CI runner is ephemeral and you don't want to ship `.memofs/` to it.
- A hosted agent (cloud Codex, GitHub-Actions Claude Code) has no working copy at all.
- You want CI to *read* project memory, but never to *write* to it.

> If your CI has a full checkout and you want it to mirror writes to the cloud replica, use the stdio `--runtime hybrid` server instead — see [`../coding-agent/`](../coding-agent/) and the [Hybrid Mode docs](https://docs.memofs.dev/packages/mcp/hybrid-mode).

## Prerequisites

You only need two values from the MemoFS dashboard:

1. **Project URL** — `https://memofs.dev/api/v1/projects/<PROJECT_ID>/mcp` (on the Memory page).
2. **API key** — on the API Keys page. **Use a read-only key for CI.** A read-only key can call `memofs.context` and `memofs.recall` but is rejected by `memofs.remember` and `memofs.consolidate` at the MCP protocol layer.

The project must already exist in the cloud — `memofs cloud sync push` it once from a machine with a checkout. A cold CI run against an unknown `<PROJECT_ID>` returns `404 "Project not found. Push it with memofs cloud sync push first."`.

## What CI can call

Only the four memory verbs are exposed over HTTP — same tool names and schemas as the stdio server:

| Tool | Read-only key | Read-write key |
|---|:---:|:---:|
| `memofs.context` | ✅ | ✅ |
| `memofs.recall` | ✅ | ✅ |
| `memofs.remember` | ❌ (MCP authorization error) | ✅ |
| `memofs.consolidate` | ❌ (MCP authorization error) | ✅ |

AgentFS session tools (`memofs_agent_session_*`), graph/raw resources, and prompts are **not** exposed over HTTP — if your CI flow needs those, switch to the stdio server with a checkout.

---

## Example A — Claude Code (GitHub Actions)

Uses the official [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action). The action runs `claude code` headless on the runner; it reads your project's `.mcp.json` for MCP server config. We point **that config at the hosted endpoint** with a read-only Bearer key.

### `.github/workflows/claude-mcp.yml`

```yaml
name: Claude (Memory aware - MemoFS)

on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

jobs:
  claude:
    if: |
      (github.event_name == 'pull_request') ||
      (github.event_name == 'issue_comment' &&
       contains(github.event.comment.body, '@claude'))
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        env:
          # Inject the read-only MemoFS API key via the action's env block.
          MEMOFS_API_KEY: ${{ secrets.MEMOFS_API_KEY_READONLY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          # Point Claude at the hosted MCP endpoint.
          mcp_config: |
            {
              "mcpServers": {
                "memofs": {
                  "type": "http",
                  "url": "https://memofs.dev/api/v1/projects/${{ vars.MEMOFS_PROJECT_ID }}/mcp",
                  "headers": {
                    "Authorization": "Bearer ${MEMOFS_API_KEY}"
                  }
                }
              }
            }
          # Now ask Claude to ground its review in durable project memory.
          prompt: |
            Review this PR. Before writing anything, call `memofs.context`
            with taskType=refactor, then `memofs.recall` for any architectural
            constraints that affect this PR's paths.
```

### Setup steps

1. **Push your project to the cloud** once from a dev machine:
   ```bash
   memofs cloud sync push
   ```
2. **Create a read-only API key** on the MemoFS dashboard → API Keys → *New key* → scope: **Read-only**. Copy the value.
3. **Add GitHub secrets and variables** (repo → Settings → Secrets and variables → Actions):
   - Secret: `MEMOFS_API_KEY_READONLY` — the read-only key value.
   - Secret: `ANTHROPIC_API_KEY` — your Anthropic API key.
   - Variable: `MEMOFS_PROJECT_ID` — the project ID from the dashboard's Memory page URL.
4. Commit `.github/workflows/claude-mcp.yml` and open a PR or `@claude`-mention it.

### What you'll see

On every PR (or on `@claude` mentions on issues), Claude launches on a GitHub runner, calls `memofs.context` and `memofs.recall` over HTTP before writing anything, and grounds its review in the same memory your local agents write to. MemoFS writes from your local agents land in the same hosted replica; CI picks them up on its next run with no `git pull` of `.memofs/`.

### If you also want CI to *record* findings

Switch the secret to a **read-write** key. Claude can then call `memofs.remember` to stamp review findings (e.g. "this PR violated constraint X") — they're attributed to the key's label on the dashboard's Memory page. Keep the key per-environment so you can revoke one without breaking the other.

---

## Example B — OpenAI Codex (GitHub Actions)

Codex launched by CI runs from an `AGENTS.md` and reads MCP server config from `~/.codex/config.toml`. We write the hosted endpoint into that file before launch, then run Codex headless.

### `.github/workflows/codex-mcp.yml`

```yaml
name: Codex (Memory aware - MemoFS)

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  codex:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Codex CLI
        run: npm install -g @openai/codex

      - name: Configure MemoFS MCP (read-only)
        env:
          MEMOFS_API_KEY: ${{ secrets.MEMOFS_API_KEY_READONLY }}
          MEMOFS_PROJECT_ID: ${{ vars.MEMOFS_PROJECT_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          mkdir -p ~/.codex
          cat > ~/.codex/config.toml <<EOF
          [mcp_servers.memofs]
          type = "http"
          url = "https://memofs.dev/api/v1/projects/${MEMOFS_PROJECT_ID}/mcp"
          headers = { Authorization = "Bearer ${MEMOFS_API_KEY}" }
          EOF

      - name: Run Codex headless (review grounded in MemoFS)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          codex exec --skip-git-repo-check \
            "Review this PR. First call memofs.context with taskType=refactor, \
            then memofs.recall for architectural constraints relevant to this PR. \
            Summarize any violations before recommending changes."
```

> [!NOTE]
> Codex's `[mcp_servers.<name>]` block historically supported stdio (`command`/`args`) only. streamable-HTTP support in `~/.codex/config.toml` is rolling out across Codex versions — if `[mcp_servers.memofs] type = "http"` is rejected by your installed Codex, run Codex from a runner with a checkout instead (use the stdio server with `--runtime hybrid`, see [`../coding-agent/`](../coding-agent/)). Match the `type` field against your Codex version's release notes.

### Setup steps

1. Same `memofs cloud sync push` and read-only key creation as Example A.
2. Add repo secret `MEMOFS_API_KEY_READONLY` and variable `MEMOFS_PROJECT_ID` (and `OPENAI_API_KEY` for Codex itself).
3. Commit the workflow and open a PR.

---

## Why these setups work

Every MCP client that supports the **streamable-HTTP transport** (Claude Code, Cursor, VS Code, Continue, opencode remote, Codex HTTP) consumes the same two facts: a server `url` and a Bearer `Authorization` header. The hosted endpoint speaks plain MCP JSON-RPC over that transport, so any such client will work — your CI secret manager injects the key as an env var, and the workflow's config file substitutes `$MEMOFS_PROJECT_ID`.

Three constraints worth remembering:

1. **Plan limit** — the hosted endpoint is Pro (60 req/min/key) or Teams (300 req/min/key). A single CI agent stays well under either; a fleet of parallel jobs should split across keys.
2. **Project must exist** — `memofs cloud sync push` from a dev machine first; otherwise CI gets `404`.
3. **Read-only is the right default** — write tools come back as MCP authorization errors, never as silent failures.

## Troubleshooting

### `404` "Project not found. Push it with `memofs cloud sync push` first."
The project has never been synced to the cloud. Run `memofs cloud sync push` from a machine that has the repo checked out and the CLI configured.

### `402` "The hosted MCP endpoint requires a Pro or Teams plan."
The API key's account is on Free. Upgrade the account, or use a key minted by a paid account.

### Claude says "I don't have access to a `memofs` tool" / Codex's `[mcp_servers.memofs]` block is rejected
Your installed client/version doesn't support streamable-HTTP MCP yet, or the `type` field is named differently (e.g. `transport = "http"` in some Codex builds). Fall back to the stdio server with a checkout and `--runtime hybrid` — see [`../coding-agent/`](../coding-agent/).

### `memofs.remember` calls fail with an MCP authorization error
Your key is read-only by design. Either mint a read-write key (and put it in a *separate* secret from the read-only one, so you can scope per-job), or accept that CI never writes.

### `429` "MCP rate limit exceeded. Try again shortly."
You hit the plan's per-minute cap. Back off (GitHub Actions can `sleep`); the cloud's `Retry-After` tells you when the bucket resets. For sustained parallel pressure, add a second key and split jobs across both.

## See also

- [Hosted MCP endpoint docs](https://docs.memofs.dev/packages/mcp/hosted-mcp-endpoint) — the full surface: rate limits, the 5-step check pipeline, per-client snippets.
- [Hybrid mode docs](https://docs.memofs.dev/packages/mcp/hybrid-mode) — for CI flows *with* a checkout that should also mirror writes to the cloud.
- [`../coding-agent/`](../coding-agent/) — local stdio setup (Cursor, Claude Code, Codex, Copilot, Gemini) when the agent has a working copy.
- [CLI memory commands](https://docs.memofs.dev/packages/cli/memory) — `memofs cloud sync push` to provision the hosted replica; `memofs cloud sync pull` to reconcile local memory after CI writes.
