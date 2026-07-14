/**
 * Status display hook — shows MemoFS compliance status when the session ends.
 *
 * Runs `memofs status --hook` and displays the compliance summary as the
 * last thing the developer sees after the agent's session summary. This
 * closes the observability loop at the natural review moment.
 *
 * The hook is non-blocking (exits 0, does NOT trigger a retry). On Claude
 * Code and Codex the status is delivered via Stop-hook JSON output
 * (`{"systemMessage": ...}` — Codex requires JSON on Stop exit 0). On
 * opencode it is shown as a TUI toast on `session.idle`.
 *
 * @module status-display
 */

import type { HookModule } from "../emitters/types";

export const statusDisplayModule: HookModule = {
	name: "status-display",
	event: "stop",
	requires: ["stop"],
};
