import type { BenchmarkCase } from "../types";
import type { MinimalMemoryStore } from "./types";

export function createMemoryWriteBenchmarkCase(input: {
	name: string;
	store: MinimalMemoryStore;
	path: string;
	contentFactory?: (iteration: number) => string;
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
		async run(ctx) {
			await input.store.write(
				input.path,
				input.contentFactory?.(ctx.iteration) ?? `benchmark-${ctx.iteration}`,
			);
		},
	};
}

export function createMemoryReadBenchmarkCase(input: {
	name: string;
	store: MinimalMemoryStore;
	path: string;
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
			await input.store.read(input.path);
		},
	};
}
