import type { BenchmarkCase } from "../types";
import type { MinimalEmbedder } from "./types";

export function createEmbedderBenchmarkCase(input: {
	name: string;
	embedder: MinimalEmbedder;
	texts: string[];
	inputType?: "query" | "document" | null;
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
			await input.embedder.embedTexts({
				texts: input.texts,
				...(input.inputType !== undefined && { inputType: input.inputType }),
			});
		},
	};
}
