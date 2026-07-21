# GitLab CI/CD — Claude Code + MemoFS (hosted MCP, read-only)

Claude Code's GitLab integration (currently in beta, maintained by GitLab) is
a raw CLI invocation inside a `.gitlab-ci.yml` job — no packaged action the
way GitHub has. That actually makes MemoFS wiring simpler: it's the same
`claude` CLI flags as everywhere else, just invoked from `script:` directly.

## Prerequisites

Same as the GitHub Actions version: `memofs cloud sync push` run once, MemoFS Cloud on
Pro or Teams, and a **read-only** API key for this job — see
[`../github-actions/claude-code.md#security-notes`](../github-actions/claude-code.md#security-notes)
for why read-only is the default here, not an afterthought.

## CI/CD variables to add

Settings → CI/CD → Variables:

| Key | Masked | Protected | Value |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | as needed | from console.anthropic.com |
| `MEMOFS_API_KEY_READONLY` | yes | as needed | read-only key from the MemoFS dashboard |
| `MEMOFS_PROJECT_ID` | no | no | project ID from the Memory page URL |

## The job

`.gitlab-ci.yml`:

```yaml
stages:
  - ai

claude-review:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  variables:
    GIT_STRATEGY: fetch
  before_script:
    - apk update
    - apk add --no-cache git curl bash
    - curl -fsSL https://claude.ai/install.sh | bash
    # GitLab CI/CD variables are real shell env vars in the job, so this
    # heredoc is intentionally unquoted — $MEMOFS_API_KEY and
    # $MEMOFS_PROJECT_ID get substituted by the shell, not by GitLab's own
    # templating layer.
    - |
      cat > /tmp/memofs-mcp.json <<EOF
      {
        "mcpServers": {
          "memofs": {
            "type": "http",
            "url": "https://memofs.dev/api/v1/projects/$MEMOFS_PROJECT_ID/mcp",
            "headers": {
              "Authorization": "Bearer $MEMOFS_API_KEY"
            }
          }
        }
      }
      EOF
  script:
    - >
      claude
      -p "Call the memofs MCP tool for context on this repo, then review this MR for bugs, security issues, and consistency with what memory returned. Post the review as an MR comment."
      --mcp-config /tmp/memofs-mcp.json
      --permission-mode acceptEdits
      --allowedTools "Bash Read mcp__memofs__* mcp__gitlab"
      --debug
  variables:
    MEMOFS_API_KEY: $MEMOFS_API_KEY_READONLY
```

That last `variables:` line just renames the masked secret to the plain env
var name the heredoc expects — keeps the masked variable's name matching
what you set in the GitLab UI while giving the config file a predictable
name to reference.

### `--permission-mode acceptEdits` vs. the GitHub Actions `--dangerously-skip-permissions`

GitLab's own official example uses `--permission-mode acceptEdits`, not the
harder skip flag — this is GitLab-maintained, not an Anthropic doc, so I
can't fully confirm it clears the same MCP-tool-approval gate that hangs the
GitHub Actions wrapper (documented in `claude-code-action` discussion #871).
If the job hangs rather than erroring or completing, add
`--dangerously-skip-permissions` to the `claude` invocation as the more
heavily confirmed fix — same reasoning as the GitHub Actions version applies:
this job runs in an isolated container with a read-only memory key, so the
blanket skip is a reasonable trade here.

## Security notes

Identical to the GitHub Actions version — read-only key, restrict `rules:`
to trusted sources if your GitLab project accepts external MRs, same
prompt-injection reasoning. See
[`../github-actions/claude-code.md#security-notes`](../github-actions/claude-code.md#security-notes).
One GitLab-specific addition: **mask and protect** both API key variables in
the UI (the table above) — an unmasked variable prints in plain text in job
logs the moment anything echoes it, including some CLI debug output.

## Troubleshooting

Same failure modes as [`../github-actions/claude-code.md`](../github-actions/claude-code.md#troubleshooting)
(404 on an unpushed project, 402 on a Free-tier key, 429 on rate limit) —
the hosted endpoint behaves identically regardless of which CI system is
calling it. GitLab-specific ones:

| Symptom | Cause | Fix |
|---|---|---|
| Job can't post MR comments | `mcp__gitlab` not in `--allowedTools`, or `CI_JOB_TOKEN` lacks `api` scope | add the tool to the allowlist; consider a Project Access Token with `api` scope stored as `GITLAB_ACCESS_TOKEN` instead of relying on `CI_JOB_TOKEN` |
| Secret shows up in job log | variable not masked in Settings → CI/CD → Variables | mask it — see the table above |

## See also

- [`../github-actions/claude-code.md`](../github-actions/claude-code.md) — the GitHub Actions version of this same recipe, more thoroughly confirmed on the MCP-approval-gate question.
- [`codex.md`](./codex.md) — the equivalent for Codex CLI on GitLab.