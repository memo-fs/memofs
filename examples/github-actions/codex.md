# GitHub Actions — Codex + MemoFS (hosted MCP, read-only)

Wires `openai/codex-action` to the MemoFS hosted MCP endpoint. Codex CLI reads
MCP servers from `config.toml`; the action's `codex-home` input lets you point
it at a directory you generate in the workflow instead of committing one.

## Prerequisites

Same as the Claude Code version: `memofs cloud sync push` has run once, the account is
on Pro or Teams, and you're using a **read-only** key for this workflow. See
[`claude-code.md`](./claude-code.md#security-notes) for the reasoning — it
applies identically here (an agent reading a PR diff, with live network
access to your memory graph, should not also hold write credentials to it).

## Secrets & variables

| Name | Type | Value |
|---|---|---|
| `OPENAI_API_KEY` | Secret | from platform.openai.com |
| `MEMOFS_API_KEY_READONLY` | Secret | read-only key from the MemoFS dashboard |
| `MEMOFS_PROJECT_ID` | Variable | project ID from the Memory page URL |

## The workflow

`.github/workflows/codex-review.yml`:

```yaml
name: Codex Review (memory-aware)

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  codex-review:
    if: github.event.pull_request.user.login == github.repository_owner
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    outputs:
      final_message: ${{ steps.run_codex.outputs.final-message }}
    steps:
      - uses: actions/checkout@v5
        with:
          ref: refs/pull/${{ github.event.pull_request.number }}/merge
          persist-credentials: false

      - name: Write Codex config
        run: |
          mkdir -p codex-home
          cat > codex-home/config.toml <<EOF
          [profiles.ci]
          sandbox_mode = "workspace-write"
          approval_policy = "never"

          [mcp_servers.memofs]
          url = "https://memofs.dev/api/v1/projects/${{ vars.MEMOFS_PROJECT_ID }}/mcp"
          bearer_token_env_var = "MEMOFS_API_KEY"
          EOF

      - name: Run Codex
        id: run_codex
        uses: openai/codex-action@v1
        env:
          MEMOFS_API_KEY: ${{ secrets.MEMOFS_API_KEY_READONLY }}
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          codex-home: codex-home
          sandbox: workspace-write
          codex-args: '["--profile", "ci"]'
          prompt: |
            This is PR #${{ github.event.pull_request.number }} for ${{ github.repository }}.

            Before reviewing, use the memofs MCP tool to pull prior review
            decisions and conventions for this repo. Then review only the
            changes introduced by this PR for bugs, missing tests, and
            consistency with what memory surfaced. Be concise and specific.

            ${{ github.event.pull_request.title }}
            ${{ github.event.pull_request.body }}

  post_feedback:
    runs-on: ubuntu-latest
    needs: codex-review
    if: needs.codex-review.outputs.final_message != ''
    permissions:
      pull-requests: write
    steps:
      - uses: actions/github-script@v7
        env:
          CODEX_FINAL_MESSAGE: ${{ needs.codex-review.outputs.final_message }}
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: process.env.CODEX_FINAL_MESSAGE,
            });
```

### The known rough edge: MCP tool calls in non-interactive `codex exec`

This is real, not hypothetical — flagging it plainly rather than letting you
discover it mid-debug. There's an open upstream issue
(`openai/codex#24135`) describing MCP tool calls getting auto-cancelled
under `codex exec` because there's no stdin to approve them against, even
with a sandbox mode set. The `[profiles.ci]` block above
(`approval_policy = "never"`) is the documented fix path and should cover it.
If memofs calls still hang or get silently cancelled in your run, the only
confirmed-working fallback right now is adding
`"--dangerously-bypass-approvals-and-sandbox"` to `codex-args`. That flag
removes Codex's filesystem sandbox too, not just the MCP approval gate, so
I'd only reach for it if the profile above actually fails for you — test the
profile first.

### Network access inside the sandbox

`workspace-write` disables network access by default for anything Codex runs
*as a command* (`[sandbox_workspace_write].network_access` must be explicitly
set to `true` for that). MCP server connections are made by the Codex host
process itself, not through that per-command sandbox, so they shouldn't be
affected — but this isn't something I've seen explicitly confirmed in
writing, so if `memofs.context` calls fail with a network-looking error
rather than an approval-looking one, that's the first thing to check.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `404 Project not found` | project never synced | `memofs cloud sync push` from a checkout first |
| MCP calls hang / get cancelled | non-interactive approval gate (codex#24135) | confirm `approval_policy = "never"` is active via the profile; fall back to the bypass flag only if needed |
| `[mcp_servers.memofs]` rejected entirely | installed Codex version predates streamable-HTTP support in `config.toml` | check `codex --version` against Codex's release notes; there's no local-checkout fallback here the way there is for hybrid mode |
| Auth error from the memofs endpoint | `bearer_token_env_var` name doesn't match the `env:` key on the action step | the string in `config.toml` and the env var name in the workflow's `env:` block must match exactly (`MEMOFS_API_KEY` in both places above) |

## See also

- [`claude-code.md`](./claude-code.md) — the same recipe for Claude Code.
- [`../code-review/codex.md`](../code-review/codex.md) — wiring this into `AGENTS.md` review guidelines instead of a fully custom prompt.
- [`../gitlab-ci-cd/codex.md`](../gitlab-ci-cd/codex.md) — the same pattern for a GitLab runner.