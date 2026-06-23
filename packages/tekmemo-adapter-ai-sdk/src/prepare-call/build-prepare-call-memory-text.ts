/**
 * Builds the memory text for AI SDK prepareCall context.
 *
 * @remarks
 * Aggregates core memory, notes, and recall hits from stores.
 *
 * @internal
 */

import { buildCoreMemoryText, NOTES_MEMORY_PATH } from "@tekbreed/tekmemo";
import type { BuildPrepareCallMemoryTextInput } from "../types/ai-sdk-memory";
import { safeReadMemoryPath } from "./safe-read-memory-path";

/**
 * Builds the memory text for AI SDK prepareCall context.
 *
 * @param input - The input containing stores and retrieval plan.
 * @returns The aggregated memory text for the AI context.
 */
export async function buildPrepareCallMemoryText(
	input: BuildPrepareCallMemoryTextInput,
): Promise<string> {
	const parts: string[] = [];

	const baseInstructions = input.baseInstructions.trim();
	if (baseInstructions) {
		parts.push(baseInstructions);
	}

	const workspaceCore = await buildCoreMemoryText(input.stores.workspace);
	if (workspaceCore) {
		parts.push("## Workspace Memory");
		parts.push(workspaceCore);
	}

	if (input.retrievalPlan.readUserMemory && input.stores.user) {
		const userCore = await buildCoreMemoryText(input.stores.user);
		if (userCore) {
			parts.push("## User Memory");
			parts.push(userCore);
		}
	}

	if (input.retrievalPlan.readArchivalMemory) {
		const notes = await safeReadMemoryPath(
			input.stores.workspace,
			NOTES_MEMORY_PATH,
		);
		if (notes) {
			parts.push("## Archival Notes");
			parts.push(notes);
		}
	}

	const workspaceHits = input.recallHits?.workspace ?? [];
	if (workspaceHits.length > 0) {
		parts.push("## Workspace Recall");
		parts.push(workspaceHits.map((hit) => `- ${hit.text}`).join("\n"));
	}

	const userHits = input.recallHits?.user ?? [];
	if (userHits.length > 0) {
		parts.push("## User Recall");
		parts.push(userHits.map((hit) => `- ${hit.text}`).join("\n"));
	}

	return parts.join("\n\n").trim();
}
