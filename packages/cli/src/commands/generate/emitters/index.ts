/**
 * Registry of all available hook emitters.
 *
 * Each emitter implements the {@link HookEmitter} interface for a specific
 * agent platform. Adding platform N+1 is O(1) — add one entry here.
 *
 * Cursor is intentionally absent: its `hooks.json` events (beforeSubmitPrompt,
 * beforeShellExecution, stop, …) are observational — they cannot inject
 * context and there is no session-start event — so `generate agent cursor`
 * emits rules + MCP config only.
 *
 * @module emitters/index
 */

import { parseAgentRulesTarget } from "../targets";
import { claudeEmitter } from "./claude";
import { codexEmitter } from "./codex";
import { opencodeEmitter } from "./opencode";
import type { HookEmitter } from "./types";

export { claudeEmitter } from "./claude";
export { codexEmitter } from "./codex";
export {
	buildHooksJson,
	isMemofsGroup,
	mergeHooksJson,
} from "./hooks-json";
export { opencodeEmitter } from "./opencode";
export type {
	EmittedHookFile,
	HookCapabilities,
	HookEmitContext,
	HookEmitter,
	HookEvent,
	HookModule,
} from "./types";
export { DEFAULT_HOOK_COMMANDS } from "./types";

const EMITTERS: Record<string, HookEmitter> = {
	claude: claudeEmitter,
	codex: codexEmitter,
	// "agents" is the backward-compatible alias for "codex" (same platform,
	// same AGENTS.md target) — both must resolve to the same emitter.
	agents: codexEmitter,
	opencode: opencodeEmitter,
};

/**
 * Canonical hook targets for `--list` (aliases excluded).
 */
export const HOOK_EMITTER_TARGETS = ["claude", "codex", "opencode"] as const;

/**
 * Resolves the hook emitter for a target, accepting the same aliases as the
 * rules/MCP commands (e.g. "agents" → codex, "AGENTS.md" → codex).
 *
 * @param target - Raw target input.
 * @returns The emitter, or undefined for platforms without hook support.
 */
export function getEmitter(target: string): HookEmitter | undefined {
	const canonical = parseAgentRulesTarget(target) ?? target;
	return EMITTERS[canonical];
}
