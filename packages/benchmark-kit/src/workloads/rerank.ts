import type { BenchmarkCase } from "../types";
import type { MinimalReranker } from "./types";

export function createRerankBenchmarkCase(input: {
	name: string;
	reranker: MinimalReranker;
	query: string;
	documents: Array<{
		id: string;
		text: string;
		metadata?: Record<string, unknown>;
	}>;
	topK?: number;
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
			await input.reranker.rerank({
				query: input.query,
				documents: input.documents,
				...(input.topK !== undefined && { topK: input.topK }),
			});
		},
	};
}
