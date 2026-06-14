import type {
	MemoryContextInput,
	MemoryContextResult,
	RecallItem,
	TekMemoMcpRuntime,
} from "../types";

export function truncateUtf8(text: string, maxBytes: number): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return `${text.slice(0, low).trimEnd()}\n\n[Output truncated to ${maxBytes} bytes]`;
}

export async function buildRuntimeContext(
	runtime: TekMemoMcpRuntime,
	input: MemoryContextInput,
	signal?: AbortSignal,
): Promise<MemoryContextResult> {
	const maxBytes = input.maxBytes ?? 64_000;
	const sections: MemoryContextResult["sections"] = [];
	const warnings: string[] = [];
	let recallItems: RecallItem[] = [];

	if (input.includeCore !== false && runtime.readCoreMemory) {
		try {
			const core = await runtime.readCoreMemory(input, signal);
			if (core.content.trim()) {
				sections.push({
					type: "core",
					title: "Core Memory",
					content: core.content.trim(),
				});
			}
			if (core.warnings?.length) warnings.push(...core.warnings);
		} catch (error) {
			warnings.push(
				`Could not read core memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	if (input.includeRecent !== false && runtime.listRecentMemories) {
		try {
			const recent = await runtime.listRecentMemories(
				{ ...input, limit: Math.min(input.limit ?? 5, 20) },
				signal,
			);
			if (recent.items.length > 0) {
				const content = recent.items
					.map(
						(item) =>
							`- ${item.timestamp ?? "unknown"} ${item.type ?? "memory"}: ${item.summary ?? item.id}`,
					)
					.join("\n");
				sections.push({
					type: "recent",
					title: "Recent Memory Events",
					content,
				});
			}
			if (recent.warnings?.length) warnings.push(...recent.warnings);
		} catch (error) {
			warnings.push(
				`Could not read recent memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	try {
		const recall = await runtime.recall(input, signal);
		recallItems = recall.items;
		if (recall.items.length > 0) {
			const content = recall.items
				.map(
					(item, index) =>
						`${index + 1}. ${item.text}${item.score === undefined ? "" : `\n   score: ${item.score}`}`,
				)
				.join("\n\n");
			sections.push({ type: "recall", title: "Relevant Recall", content });
		}
		if (recall.warnings?.length) warnings.push(...recall.warnings);
	} catch (error) {
		warnings.push(
			`Recall failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (input.includeNotes === true && runtime.readNotesMemory) {
		try {
			const notes = await runtime.readNotesMemory(input, signal);
			if (notes.content.trim()) {
				sections.push({
					type: "notes",
					title: "Notes Memory",
					content: notes.content.trim(),
				});
			}
			if (notes.warnings?.length) warnings.push(...notes.warnings);
		} catch (error) {
			warnings.push(
				`Could not read notes memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	const text = truncateUtf8(
		sections
			.map((section) => `## ${section.title}\n\n${section.content}`)
			.join("\n\n"),
		maxBytes,
	);

	return {
		text,
		sections,
		items: recallItems,
		...(warnings.length === 0 ? {} : { warnings }),
	};
}
