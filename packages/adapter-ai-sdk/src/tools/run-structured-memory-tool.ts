/**
 * Runs a structured memory tool command.
 *
 * @remarks
 * Maps validated tool input to a {@link MemoryCommand} and executes it.
 *
 * @internal
 */

import type { MemoryCommand } from "@tekmemo/core";
import { runMemoryCommand } from "@tekmemo/core";
import type { MemoryToolInput } from "../schemas/memory-tool-schema";
import type { MemoryToolExecutionContext } from "../types/ai-sdk-memory";

/**
 * Runs a structured memory tool command.
 *
 * @param context - The execution context containing the memory store.
 * @param input - The validated tool input.
 * @returns The result of executing the memory command.
 */
/**
 * Runs a structured memory tool command.
 *
 * @param context - The execution context containing the memory store.
 * @param input - The validated tool input.
 * @returns The result of executing the memory command.
 */
export async function runStructuredMemoryTool(
	context: MemoryToolExecutionContext,
	input: MemoryToolInput,
): Promise<string> {
	const command: MemoryCommand = mapInputToMemoryCommand(input);
	return runMemoryCommand(context.store, command);
}

/**
 * Maps a MemoryToolInput to a MemoryCommand for execution.
 *
 * @param input - The tool input to map.
 * @returns The corresponding MemoryCommand.
 */
/**
 * Maps a MemoryToolInput to a MemoryCommand for execution.
 *
 * @param input - The tool input to map.
 * @returns The corresponding {@link MemoryCommand}.
 */
function mapInputToMemoryCommand(input: MemoryToolInput): MemoryCommand {
	switch (input.command) {
		case "view":
			return {
				command: "view",
				path: input.path,
			};

		case "create":
			return {
				command: "create",
				path: input.path,
				content: input.content,
				ifExists: input.ifExists,
			};

		case "update":
			return {
				command: "update",
				path: input.path,
				content: input.content,
				mode: input.mode,
			};

		case "search":
			return {
				command: "search",
				path: input.path,
				query: input.query,
				limit: input.limit,
			};
	}
}
