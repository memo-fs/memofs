/**
 * Context injection hook — injects MemoFS context at session start.
 *
 * Runs `memofs context` (the full intelligence pipeline: strategist +
 * recall + entity graph) at session start. On platforms with
 * `contextInjection` (Claude Code, Codex) its stdout is injected into the
 * agent's context before it begins work. On platforms without it
 * (opencode), the hook still runs for its side effects: the conditional
 * cloud pull and the `--mark-session-start` compliance marker.
 *
 * @module context-injection
 */

import type { HookModule } from "../emitters/types";

export const contextInjectionModule: HookModule = {
	name: "context-injection",
	event: "sessionStart",
	requires: ["sessionStart"],
};
