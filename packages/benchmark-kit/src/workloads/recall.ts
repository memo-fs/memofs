import type { BenchmarkCase } from "../types";
import type { MinimalRecallStore } from "./types";

export function createRecallQueryBenchmarkCase(input: {
	name: string;
	store: MinimalRecallStore;
	query: {
		embedding: number[];
		topK: number;
		filter?: Record<string, unknown>;
	};
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
}): BenchmarkCase {
	return {
		name: input.name,
		iterations: input.iterations,
		warmupIterations: input.warmupIterations,
		concurrency: input.concurrency,
		timeoutMs: input.timeoutMs,
		async run() {
			await input.store.query(input.query);
		},
	};
}

export function createRecallUpsertBenchmarkCase(input: {
	name: string;
	store: MinimalRecallStore;
	documents: Array<{
		id: string;
		text: string;
		embedding: number[];
		metadata: Record<string, unknown>;
	}>;
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
}): BenchmarkCase {
	return {
		name: input.name,
		iterations: input.iterations,
		warmupIterations: input.warmupIterations,
		concurrency: input.concurrency,
		timeoutMs: input.timeoutMs,
		async run() {
			await input.store.upsert(input.documents);
		},
	};
}
