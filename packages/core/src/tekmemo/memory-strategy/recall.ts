import type { StoredNote } from "./types";
import type {
	RecallInput,
	RecallResult,
	RecallItem,
	JsonObject,
} from "../types";

export function memoryRecall(
	notes: Map<string, StoredNote>,
	input: RecallInput,
): RecallResult {
	const query = input.query.toLowerCase();
	const limit = input.limit ?? 10;
	const items: RecallItem[] = [];
	for (const note of notes.values()) {
		if (
			input.workspaceId !== undefined &&
			note.workspaceId !== input.workspaceId
		)
			continue;
		if (input.projectId !== undefined && note.projectId !== input.projectId)
			continue;
		const haystack =
			`${note.title ?? ""}\n${note.content}\n${note.tags?.join(" ") ?? ""}`.toLowerCase();
		if (haystack.includes(query)) {
			items.push({
				id: note.id,
				text: note.content,
				score: 1,
				metadata: {
					title: note.title ?? null,
					createdAt: note.createdAt,
				} as JsonObject,
			});
		}
	}
	return { items: items.slice(0, limit) };
}
