# GitHub Enterprise Server + Claude Code + MemoFS

*(OpenAI doesn't currently document a
GHES-specific integration comparable to this one. If your org uses Codex
against a self-hosted GitHub instance, treat it as a plain GitHub Actions
setup — see [`../github-actions/codex.md`](../github-actions/codex.md) — and
skip the rest of this file.)*

## What "GHES support" actually is

Claude Code's GitHub Enterprise Server integration (Team/Enterprise plans)
connects your self-hosted GitHub instance to Anthropic's **hosted** product
features — web sessions (`claude --cloud`), the hosted **Code Review**
feature, Claude Security, contribution metrics. An Owner connects the
instance once via `claude.ai/admin-settings/claude-code`, and after that
developers use GHES repos without per-repo setup.

**None of that hosted surface takes custom MCP servers** — same limitation as
on github.com (see [`../code-review/claude-code.md`](../code-review/claude-code.md)).
So if the goal is memory-aware review specifically, GHES doesn't change the
answer: you still want the manual GitHub Actions workflow from
[`../github-actions/claude-code.md`](../github-actions/claude-code.md), just
running on Actions runners attached to your GHES instance instead of
github.com. The doc explicitly says as much: *"If you also want GitHub
Actions workflows on GHES, adapt the example workflow manually"* — the
`/install-github-app` quick-setup command is github.com-only.

## What actually differs on GHES

The workflow YAML from `github-actions/claude-code.md` doesn't need any
MemoFS-specific changes to run on a GHES-connected runner — GitHub Actions on
GHES sets `GITHUB_API_URL` / `GITHUB_SERVER_URL` to point at your enterprise
host automatically, and `actions/checkout`, `gh`, and the claude-code-action
all respect that without extra configuration. The one thing that *is*
different, and worth checking before you assume the workflow will just work:

### Network reachability

github.com-hosted runners already have outbound access to `memofs.dev` and
`api.anthropic.com`. **Self-hosted runners behind your GHES instance's
firewall may not.** Before wiring memory into a GHES-hosted review workflow,
confirm the runner can reach:

- `https://memofs.dev` (the hosted MCP endpoint)
- `https://api.anthropic.com` (or your Bedrock/Vertex endpoint, if you're
  using one of those providers instead)

If your runners are locked down to an allowlist, you'll need to add
`memofs.dev` to it explicitly — it won't be covered by whatever allowlist
entry you already have for Anthropic's API IP ranges.

### The GitHub MCP server doesn't work on GHES — not relevant here, but adjacent

Worth knowing since it's the same category of limitation: Claude's *built-in*
GitHub MCP server is documented as not supporting GHES instances at all (use
`gh` CLI configured for your GHES host instead, if you need that). This
doesn't affect the memofs MCP server — that's a separate, self-hosted-by-you
endpoint with no GHES-specific restriction — but it's the kind of gotcha that
tends to get discovered the hard way if you're setting up both at once.

## Setup checklist

1. Confirm GHES-hosted Actions runners can reach `memofs.dev` (see above).
2. Everything else is identical to [`../github-actions/claude-code.md`](../github-actions/claude-code.md):
   `memofs cloud sync push` once, a Pro/Teams MemoFS project, a read-only API key, the
   same three secrets/variables, the same workflow file.
3. If you *also* want the hosted Code Review / web-session features
   connected (for non-memory-aware use), that's the separate admin flow at
   `claude.ai/admin-settings/claude-code` — orthogonal to this, do both if
   you want both.

## See also

- [`../github-actions/claude-code.md`](../github-actions/claude-code.md) — the workflow this file builds on, including troubleshooting and the security notes on key scope.
- [`../code-review/claude-code.md`](../code-review/claude-code.md) — the hosted-vs-custom Code Review distinction, in more depth.