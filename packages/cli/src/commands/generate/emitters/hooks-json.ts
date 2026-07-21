/**
 * Shared builder for the Claude Code / Codex hooks JSON format.
 *
 * Both platforms use the same three-level shape (verified against the
 * official docs, July 2026 — code.claude.com/docs/en/hooks and
 * developers.openai.com/codex/hooks):
 *
 * ```json
 * {
 *   "hooks": {
 *     "SessionStart": [
 *       { "matcher": "startup|resume|clear",
 *         "hooks": [{ "type": "command", "command": "..." }] }
 *     ]
 *   }
 * }
 * ```
 *
 * Event mapping notes:
 * - `sessionStart` → `SessionStart` with matcher `startup|resume|clear`
 *   (stdout is injected as context on both platforms).
 * - `preCompact` → `SessionStart` with matcher `compact`, NOT `PreCompact`:
 *   both platforms ignore plain stdout on `PreCompact`, but re-run
 *   `SessionStart` with source `compact` after compaction and inject its
 *   stdout — that is the correct survival point.
 * - `subagentStart` → `SubagentStart` (stdout injected into the subagent).
 * - `stop` → `Stop`. Codex requires JSON on Stop-hook exit 0 and Claude
 *   accepts it, so the status command must emit hook JSON
 *   (`memofs status --hook` → `{"systemMessage": ...}`).
 *
 * @module hooks-json
 */

import type { HookEmitContext, HookEvent, HookModule } from "./types";

/**
 * One matcher group in the platform hooks file.
 */
export interface HooksJsonGroup {
	matcher?: string;
	hooks: Array<{ type: "command"; command: string; timeout?: number }>;
}

/**
 * The `hooks` object keyed by platform event name.
 */
export type HooksJsonMap = Record<string, HooksJsonGroup[]>;

/**
 * Maps a platform-agnostic hook module to its platform event name, matcher,
 * and command. Shared verbatim by the Claude Code and Codex emitters.
 *
 * @param event - The platform-agnostic hook event.
 * @param context - Emission context carrying the CLI command strings.
 * @returns The event key, optional matcher, and command — or undefined for
 * unmapped events.
 */
function mapModule(
	event: HookEvent,
	context: HookEmitContext,
): { eventKey: string; matcher?: string; command: string } | undefined {
	switch (event) {
		case "sessionStart":
			return {
				eventKey: "SessionStart",
				matcher: "startup|resume|clear",
				command: context.contextCommand,
			};
		case "preCompact":
			// SessionStart(compact) — see module doc for why not PreCompact.
			return {
				eventKey: "SessionStart",
				matcher: "compact",
				command: context.reinjectCommand,
			};
		case "subagentStart":
			return {
				eventKey: "SubagentStart",
				command: context.reinjectCommand,
			};
		case "stop":
			return {
				eventKey: "Stop",
				command: context.statusCommand,
			};
		default:
			return undefined;
	}
}

/**
 * Builds the `hooks` map for a set of modules, applying capability gating.
 *
 * @param modules - The hook modules to translate.
 * @param context - Emission context (capabilities + command strings).
 * @returns The event-keyed matcher-group map.
 */
export function buildHooksJson(
	modules: readonly HookModule[],
	context: HookEmitContext,
): HooksJsonMap {
	const hooks: HooksJsonMap = {};
	for (const module of modules) {
		const supported = module.requires.every((req) => context.capabilities[req]);
		if (!supported) continue;
		const mapped = mapModule(module.event, context);
		if (!mapped) continue;
		const group: HooksJsonGroup = {
			...(mapped.matcher !== undefined ? { matcher: mapped.matcher } : {}),
			hooks: [{ type: "command", command: mapped.command }],
		};
		const groups = hooks[mapped.eventKey] ?? [];
		groups.push(group);
		hooks[mapped.eventKey] = groups;
	}
	return hooks;
}

/**
 * Predicate marking a matcher group as memofs-owned, used by the merge to
 * replace prior memofs groups while preserving user-defined ones.
 *
 * @param group - A matcher group from an existing hooks file.
 * @returns True when every command in the group invokes the memofs CLI.
 */
export function isMemofsGroup(group: unknown): boolean {
	if (typeof group !== "object" || group === null) return false;
	const hooks = (group as { hooks?: unknown }).hooks;
	if (!Array.isArray(hooks) || hooks.length === 0) return false;
	return hooks.every((h) => {
		const command = (h as { command?: unknown }).command;
		return typeof command === "string" && /\bmemofs\b/.test(command);
	});
}

/**
 * Merges freshly built memofs hook groups into an existing platform settings
 * JSON, preserving every other top-level key (permissions, env, model, …)
 * and every non-memofs hook group. Prior memofs-owned groups are replaced so
 * re-running `generate` upgrades stale commands instead of duplicating them.
 *
 * @param existingContent - Existing file content, or undefined when absent.
 * @param fresh - The freshly built memofs hooks map.
 * @returns The merged file content (pretty-printed, trailing newline) and
 * whether any memofs-owned groups were already present.
 * @throws {SyntaxError} When existing content is not valid JSON — callers
 * surface this as a validation error rather than clobbering the file.
 */
export function mergeHooksJson(
	existingContent: string | undefined,
	fresh: HooksJsonMap,
): { content: string; entryExisted: boolean } {
	let root: Record<string, unknown> = {};
	if (existingContent && existingContent.trim().length > 0) {
		root = JSON.parse(existingContent) as Record<string, unknown>;
	}
	const existingHooks =
		(root.hooks as Record<string, unknown[]> | undefined) ?? {};

	let entryExisted = false;
	const mergedHooks: Record<string, unknown[]> = {};

	// Preserve non-memofs groups for every event already present.
	for (const [eventKey, groups] of Object.entries(existingHooks)) {
		const kept = Array.isArray(groups)
			? groups.filter((g) => {
					const ours = isMemofsGroup(g);
					if (ours) entryExisted = true;
					return !ours;
				})
			: groups;
		mergedHooks[eventKey] = kept as unknown[];
	}

	// Append our fresh groups.
	for (const [eventKey, groups] of Object.entries(fresh)) {
		mergedHooks[eventKey] = [...(mergedHooks[eventKey] ?? []), ...groups];
	}

	// Drop events left empty after filtering.
	for (const [eventKey, groups] of Object.entries(mergedHooks)) {
		if (Array.isArray(groups) && groups.length === 0)
			delete mergedHooks[eventKey];
	}

	root.hooks = mergedHooks;
	return { content: `${JSON.stringify(root, null, 2)}\n`, entryExisted };
}
