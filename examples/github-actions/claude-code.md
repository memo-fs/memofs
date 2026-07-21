# GitHub Actions — Claude Code + MemoFS (hosted MCP, read-only)

Wires `anthropics/claude-code-action` to the MemoFS hosted MCP endpoint so a
GitHub-hosted runner — which never has a `.memofs/` checkout — can call
`memofs.context` / `memofs.recall` before it reviews or edits anything.

> Corrections vs. an earlier draft of this doc: the action has **no `mcp_config`
> input** — that input is deprecated in v1 and forwards to `claude_args:
> "--mcp-config '{...}'"` instead. `enableAllProjectMcpServers` is already forced
> to `true` by the action, so *server-level* trust isn't the blocker; the actual
> friction is *tool-level* permission (see step 3 below). Both corrections are
> straight from `anthropics/claude-code-action/docs/configuration.md`.

## Prerequisites

- `memofs cloud sync push` has run at least once from a machine with a checkout — the
  hosted replica must already exist, or every call 404s.
- MemoFS Cloud project on **Pro** (60 req/min) or **Teams** (300 req/min) — the
  hosted endpoint is locked on Free.
- A **read-only** MemoFS API key for this workflow (dashboard → API Keys →
  scope: read-only). `memofs.remember` / `memofs.consolidate` fail with an MCP
  authorization error on a read-only key — that's by design here, not a bug.
  See **Security** below for why read-only is the default, not just a suggestion.

## Secrets & variables to add

Repo → Settings → Secrets and variables → Actions:

| Name | Type | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | from console.anthropic.com (or use `CLAUDE_CODE_OAUTH_TOKEN` instead) |
| `MEMOFS_API_KEY_READONLY` | Secret | read-only key from the MemoFS dashboard |
| `MEMOFS_PROJECT_ID` | Variable | project ID from the Memory page URL — not secret, no need to mask |

## The workflow

`.github/workflows/claude-review.yml`:

```yaml
name: Claude Code Review (memory-aware)

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  claude-review:
    # SECURITY: restrict who can trigger this — see the Security section below
    if: github.event.pull_request.user.login == github.repository_owner
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      # Bake the secret into a file at GH-Actions-templating time (the
      # documented pattern from claude-code-action's own "Passing Secrets to
      # MCP Servers" example) rather than relying on runtime shell expansion.
      - name: Write MemoFS MCP config
        run: |
          cat > /tmp/memofs-mcp.json <<'EOF'
          {
            "mcpServers": {
              "memofs": {
                "type": "http",
                "url": "https://memofs.dev/api/v1/projects/${{ vars.MEMOFS_PROJECT_ID }}/mcp",
                "headers": {
                  "Authorization": "Bearer ${{ secrets.MEMOFS_API_KEY_READONLY }}"
                }
              }
            }
          }
          EOF

      - name: Run Claude Code Review
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_args: |
            --mcp-config /tmp/memofs-mcp.json
            --allowedTools "mcp__memofs__*"
            --dangerously-skip-permissions
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Before reviewing, call the memofs MCP tool for `context` to load a
            task-ready briefing for this repo (prior review decisions, coding
            conventions, known constraints), and `recall` for anything more
            specific the diff touches. Ground your review in what memory
            returns — don't re-flag things the team already decided.

            Then review the diff for logic errors, security issues, missing
            tests, and consistency with what memory surfaced. Be concise and
            specific. Use `gh pr comment` with your Bash tool to post the review.
```

### Why `--dangerously-skip-permissions` is in there

Without it, the action pauses waiting for interactive tool-use approval —
and there's no terminal in CI to click "approve," so the job just hangs.
This is the documented fix for exactly this situation
(`anthropics/claude-code-action` discussion #871), and it's reasonable here
because the job is scoped to a single-purpose, isolated runner with a
read-only memory key and read-only repo contents permission. If you'd rather
not blanket-skip everything, the narrower alternative is a `settings` block:

```yaml
settings: |
  {
    "permissions": { "allow": ["mcp__memofs__*"], "deny": [] },
    "permissionMode": "allowlist"
  }
```

### Verify the tool name once before trusting it in CI

The hosted endpoint's tools are literally named `memofs.context`,
`memofs.recall`, etc. (with a dot). Claude Code's naming convention is
`mcp__<server>__<tool>`, so the full name is *probably*
`mcp__memofs__memofs.context` — but confirm with `/mcp` in a local, interactive
session before relying on it. That's why the example above allowlists with the
`mcp__memofs__*` wildcard instead of spelling out each dotted name.

## Security notes

- **Why read-only, specifically**: this job feeds untrusted content (PR diff,
  title, body — possibly attacker-controlled) into an agent that has live
  network access to your memory graph. If a read-write key were used and the
  diff contained text engineered to make Claude call `memofs.remember`,
  you'd have a prompt-injection path into shared project memory, attributed
  to your CI's key label. Read-only removes that path entirely — write tools
  fail with an MCP authorization error instead of executing.
- **Restrict who can trigger the job.** The `if:` condition above only runs
  for PRs from the repo owner. For a team repo, use an explicit allow-list of
  trusted authors instead — the point is keeping this closed to arbitrary
  forks even though the key is read-only, since diff content still reaches
  a live agent.
- If you later want the reviewer to *record* findings, mint a **separate**
  read-write key, use it only on a trusted-author-gated workflow, and expect
  the write to be attributed to that key's label on the dashboard's Memory
  page event log.

## Sync note

Anything written from a read-write CI key lands in the hosted replica only.
Local checkouts need `memofs cloud sync pull` (or the background `memofs cloud sync status`) before
they'll see it — there's no automatic push back to `.memofs/` on every machine.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `404 Project not found. Push it with memofs cloud sync push first.` | project never synced to the cloud | run `memofs cloud sync push` from a machine with a checkout |
| `402 requires a Pro or Teams plan` | key's account is on Free | upgrade, or use a key from a paid account |
| Job hangs, no output | interactive approval prompt with no terminal to answer it | add `--dangerously-skip-permissions` or the `settings` allowlist above |
| "I don't have access to a `memofs` tool" | wrong tool name in `--allowedTools`, or `/tmp/memofs-mcp.json` wasn't written before the action step | confirm the file exists in a debug step; verify tool name via local `/mcp` |
| `memofs.remember` fails with an MCP authorization error | expected — your key is read-only | mint a read-write key on a separate, trusted-author-gated workflow if you actually want this |
| `429 MCP rate limit exceeded` | plan's per-minute cap hit | back off; `Retry-After` tells you when the bucket resets; split across keys or upgrade to Teams for sustained parallel load |

## See also

- [`../code-review/claude-code.md`](../code-review/claude-code.md) — same idea, wired into Claude Code's built-in Code Review plugin and a `CLAUDE.md`/`REVIEW.md` convention instead of a fully custom prompt.
- [`../code-review/github-enterprise.md`](../code-review/github-enterprise.md) — running this on a GHES-hosted runner.
- [`../gitlab-ci-cd/claude-code.md`](../gitlab-ci-cd/claude-code.md) — the same recipe for `.gitlab-ci.yml`.
- [Hosted MCP endpoint reference](https://docs.memofs.dev/packages/mcp/hosted-mcp-endpoint) — rate limits, key scopes, the full request-check pipeline.