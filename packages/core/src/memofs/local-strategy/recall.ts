import {
	mergeHybridCandidates,
	readCoreMemory,
	readNotesMemory,
	searchMemoryText,
} from "../../index";
import type { RecallInput, RecallResult } from "../types";
import { candidateShape, hash } from "./helpers";
import type { LocalStrategyContext } from "./types";

export async function localRecall(
	ctx: LocalStrategyContext,
	input: RecallInput,
	signal?: AbortSignal,
): Promise<RecallResult> {
	await ctx.ensureReady();
	if (signal?.aborted) throw new Error("Operation aborted.");

	const limit = input.limit ?? 10;

	const lexicalCandidates = await runLexicalRecall(ctx, input.query, limit);

	const vectorCandidates = new Map<
		string,
		{ text: string; score: number; metadata?: Record<string, unknown> }
	>();
	if (ctx.options.embedder && ctx.options.recallStore) {
		try {
			const embedResult = await ctx.options.embedder.embedText(input.query);
			const results = await ctx.options.recallStore.query({
				embedding: embedResult.embedding,
				topK: limit * 3,
			});
			for (const r of results) {
				vectorCandidates.set(r.id, {
					text: r.text ?? "",
					score: r.score ?? 0,
					...(r.metadata === undefined
						? {}
						: { metadata: r.metadata as Record<string, unknown> }),
				});
			}
		} catch {
			// Vector path is an enhancement; fall through to lexical-only.
		}
	}

	const hasVector = vectorCandidates.size > 0;
	const hasLexical = lexicalCandidates.size > 0;

	if (!hasVector && !hasLexical) {
		return { items: [] };
	}

	const ids = new Set<string>([
		...vectorCandidates.keys(),
		...lexicalCandidates.keys(),
	]);
	const candidates = new Map<string, ReturnType<typeof candidateShape>>();
	for (const id of ids) {
		const v = vectorCandidates.get(id);
		const l = lexicalCandidates.get(id);
		candidates.set(id, candidateShape(id, v, l));
	}

	const items = await mergeHybridCandidates(candidates as never, {
		query: input.query,
		topK: limit,
		reranker: ctx.reranker,
	});

	return { items };
}

async function runLexicalRecall(
	ctx: LocalStrategyContext,
	query: string,
	limit: number,
): Promise<
	Map<
		string,
		{ text: string; score: number; metadata?: Record<string, unknown> }
	>
> {
	const out = new Map<
		string,
		{ text: string; score: number; metadata?: Record<string, unknown> }
	>();

	try {
		const bm25Results = ctx.lexicalStore.search(query, { topK: limit * 2 });
		for (const result of bm25Results) {
			// Staleness loop: a graph node retired by consolidation is marked
			// deprecated but was already indexed into the lexical store when it
			// was written. Skip it here so recall stops serving the old answer.
			if (ctx.isRetiredGraphDoc(result.id)) continue;
			const text = ctx.lexicalTextById.get(result.id) ?? "";
			out.set(result.id, {
				text,
				score: result.score,
				metadata: { source: "bm25" },
			});
		}
	} catch {
		// Best-effort BM25.
	}

	try {
		const core = await readCoreMemory(ctx.options.store);
		const notes = await readNotesMemory(ctx.options.store);
		for (const [source, content] of [
			["core", core],
			["notes", notes],
		] as const) {
			const results = searchMemoryText({
				content,
				query,
				limit: limit * 2,
				mode: "auto",
			});
			for (const result of results) {
				const id = `${source}_${result.index}_${hash(result.text).slice(0, 12)}`;
				const existing = out.get(id);
				const score = result.score / 10;
				if (!existing || score > existing.score) {
					out.set(id, {
						text: result.text,
						score,
						metadata: { source, index: result.index },
					});
				}
			}
		}
	} catch {
		// Best-effort substring recall.
	}
	return out;
}
