# Generate Commands

The `generate` command family produces agent instruction files, platform-specific hooks, and MCP server configuration that enforce the MemoFS memory workflow. Generated files contain only behavioral rules and pointers — no project facts (those live in MemoFS memory).

## `memofs generate agent`

The one-go setup command: emits the rules file, platform hooks (when the platform supports them), and the MCP server config for `@memofs/mcp-server`, and copies `git-conventions.md` into the platform-local rules directory.

```bash
memofs generate agent claude --project-name "My App"
memofs generate agent codex --scope local
memofs generate agent cursor          # rules + MCP only (no usable hooks)
memofs generate agent --list
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--project-name <name>` | Project name in the header | Directory basename |
| `--no-hooks` | Emit rules + MCP only (no hooks file) | — |
| `--no-mcp` | Emit rules + hooks only (no MCP server config) | — |
| `--scope <scope>` | MCP config scope: `local` or `global` | Platform default |
| `-f, --force` | Overwrite existing files / replace a prior memofs MCP or hook entry | `false` |
| `--list` | List supported targets and their capabilities | `false` |

**Example — full Claude Code setup:**

```bash
memofs generate agent claude --project-name "My App"
```

This produces:

- `CLAUDE.md` — rules file (unified memory workflow; step 1 notes that hooks auto-inject context)
- `.claude/rules/git-conventions.md` — copied from the project root
- `.claude/settings.json` — SessionStart, SubagentStart, and Stop hooks (merged into any existing settings)
- `.mcp.json` — the `memofs` MCP server entry (merged; other servers preserved)

After generation, Claude Code loads MemoFS context at the start of each session (and re-injects it after compaction), subagents receive the same context, and a compliance summary is shown when the session ends.

## `memofs generate agent-rules`

Emits only the MemoFS-enforcing instructions file for a supported platform. The file tells agents to load context, recall, and persist facts via MemoFS MCP tools. Also copies `git-conventions.md` into the platform-local rules directory.

```bash
memofs generate agent-rules claude --project-name "My App"
memofs generate agent-rules --list
```

**Supported targets:**

| Target | Output file | Default MCP config | Rules directory |
|--------|------------|--------------------|-----------------|
| `agents` / `codex` | `AGENTS.md` | `~/.codex/config.toml` (global) | `.agents/rules/` |
| `claude` | `CLAUDE.md` | `.mcp.json` | `.claude/rules/` |
| `gemini` | `GEMINI.md` | `.gemini/settings.json` | `.gemini/rules/` |
| `copilot` | `.github/copilot-instructions.md` | `.vscode/mcp.json` | `.github/rules/` |
| `cursor` | `.cursor/rules/memofs.mdc` | `.cursor/mcp.json` | `.cursor/rules/` |
| `opencode` | `AGENTS.md` | `opencode.json` | `.agents/rules/` |

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--project-name <name>` | Project name in the header | Directory basename |
| `--scope <scope>` | MCP config scope reflected in the pointer: `local` or `global` | Platform default |
| `-f, --force` | Overwrite an existing instructions file | `false` |
| `--list` | List supported targets and their MCP config locations | `false` |

> [!NOTE]
> The generated file is capped at 50 lines. Project facts belong in MemoFS memory, not in the instructions file. If you need custom behavioral rules, pass them via the `rules` option in the programmatic API.

## `memofs generate agent-hooks`

Emits only the platform hook configuration (no rules file). Pair with `generate agent-rules` if you need both, or use `generate agent` for everything in one go.

```bash
memofs generate agent-hooks claude
memofs generate agent-hooks --list
```

> [!NOTE]
> **Supported hook targets:** `claude`, `codex`, `opencode`.<br/>
> Cursor is intentionally not a hook target: its hooks are observational (no session-start event, no way to inject context), so `generate agent cursor` sets up rules + MCP instead. Gemini and Copilot have no hook system.

What each platform's hooks do:

| Platform | Session start | Subagent start | Compaction survival | Session end |
|----------|--------------|----------------|--------------------|-------------|
| Claude Code (`.claude/settings.json`) | Inject context (+ cloud pull) | Inject context | Re-inject via `SessionStart` `compact` matcher | Compliance summary (`systemMessage`) |
| Codex (`.codex/hooks.json`) | Inject context (+ cloud pull) | Inject context | Re-inject via `SessionStart` `compact` matcher | Compliance summary (`systemMessage`) |
| opencode (`.opencode/plugin/memofs.ts`) | Cloud pull + session marker (no injection — the agent loads context via MCP tools) | — | — | Compliance toast |

> [!IMPORTANT]
> Claude Code and Codex inject hook stdout as model-visible context, so the generated rules file says context is auto-loaded. opencode plugins cannot inject context — its rules file keeps the "call `memofs.context` yourself" phrasing, and the plugin only handles the cloud pull, the session-start compliance marker, and the end-of-session status toast.

Writes into `.claude/settings.json` and `.codex/hooks.json` are **merge-safe**: existing settings keys and user-defined hook groups are preserved; prior memofs-owned hook groups are replaced only with `--force`.

> [!NOTE]
> Codex loads project-local `.codex/` hooks only when the project layer is trusted, and new hooks need review via `/hooks` inside the Codex CLI.

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --force` | Replace prior memofs hook entries / overwrite the opencode plugin | `false` |
| `--list` | List supported targets and their capabilities | `false` |

## `memofs generate mcp`

Writes (or merges) the platform MCP server config that registers `@memofs/mcp-server`. Granular companion to `generate agent` for users who only want the MCP config.

```bash
memofs generate mcp claude                # project .mcp.json
memofs generate mcp claude --scope global # ~/.claude.json
memofs generate mcp codex                 # ~/.codex/config.toml (Codex default)
memofs generate mcp --list
```

**Scopes:**

- `local` — project-relative config (committable, portable). The server runs with the project root as cwd, so no `--root` arg is written.
- `global` — user-home config (per-machine). The entry includes an absolute `--root` pointing at the current project.

| Target | Local | Global | Default scope |
|--------|-------|--------|---------------|
| `agents` / `codex` | `.codex/config.toml` | `~/.codex/config.toml` | `global` |
| `claude` | `.mcp.json` | `~/.claude.json` | `local` |
| `gemini` | `.gemini/settings.json` | `~/.gemini/settings.json` | `local` |
| `copilot` | `.vscode/mcp.json` | — | `local` |
| `cursor` | `.cursor/mcp.json` | `~/.cursor/mcp.json` | `local` |
| `opencode` | `opencode.json` | `~/.config/opencode/opencode.json` | `local` |

Writing is **additive and safe**: existing config files are merged — other servers and keys are preserved, and a prior `memofs` entry is left untouched unless `--force` is passed. No secrets are written; cloud credentials are supplied via environment variables at runtime.

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--scope <scope>` | MCP config scope: `local` or `global` | Platform default |
| `-f, --force` | Overwrite an existing memofs MCP entry | `false` |
| `--list` | List supported targets, formats, and scope paths | `false` |
