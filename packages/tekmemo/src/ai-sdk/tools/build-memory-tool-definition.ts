/**
 * Builds the AI SDK tool definition for the memory tool.
 *
 * @remarks
 * Creates a tool definition with description, input schema, and execute function.
 * The tool allows AI models to read, create, update, and search memory.
 *
 * @internal
 */

import { memoryToolInputSchema } from "../schemas/memory-tool-schema";
import type { MemoryToolExecutionContext } from "../types/ai-sdk-memory";
import { runStructuredMemoryTool } from "./run-structured-memory-tool";

/**
 * Builds the AI SDK tool definition for the memory tool.
 *
 * @param context - The execution context containing the memory store.
 * @returns The tool definition object with description, schema, and execute function.
 */
/**
 * Builds the AI SDK tool definition for the memory tool.
 *
 * @param context - The execution context containing the memory store.
 * @returns The tool definition object with description, schema, and execute function.
 */
export function buildMemoryToolDefinition(context: MemoryToolExecutionContext) {
	return {
		description:
			"Read, create, update, or search memory files under .tekmemo. Use core.md for compact persistent memory, notes.md for archival notes, and conversations.jsonl for recall history.",
		inputSchema: memoryToolInputSchema,
		execute: async (input: unknown) => {
			const parsed = memoryToolInputSchema.parse(input);
			return runStructuredMemoryTool(context, parsed);
		},
	};
}
