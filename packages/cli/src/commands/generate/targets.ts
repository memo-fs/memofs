/**
 * Canonical agent-rules target list — the single source of truth for which
 * agent platforms are supported by the `generate` command family.
 *
 * Both `agent-rules.ts` (rules metadata) and `mcp-config.ts` (MCP server
 * config metadata) key their per-platform tables by {@link AgentRulesTarget},
 * so adding a platform is a single edit here followed by the two table
 * entries. This module has no dependencies on either, avoiding an import
 * cycle.
 *
 * @module targets
 */

/**
 * Canonical targets a user can generate.
 *
 * `"agents"` is kept as a backward-compatible alias for `"codex"` — both
 * produce AGENTS.md with the Codex MCP config pointer.
 */
export const AGENT_RULES_TARGETS = [
	"agents",
	"codex",
	"claude",
	"gemini",
	"copilot",
	"cursor",
	"opencode",
] as const;

/**
 * The supported agent-rules target id.
 */
export type AgentRulesTarget = (typeof AGENT_RULES_TARGETS)[number];

/**
 * Parses a target alias (case-insensitive). Accepts the canonical id and the
 * common filename aliases (e.g. "agents" | "agents.md" | "AGENTS.md").
 *
 * @param input - Raw user input.
 * @returns The normalized target, or undefined if unrecognized.
 */
export function parseAgentRulesTarget(
	input: string,
): AgentRulesTarget | undefined {
	const norm = input
		.trim()
		.toLowerCase()
		.replace(/\.md(c?)$/, "$1");
	for (const target of AGENT_RULES_TARGETS) {
		if (target === norm) return target;
	}
	return undefined;
}
