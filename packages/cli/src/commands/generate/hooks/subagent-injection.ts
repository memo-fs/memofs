/**
 * Subagent injection hook — injects MemoFS context when a subagent starts.
 *
 * Closes the subagent bypass: without this hook, subagents (Claude Code
 * subagents, Codex subagents) start without MemoFS context. This hook
 * runs the same context injection as the session-start hook, ensuring
 * every subagent loads context before work.
 *
 * @module subagent-injection
 */

import type { HookModule } from "../emitters/types";

export const subagentInjectionModule: HookModule = {
	name: "subagent-injection",
	event: "subagentStart",
	requires: ["subagentStart", "contextInjection"],
};
