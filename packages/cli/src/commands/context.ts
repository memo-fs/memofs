/**
 * CLI command handler for retrieving localized workspace memory context.
 *
 * Calls `memo.context()` — the full intelligence pipeline (strategist +
 * hybrid recall + entity graph) — and renders the result. This is the same
 * method the MCP server uses, ensuring hook-injected context matches
 * MCP-delivered context.
 *
 * @module context
 */

import {
	appendMemoryEvent,
	createMemoryEvent,
	type MemoFS,
	type TaskType,
} from "@memofs/core";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { parsePositiveInteger } from "../utils/numbers";

/**
 * Options configuration for the context command.
 */
export interface ContextCommandOptions {
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
	 * Optional text query to prioritize matching memory files.
	 */
	query?: string | undefined;
	/**
	 * The kind of task the agent is performing. Used by the strategist to
	 * tailor the recall query. Passed through to `memo.context()`.
	 */
	taskType?: TaskType | undefined;
	/**
	 * Maximum characters allowed in the formatted context output. Maps to
	 * the `maxBytes` parameter of `memo.context()`.
	 */
	maxChars?: number | string | undefined;
	/**
	 * If true, writes a `memory.indexed` event with `metadata.hook:
	 * "session-start"` after returning context. Used by SessionStart hook
	 * scripts to mark the session boundary for `memofs status` compliance
	 * checks.
	 */
	markSessionStart?: boolean | undefined;
}

/**
 * Runs the context command, calling `memo.context()` to build the full
 * intelligence-pipeline context and rendering the result.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runContextCommand(
	options: ContextCommandOptions,
): Promise<number> {
	const maxChars =
		typeof options.maxChars === "number"
			? options.maxChars
			: options.maxChars
				? parsePositiveInteger(options.maxChars, "max chars")
				: 12000;

	const result = await options.memo.context({
		query: options.query ?? "",
		taskType: options.taskType,
		detail: "full",
		maxBytes: maxChars,
	});

	if (options.markSessionStart) {
		const event = createMemoryEvent({
			type: "memory.indexed",
			summary: "Session start — context injected by hook",
			actor: { type: "system" },
			metadata: { hook: "session-start" },
		});
		await appendMemoryEvent(options.memo.store, event);
	}

	if (options.json) {
		printJsonEnvelope(options.output, "context", result);
		return 0;
	}

	options.output.write(result.text);
	return 0;
}
