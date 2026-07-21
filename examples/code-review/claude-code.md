# Claude Code's "Code Review" feature + MemoFS

Two different things both get called "Claude code review," and only one of
them can see MemoFS:

| | Hosted **Code Review** (claude.ai admin settings) | Manual **GitHub Actions** workflow |
|---|---|---|
| Where it runs | Anthropic's cloud infrastructure | your own Actions runner |
| Trigger | automatic on every PR, or `@claude review` | whatever `on:` you configure |
| Custom MCP servers | **not supported** — no exposed mechanism for it | fully supported via `--mcp-config` |
| Reads | `CLAUDE.md` in your repo | `CLAUDE.md`, plus whatever you pass in `prompt` |
| Setup | one-time, org-wide, via claude.ai admin settings | a workflow file per repo |

**If you want memory-aware review, use the manual GitHub Actions path** —
see [`../github-actions/claude-code.md`](../github-actions/claude-code.md)
for the full workflow. This file covers the part that's specific to *review*
as a use case: using Claude Code's packaged `code-review` plugin instead of a
fully custom prompt, and wiring `CLAUDE.md` / `REVIEW.md` so the review
criteria — including "check MemoFS first" — live in a file instead of being
re-typed into every workflow.

## Option A — packaged `code-review` plugin + memory

Claude Code ships a `code-review` skill as an installable plugin
(`plugin_marketplaces: anthropics/claude-code.git`, `plugins: code-review@claude-code-plugins`).
It's a fixed skill, so you can't rewrite its internal steps, but you *can*
give the session MCP tools alongside it and tell it, via `CLAUDE.md`, to
consult memory as part of what it treats as "your standards":

```yaml
name: Code Review (plugin + MemoFS)

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    if: github.event.pull_request.user.login == github.repository_owner
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

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

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          claude_args: |
            --mcp-config /tmp/memofs-mcp.json
            --allowedTools "mcp__memofs__*"
            --dangerously-skip-permissions
          prompt: "/code-review:code-review ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
```

Secrets/variables needed: same table as
[`../github-actions/claude-code.md`](../github-actions/claude-code.md#secrets--variables-to-add).

Because the skill itself reads `CLAUDE.md` for "review criteria," this is
where `REVIEW.md` comes in — see below.

## Option B — custom prompt (more control, what most teams end up using)

If you want the review to explicitly cite what memory returned, rather than
trusting the packaged skill to notice `CLAUDE.md`'s pointer, use the fully
custom-prompt workflow instead — that's exactly
[`../github-actions/claude-code.md`](../github-actions/claude-code.md); nothing
to add here.

## Wiring `REVIEW.md` into `CLAUDE.md`

Claude Code supports `@path/to/file` imports inside `CLAUDE.md` — the import
is resolved and its content is genuinely pulled into context (not just a
prose hint the model might follow). Put your review-specific instructions in
`REVIEW.md` at the repo root, then reference it from `CLAUDE.md`:

```markdown
# CLAUDE.md

@REVIEW.md

<!-- rest of your normal project instructions -->
```

See [`../templates/REVIEW.md`](../templates/REVIEW.md) for a MemoFS-aware
version of the review-rules template, adapted from the general agent-rules
bootstrap file.

Two things worth knowing about the import:

- It's evaluated once at session start (and again after `/compact`), not
  re-fetched per tool call — so `REVIEW.md` behaves like part of `CLAUDE.md`
  itself, not a lazy reference.
- First-time external imports outside the working tree trigger an approval
  dialog in interactive sessions. `REVIEW.md` living in the same repo avoids
  that entirely — it's not "external."

## Security note

Same reasoning as the GitHub Actions doc, worth restating because "Code
Review" sounds like a passive/read-only feature and it's easy to forget the
underlying agent has live memory access: use a **read-only** MemoFS key for
any review path, custom prompt or plugin, that processes PR content from
authors you don't fully trust. See
[`../github-actions/claude-code.md#security-notes`](../github-actions/claude-code.md#security-notes)
for the full reasoning.

## See also

- [`../github-actions/claude-code.md`](../github-actions/claude-code.md) — the underlying workflow mechanics, troubleshooting, rate limits.
- [`codex.md`](./codex.md) — the same comparison for Codex Cloud's Code Review vs. `openai/codex-action`.