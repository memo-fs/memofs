/**
 * Bridge runtime: exposes a {@link MemoFS} client as a
 * {@link MemoFSMemoryRuntime}.
 *
 * @remarks
 * This is the recommended way to build an AI SDK runtime. Every recall goes
 * through {@link MemoFS.recall} (the single, intelligent hybrid engine:
 * BM25 + fuzzy + embeddings + recency boost + optional reranker), instead of
 * a parallel naive text-search implementation. Local, cloud, and hybrid
 * `MemoFS` modes are all supported — the runtime is a thin adapter, so the
 * underlying strategy (and therefore the recall quality) never changes.
 *
 * @public
 */

import type {
	JsonObject,
	MemoryRuntimeCoreMemoryDocument,
	MemoryRuntimeCreateNoteInput,
	MemoryRuntimeListNotesInput,
	MemoryRuntimeNote,
	MemoryRuntimePage,
	MemoryRuntimeRecallHit,
	MemoryRuntimeRecallInput,
	MemoryRuntimeRecallResult,
	RecallFilter,
	RecallItem,
	RecentMemoryResult,
	MemoFSMemoryRuntime,
	MemoFS,
} from "@memofs/core";

/**
 * Build an AI SDK runtime backed by a {@link MemoFS} client.
 *
 * @example
 * ```ts
 * import { MemoFS } from "@memofs/core";
 * import { createAiSdkRuntimeFromMemoFS } from "@memofs/adapter-ai-sdk";
 *
 * const memo = new MemoFS({ rootDir: "./.memofs", projectId: "demo" });
 * const runtime = createAiSdkRuntimeFromMemoFS(memo);
 * ```
 */
export function createAiSdkRuntimeFromMemoFS(
	memo: MemoFS,
): MemoFSMemoryRuntime {
	return {
		async readCoreMemory(signal) {
			const content = await memo.core.read(signal);
			return toCoreMemoryDocument(content);
		},

		async updateCoreMemory(input, signal) {
			await memo.core.update(input.content, signal);
			const content = await memo.core.read(signal);
			return toCoreMemoryDocument(content);
		},

		async listNotes(
			input: MemoryRuntimeListNotesInput = {},
			signal,
		): Promise<MemoryRuntimePage<MemoryRuntimeNote>> {
			const page = await memo.listRecentMemories(
				{ limit: input.limit },
				signal,
			);
			const items = page.items
				.map((entry) => toMemoryNote(entry))
				.filter((note) => filterNote(note, input));
			return { items };
		},

		async createNote(
			input: MemoryRuntimeCreateNoteInput,
			signal,
		): Promise<MemoryRuntimeNote> {
			const result = await memo.notes.record(
				{
					kind: input.kind ?? "note",
					content: input.content,
					...(input.title === undefined ? {} : { title: input.title }),
					...(input.tags === undefined ? {} : { tags: input.tags }),
					...(input.confidence === undefined
						? {}
						: { confidence: input.confidence }),
					...(input.source === undefined ? {} : { source: input.source }),
					...(input.metadata === undefined
						? {}
						: {
								metadata: input.metadata as Record<string, unknown>,
							}),
				},
				signal,
			);
			return {
				id: result.id,
				kind: input.kind ?? "note",
				content: input.content,
				title: input.title,
				tags: input.tags,
				confidence: input.confidence,
				source: input.source,
				metadata: input.metadata,
				createdAt: new Date().toISOString(),
			};
		},

		async recall(
			input: MemoryRuntimeRecallInput,
		): Promise<MemoryRuntimeRecallResult> {
			// Route through the MemoFS class's intelligent recall engine, not a
			// naive text-search shim. The scope filters built by the tool layer
			// are forwarded as-is.
			const result = await memo.recall(input.query, {
				limit: input.topK,
				...(input.filters
					? { filter: input.filters as unknown as RecallFilter }
					: {}),
			});
			return {
				items: result.items.map(toRecallHit),
				warnings: result.warnings,
			};
		},

		// `index` is intentionally omitted: the MemoFS class has no public
		// re-index API (indexing is implicit and best-effort on every write).
		// The AI SDK tool's `index` command throws a clear "not supported"
		// error when this method is absent.
	};
}

function toCoreMemoryDocument(
	content: string,
): MemoryRuntimeCoreMemoryDocument {
	return { content };
}

function toMemoryNote(
	entry: RecentMemoryResult["items"][number],
): MemoryRuntimeNote {
	const metadata = (entry.metadata ?? {}) as JsonObject;
	const kind = (
		typeof metadata.kind === "string" ? metadata.kind : entry.type
	) as MemoryRuntimeNote["kind"] | undefined;
	return {
		id: entry.id,
		kind: kind ?? "note",
		title: typeof metadata.title === "string" ? metadata.title : undefined,
		content: entry.summary ?? "",
		tags: Array.isArray(metadata.tags)
			? (metadata.tags as string[]).filter(
					(t): t is string => typeof t === "string",
				)
			: undefined,
		confidence:
			typeof metadata.confidence === "number" ? metadata.confidence : undefined,
		source: typeof metadata.source === "string" ? metadata.source : undefined,
		metadata: metadata as unknown as JsonObject,
		createdAt: entry.timestamp,
	};
}

function filterNote(
	note: MemoryRuntimeNote,
	input: MemoryRuntimeListNotesInput,
): boolean {
	if (input.kind && note.kind !== input.kind) return false;
	if (input.tag && !(note.tags ?? []).includes(input.tag)) return false;
	return true;
}

function toRecallHit(item: RecallItem): MemoryRuntimeRecallHit {
	const firstRef = item.sourceRefs?.[0];
	return {
		id: item.id,
		text: item.text,
		score: item.score,
		sourceType: firstRef?.sourceType,
		sourceId: firstRef?.sourceId,
		sourcePath: firstRef?.path,
		metadata: item.metadata as unknown as JsonObject,
	};
}
