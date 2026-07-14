/**
 * Raw markdown template imports for the `generate` command family.
 *
 * Templates are the single source of truth for generated agent-rules files.
 * The `.md` files live in `./templates/` and are inlined as strings at build
 * time via the `?raw` import suffix (supported by tsdown/rolldown).
 *
 * A single unified template (`agent-rules.md`) covers both the hooks-installed
 * and no-hooks cases. The `{{hooksNote}}` and `{{stepOneText}}` placeholders
 * are precomputed by the emitter based on the `hooksInstalled` flag, so steps
 * 2–4 (recall, adhere, remember) can never silently disappear for a platform
 * just because it happens to have hooks.
 *
 * Placeholders in the template:
 * - `{{projectName}}` — project name (replaces the title)
 * - `{{hooksNote}}` — lead-in note for the hooks-installed case (or empty)
 * - `{{stepOneText}}` — step-1 bullet text (varies by hooksInstalled)
 * - `{{rulesDir}}` — platform-local rules directory (e.g. `.agents/rules`)
 * - `{{mcpLabel}}` — MCP config label (e.g. "MemoFS MCP server config (project MCP config)")
 * - `{{mcpPath}}` — MCP config path (e.g. `.mcp.json`, `~/.codex/config.toml`)
 * - `{{rules}}` — optional behavioral rules section; replaced with empty
 *   string or a `## Behavioral Rules` block
 *
 * @module templates
 */

import agentRulesTemplate from "./templates/agent-rules.md?raw";

/**
 * The unified agent-rules template.
 *
 * Used by both `generate agent-rules` (no hooks) and `generate agent`
 * (hooks installed). The emitter precomputes `{{hooksNote}}` and
 * `{{stepOneText}}` from the `hooksInstalled` flag.
 */
export const AGENT_RULES_TEMPLATE = agentRulesTemplate;
