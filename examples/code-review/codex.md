# Codex Cloud's "Code Review" feature + MemoFS

Same split as the Claude Code side:

| | Hosted **Codex Cloud Code Review** (chatgpt.com/codex/settings/code-review) | Manual **GitHub Actions** workflow |
|---|---|---|
| Where it runs | OpenAI's cloud infrastructure | your own Actions runner |
| Trigger | automatic on every PR, or `@codex review` comment | whatever `on:` you configure |
| Custom MCP servers | **not supported** — configured entirely through repo settings, no MCP hook exposed | fully supported via `config.toml` |
| Reads | `AGENTS.md`, specifically a `## Review guidelines` section | `AGENTS.md`, plus whatever you pass in `prompt` |
| Setup | enable per-repo in Codex settings | a workflow file per repo |

**If you want memory-aware review, use `openai/codex-action`** — see
[`../github-actions/codex.md`](../github-actions/codex.md) for the full
workflow. This file covers the review-specific piece: how `AGENTS.md`'s
review-guidelines convention interacts with MemoFS.

## `AGENTS.md` review guidelines

Codex Cloud's hosted review searches your repo for `AGENTS.md` files and
follows the closest one's `## Review guidelines` section — more specific
guidance deeper in the tree overrides higher-level guidance. Even though the
*hosted* version can't reach your MemoFS project, the same `AGENTS.md`
section is exactly what a `codex-action`-based CI run will read too (Codex
has the repo checked out, so it can open and follow `AGENTS.md` like any
other file), so it's worth writing once, correctly:

```markdown
## Review guidelines

- Before flagging anything, call the memofs MCP tool for `context`
  (available in CI runs via the configured `memofs` MCP server — not
  available in the hosted Codex Cloud review, which has no MCP access) to
  load prior review decisions and project constraints. Don't re-flag things
  memory shows were already decided.
- Flag typos and grammar issues as P2.
- Flag missing tests as P1.
- Flag anything that contradicts a constraint returned by memofs.recall as P0.
```

One honest caveat, worth being precise about: Claude's `@import` is a
mechanical context-loading feature — the file's content is deterministically
pulled in. Codex following an `AGENTS.md` pointer to a *separate* file (say,
`REVIEW.md`) is not the same kind of guarantee — it's an instruction the
agent is expected to follow using its normal file-reading tools, not a
built-in import mechanism. In practice it works reliably because reading a
referenced file is a trivial tool call for an agent that already has the
repo checked out, but if you want zero ambiguity, put the guidance directly
in the `## Review guidelines` section of `AGENTS.md` itself rather than a
level of indirection away.

## Security note

Identical reasoning to the Claude Code side: `AGENTS.md` guidance runs against
untrusted PR content in the hosted product, and against the same untrusted
content plus a live memofs connection in a `codex-action` CI run. Use a
**read-only** key for review workflows — see
[`../github-actions/codex.md`](../github-actions/codex.md) for the workflow
and [`../github-actions/claude-code.md#security-notes`](../github-actions/claude-code.md#security-notes)
for the fuller reasoning (it applies here without modification).

## See also

- [`../github-actions/codex.md`](../github-actions/codex.md) — the underlying workflow, the non-interactive MCP-approval caveat, troubleshooting.
- [`claude-code.md`](./claude-code.md) — the same comparison for Claude.
- `developers.openai.com/codex/use-cases/github-code-reviews` — official docs on the `AGENTS.md` review-guidelines convention itself.