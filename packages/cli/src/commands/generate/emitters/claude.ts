/**
 * Claude Code hook emitter.
 *
 * Translates platform-agnostic hook modules into Claude Code's settings
 * format in `.claude/settings.json` (event → matcher groups → handlers; see
 * `hooks-json.ts`). Claude Code injects SessionStart/SubagentStart stdout as
 * model-visible context, re-fires SessionStart with source `compact` after
 * compaction (our survival point), and shows `systemMessage` from Stop-hook
 * JSON output.
 *
 * The emitted file is marked `merge: "hooks-json"` — `.claude/settings.json`
 * is a shared file (permissions, env, user hooks), so writes merge rather
 * than replace.
 *
 * @module claude
 */

import { buildHooksJson } from "./hooks-json";
import type { HookCapabilities, HookEmitContext, HookEmitter } from "./types";
import { DEFAULT_HOOK_COMMANDS } from "./types";

const CLAUDE_CAPABILITIES: HookCapabilities = {
	sessionStart: true,
	subagentStart: true,
	preCompact: true,
	stop: true,
	contextInjection: true,
	stopOutputMethod: "systemMessage",
};

export const claudeEmitter: HookEmitter = {
	target: "claude",
	capabilities: CLAUDE_CAPABILITIES,
	emitHooks(modules, contextOverride) {
		const context: HookEmitContext = {
			target: "claude",
			capabilities: CLAUDE_CAPABILITIES,
			...DEFAULT_HOOK_COMMANDS,
			...contextOverride,
		};
		const hooks = buildHooksJson(modules, context);
		const content = `${JSON.stringify({ hooks }, null, 2)}\n`;
		return [{ path: ".claude/settings.json", content, merge: "hooks-json" }];
	},
};
