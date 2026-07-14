/**
 * Codex hook emitter.
 *
 * Translates platform-agnostic hook modules into Codex's hooks format in
 * `.codex/hooks.json` (event → matcher groups → handlers; the same shape as
 * Claude Code — see `hooks-json.ts`, verified against
 * developers.openai.com/codex/hooks, July 2026). Codex injects
 * SessionStart/SubagentStart stdout as developer context, re-fires
 * SessionStart with source `compact` after compaction, and REQUIRES JSON
 * output on Stop-hook exit 0 (`memofs status --hook` emits
 * `{"systemMessage": ...}`).
 *
 * Note: project-local `.codex/` hooks only load when the user has trusted
 * the project's `.codex/` layer, and new hooks need review via `/hooks` in
 * the Codex CLI — the generate command prints this caveat.
 *
 * The emitted file is marked `merge: "hooks-json"` so user-defined hook
 * groups in an existing `.codex/hooks.json` are preserved.
 *
 * @module codex
 */

import { buildHooksJson } from "./hooks-json";
import type { HookCapabilities, HookEmitContext, HookEmitter } from "./types";
import { DEFAULT_HOOK_COMMANDS } from "./types";

const CODEX_CAPABILITIES: HookCapabilities = {
	sessionStart: true,
	subagentStart: true,
	preCompact: true,
	stop: true,
	contextInjection: true,
	stopOutputMethod: "systemMessage",
};

export const codexEmitter: HookEmitter = {
	target: "codex",
	capabilities: CODEX_CAPABILITIES,
	emitHooks(modules, contextOverride) {
		const context: HookEmitContext = {
			target: "codex",
			capabilities: CODEX_CAPABILITIES,
			...DEFAULT_HOOK_COMMANDS,
			...contextOverride,
		};
		const hooks = buildHooksJson(modules, context);
		const content = `${JSON.stringify({ hooks }, null, 2)}\n`;
		return [{ path: ".codex/hooks.json", content, merge: "hooks-json" }];
	},
};
