# GitHub Actions — Cursor CLI + MemoFS (currently unreliable — read before using)

Cursor has an official headless CLI (`cursor-agent`) and official GitHub
Actions docs (`cursor.com/docs/cli/github-actions`, `cursor.com/docs/cli/headless`).
In principle the setup mirrors Claude/Codex: install the CLI, point it at an
`mcp.json`, run non-interactively.

**In practice, as of mid-2026, MCP servers reliably fail to attach in headless
mode.** This isn't a guess — it's multiple corroborated reports on Cursor's
own community forum:

- `cursor-agent mcp list` returns "No MCP servers configured" in CI even when
  the config file is present and verified in the pipeline.
- A separate report found `cursor-agent -p "..."` (plain non-interactive)
  fails to reach a configured MCP server, while `cursor-agent --force -p "..."`
  worked for the same server in the same environment — but `--force` isn't
  documented as a supported, stable flag for this purpose, and other users
  report it not resolving the issue for them.
- The root complaint across threads: in headless mode, MCP tools require the
  workspace to be "trusted" through an interactive UI flow that has no
  non-interactive equivalent, and no config key currently exists to
  pre-approve that trust the way Claude's `enableAllProjectMcpServers` or
  Codex's `approval_policy = "never"` do.

## What this means for MemoFS specifically

I'd hold off wiring `cursor-agent` into a memory-aware CI review until this is
resolved upstream. If you want to try it anyway:

```yaml
name: Cursor Review (memory-aware, experimental)

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  cursor-review:
    if: github.event.pull_request.user.login == github.repository_owner
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Cursor CLI
        run: curl https://cursor.com/install -fsS | bash

      - name: Write MemoFS MCP config
        run: |
          mkdir -p .cursor
          cat > .cursor/mcp.json <<'EOF'
          {
            "mcpServers": {
              "memofs": {
                "url": "https://memofs.dev/api/v1/projects/${{ vars.MEMOFS_PROJECT_ID }}/mcp",
                "headers": {
                  "Authorization": "Bearer ${{ secrets.MEMOFS_API_KEY_READONLY }}"
                }
              }
            }
          }
          EOF

      - name: Run Cursor (may not see the MCP server — verify with the debug step below)
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          cursor-agent mcp list   # debug: confirm the server is actually recognized before trusting the run
          cursor-agent --force -p "Call the memofs MCP tool for context on this repo, then review PR #${{ github.event.pull_request.number }}."
```

The `cursor-agent mcp list` line is there deliberately — run it before the
real prompt, at least the first few times, and check the job log. If it
prints "No MCP servers configured," the rest of the run isn't actually
memory-aware even if it completes without error.

## Recommendation

Until Cursor ships a documented, stable way to pre-trust MCP servers
headlessly, use Cursor CLI in CI for tasks that don't need MemoFS (plain code
review against `.cursor/rules`, for instance), and keep the memory-aware
review on Claude Code or Codex — both of which have a confirmed, working path
(see [`claude-code.md`](./claude-code.md) and [`codex.md`](./codex.md)).

## See also

- Cursor CLI headless docs: `cursor.com/docs/cli/headless`
- Cursor CLI GitHub Actions docs: `cursor.com/docs/cli/github-actions`
- Cursor community forum threads on this exact limitation (search "MCP servers not recognized cursor-cli CI")