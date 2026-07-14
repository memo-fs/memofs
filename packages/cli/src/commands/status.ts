/**
 * CLI command handler for `memofs status` — compliance observability.
 *
 * Reads `memory-events.jsonl` and renders a human-readable summary showing
 * what the agent did with memory during the most recent session. The summary
 * shows store health (core/notes presence) and three compliance checks:
 *
 * 1. **Context loaded at session start** — a `memory.indexed` event with
 *    `metadata.hook: "session-start"` exists.
 * 2. **Memory consulted during session** — any non-sync memory event after
 *    the session-start event (context reloads, remembers, consolidates).
 * 3. **Facts persisted** — any `memory.created` event after the
 *    session-start event.
 *
 * Each check shows ✓ or ✗. When no session-start event is found, the
 * command degrades gracefully (shows all events without a compliance section).
 *
 * @module status
 */

import type { MemoFS, MemoryEvent } from "@memofs/core";
import { readMemoryEvents } from "@memofs/core";
import { getRootDir, readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { MEMOFS_CLI_PATHS } from "../protocol/constants";

/**
 * Options configuration for the status command.
 */
export interface StatusCommandOptions {
	/**
	 * The MemoFS client instance.
	 */
	memo: MemoFS;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * If true, emits Stop-hook JSON: `{"systemMessage": "<summary>"}`.
	 *
	 * Claude Code and Codex Stop hooks display `systemMessage` to the
	 * developer; Codex additionally REQUIRES JSON on Stop-hook exit 0 (plain
	 * text is invalid for that event). Takes precedence over `json`.
	 */
	hook?: boolean | undefined;
}

/**
 * The compliance check result.
 */
export interface ComplianceCheck {
	/**
	 * Human-readable label for the check.
	 */
	label: string;
	/**
	 * Whether the check passed.
	 */
	passed: boolean;
}

/**
 * The structured status result.
 */
export interface StatusResult {
	/**
	 * Whether a session-start event was found.
	 */
	hasSession: boolean;
	/**
	 * Total event count.
	 */
	eventCount: number;
	/**
	 * Whether core memory exists.
	 */
	hasCore: boolean;
	/**
	 * Whether notes memory exists.
	 */
	hasNotes: boolean;
	/**
	 * Compliance checks (absent when no session-start event is found).
	 */
	compliance?: ComplianceCheck[];
	/**
	 * The session-start timestamp (absent when no session-start event is found).
	 */
	sessionStart?: string;
}

/**
 * Checks whether a memory event is a session-start marker.
 *
 * A session-start event is a `memory.indexed` event with
 * `metadata.hook: "session-start"`.
 *
 * @param event - The memory event to check.
 * @returns True if the event is a session-start marker.
 */
function isSessionStartEvent(event: MemoryEvent): boolean {
	if (event.type !== "memory.indexed") return false;
	const metadata = event.metadata as Record<string, unknown> | undefined;
	return metadata?.hook === "session-start";
}

/**
 * Computes the compliance checks from the events following the most recent
 * session-start event.
 *
 * @param events - All memory events, ordered oldest-first.
 * @param sessionStartIndex - The array index of the session-start event.
 * @returns The three compliance checks.
 */
function computeCompliance(
	events: MemoryEvent[],
	sessionStartIndex: number,
): ComplianceCheck[] {
	const afterSession = events.slice(sessionStartIndex + 1);
	const memoryConsulted = afterSession.some((e) => !e.type.startsWith("sync."));
	const factsPersisted = afterSession.some((e) => e.type === "memory.created");
	return [
		{ label: "Context loaded at session start", passed: true },
		{ label: "Memory consulted during session", passed: memoryConsulted },
		{ label: "Facts persisted", passed: factsPersisted },
	];
}

/**
 * Runs the `status` command, reading memory events and rendering a compliance
 * summary.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runStatusCommand(
	options: StatusCommandOptions,
): Promise<number> {
	const rootDir = getRootDir(options.memo.store);
	let events: MemoryEvent[] = [];
	try {
		events = await readMemoryEvents(options.memo.store);
	} catch {
		events = [];
	}

	const core = await readTextIfExists(
		options.memo.store,
		MEMOFS_CLI_PATHS.coreMemory,
	);
	const notes = await readTextIfExists(
		options.memo.store,
		MEMOFS_CLI_PATHS.notesMemory,
	);
	const hasCore = core !== undefined && core.trim().length > 0;
	const hasNotes = notes !== undefined && notes.trim().length > 0;

	const sessionStartIndex = [...events]
		.reverse()
		.findIndex(isSessionStartEvent);
	const hasSession = sessionStartIndex !== -1;
	const realIndex = hasSession ? events.length - 1 - sessionStartIndex : -1;

	const compliance = hasSession
		? computeCompliance(events, realIndex)
		: undefined;
	const sessionStart = hasSession ? events[realIndex]?.timestamp : undefined;

	const result: StatusResult = {
		hasSession,
		eventCount: events.length,
		hasCore,
		hasNotes,
		...(compliance !== undefined ? { compliance } : {}),
		...(sessionStart !== undefined ? { sessionStart } : {}),
	};

	if (options.json && !options.hook) {
		printJsonEnvelope(options.output, "status", result);
		return 0;
	}

	if (options.hook) {
		// Stop-hook output: Claude Code / Codex display `systemMessage`;
		// Codex requires JSON on Stop-hook exit 0.
		const summary =
			hasSession && compliance
				? compliance
						.map((c) => `${c.passed ? "✓" : "✗"} ${c.label}`)
						.join(" | ")
				: "no session-start event recorded this session.";
		options.output.write(
			JSON.stringify({ systemMessage: `MemoFS compliance — ${summary}` }),
		);
		return 0;
	}

	const lines: string[] = [
		"# MemoFS Status",
		`Root: ${rootDir}`,
		"",
		"## Store Health",
		`- Core memory: ${hasCore ? "present" : "missing"}`,
		`- Notes memory: ${hasNotes ? "present" : "missing"}`,
		`- Total events: ${events.length}`,
	];

	if (hasSession && compliance) {
		lines.push("");
		lines.push(`## Compliance (session started at ${sessionStart})`);
		for (const check of compliance) {
			lines.push(`- ${check.passed ? "✓" : "✗"} ${check.label}`);
		}
	} else {
		lines.push("");
		lines.push("## Compliance");
		lines.push(
			"- No session-start event found. Run `memofs generate agent <target>` to install hooks.",
		);
	}

	options.output.write(lines.join("\n"));
	return 0;
}
