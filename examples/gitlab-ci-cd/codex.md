# GitLab CI/CD — Codex + MemoFS (hosted MCP, read-only)

Unlike Claude Code's GitLab integration (official, GitLab-maintained, beta),
Codex on GitLab isn't a product OpenAI documents directly — what exists is a
published cookbook pattern (`developers.openai.com/cookbook`, "Automating
Code Quality and Security Fixes with Codex CLI on GitLab") showing the Codex
CLI run in Full Auto mode on an ephemeral GitLab runner. The job below
follows that same shape — CLI installed directly in the job, no packaged
action — with a MemoFS MCP server layered in using the same `config.toml`
primitives already confirmed in
[`../github-actions/codex.md`](../github-actions/codex.md).

## Prerequisites

Same as elsewhere in this set: `memofs cloud sync push` run once, MemoFS Cloud on Pro or
Teams, **read-only** key for this job.

## CI/CD variables to add

Settings → CI/CD → Variables:

| Key | Masked | Value |
|---|---|---|
| `OPENAI_API_KEY` | yes | from platform.openai.com |
| `MEMOFS_API_KEY_READONLY` | yes | read-only key from the MemoFS dashboard |
| `MEMOFS_PROJECT_ID` | no | project ID from the Memory page URL |

## The job

`.gitlab-ci.yml`:

```yaml
stages:
  - ai

codex-review:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  variables:
    GIT_STRATEGY: fetch
    MEMOFS_API_KEY: $MEMOFS_API_KEY_READONLY
  before_script:
    - apk update
    - apk add --no-cache git curl bash
    - npm install -g @openai/codex
    - mkdir -p codex-home
    - |
      cat > codex-home/config.toml <<EOF
      [profiles.ci]
      sandbox_mode = "workspace-write"
      approval_policy = "never"

      [mcp_servers.memofs]
      url = "https://memofs.dev/api/v1/projects/$MEMOFS_PROJECT_ID/mcp"
      bearer_token_env_var = "MEMOFS_API_KEY"
      EOF
  script:
    - >
      CODEX_HOME=$(pwd)/codex-home
      codex exec --profile ci --skip-git-repo-check
      "Call the memofs MCP tool for context on this repo, then review this
      merge request for bugs, security issues, and consistency with what
      memory returned. Be concise and specific."
```

Two things carried straight over from the GitHub Actions version, because
they're properties of Codex itself, not the CI system:

- **The `[profiles.ci]` block matters.** Non-interactive `codex exec` has an
  open upstream issue (`openai/codex#24135`) where MCP tool calls get
  auto-cancelled without an explicit `approval_policy = "never"`. Same fix,
  same caveat: if it still doesn't work, `--dangerously-bypass-approvals-and-sandbox`
  is the confirmed fallback, at the cost of also dropping the filesystem
  sandbox — test the profile first.
- **`bearer_token_env_var` takes a variable *name*, not the token.** The
  `MEMOFS_API_KEY: $MEMOFS_API_KEY_READONLY` line under `variables:` is what
  actually makes the masked secret available under the plain name the
  `config.toml` expects — same pattern as the Claude Code GitLab job.

## Security notes

Same as everywhere else in this set — read-only key, mask both API key
variables in the GitLab UI, restrict `rules:` if the project accepts external
MRs. See [`../github-actions/claude-code.md#security-notes`](../github-actions/claude-code.md#security-notes)
for the underlying reasoning (it's CI-system-agnostic).

## Troubleshooting

Same hosted-endpoint failure modes as the other files in this set (404 / 402
/ 429 — see [`../github-actions/codex.md`](../github-actions/codex.md#troubleshooting)).
GitLab/cookbook-pattern-specific:

| Symptom | Cause | Fix |
|---|---|---|
| `npm install -g @openai/codex` fails on Alpine | missing build deps for a native dependency | switch the job `image:` to a Debian/Ubuntu-based Node image if Alpine's musl libc causes issues — this is a general Codex-on-Alpine gotcha, not MemoFS-specific |
| Job runs but never touches memofs | `CODEX_HOME` not picked up | confirm the `CODEX_HOME=$(pwd)/codex-home` prefix is actually on the `codex exec` line — Codex only reads `~/.codex/config.toml` by default, and a GitLab job's `$HOME` isn't guaranteed to be where you wrote the file |

## See also

- [`../github-actions/codex.md`](../github-actions/codex.md) — the GitHub Actions version, with the fuller non-interactive-approval writeup.
- [`claude-code.md`](./claude-code.md) — the equivalent for Claude Code on GitLab.
- `developers.openai.com/cookbook/examples/codex/secure_quality_gitlab` — the cookbook this pattern is adapted from (code-quality/SAST reporting, not review, but same CLI-in-a-runner shape).