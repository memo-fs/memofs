/**
 * Compaction survival hook — re-injects MemoFS context after compaction.
 *
 * When an agent's context window is compacted, the injected MemoFS context
 * is lost. Claude Code and Codex re-fire `SessionStart` with source
 * `compact` after compaction and inject its stdout — the emitters map this
 * module onto that matcher group so the agent retains memory awareness.
 *
 * @module compaction-survival
 */

import type { HookModule } from "../emitters/types";

export const compactionSurvivalModule: HookModule = {
	name: "compaction-survival",
	event: "preCompact",
	requires: ["preCompact", "contextInjection"],
};
