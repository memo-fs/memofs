/**
 * @file High-level benchmark workload factories.
 *
 * @remarks
 * Ergonomic wrappers around the per-case factories that bundle a complete
 * workload (a name + case list) for a given provider (embedder, reranker,
 * recall store, or memory store). These match the public surface described
 * in the package README.
 *
 * @public
 */

import type { BenchmarkCase } from "../types";
import { createEmbedderBenchmarkCase } from "./embedder";
import {
	createMemoryReadBenchmarkCase,
	createMemoryWriteBenchmarkCase,
} from "./memory-store";
import {
	createRecallQueryBenchmarkCase,
	createRecallUpsertBenchmarkCase,
} from "./recall";
import { createRerankBenchmarkCase } from "./rerank";
import type {
	MinimalEmbedder,
	MinimalMemoryStore,
	MinimalRecallStore,
	MinimalReranker,
} from "./types";

/**
 * Bundle a complete embedder workload.
 *
 * @param input - Embedder + sample texts + run config
 * @returns A `BenchmarkCase` covering a single embedder run
 */
export function createEmbedderWorkloads(input: {
	name: string;
	embedder: MinimalEmbedder;
	texts: string[];
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
}): BenchmarkCase {
	return createEmbedderBenchmarkCase(input);
}

/**
 * Bundle a complete reranker workload.
 *
 * @param input - Reranker + sample documents + run config
 */
export function createRerankWorkloads(input: {
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
	return createRerankBenchmarkCase(input);
}

/**
 * Bundle a recall-store workload covering both upsert and query paths.
 *
 * @param input - Store + sample documents + run config
 * @returns An object with the two cases; pass each to a suite
 */
export function createRecallWorkloads(input: {
	name: string;
	store: MinimalRecallStore;
	documents: Array<{
		id: string;
		text: string;
		embedding: number[];
		metadata: Record<string, unknown>;
	}>;
	query: {
		embedding: number[];
		topK: number;
		filter?: Record<string, unknown>;
	};
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
}): { upsert: BenchmarkCase; query: BenchmarkCase } {
	return {
		upsert: createRecallUpsertBenchmarkCase({
			name: `${input.name}/upsert`,
			store: input.store,
			documents: input.documents,
			iterations: input.iterations,
			warmupIterations: input.warmupIterations,
			concurrency: input.concurrency,
			timeoutMs: input.timeoutMs,
		}),
		query: createRecallQueryBenchmarkCase({
			name: `${input.name}/query`,
			store: input.store,
			query: input.query,
			iterations: input.iterations,
			warmupIterations: input.warmupIterations,
			concurrency: input.concurrency,
			timeoutMs: input.timeoutMs,
		}),
	};
}

/**
 * Bundle a memory-store workload covering both read and write paths.
 *
 * @param input - Store + path + content factory + run config
 */
export function createMemoryStoreWorkloads(input: {
	name: string;
	store: MinimalMemoryStore;
	path: string;
	contentFactory?: (iteration: number) => string;
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
}): { write: BenchmarkCase; read: BenchmarkCase } {
	return {
		write: createMemoryWriteBenchmarkCase({
			name: `${input.name}/write`,
			store: input.store,
			path: input.path,
			contentFactory: input.contentFactory,
			iterations: input.iterations,
			warmupIterations: input.warmupIterations,
			concurrency: input.concurrency,
			timeoutMs: input.timeoutMs,
		}),
		read: createMemoryReadBenchmarkCase({
			name: `${input.name}/read`,
			store: input.store,
			path: input.path,
			iterations: input.iterations,
			warmupIterations: input.warmupIterations,
			concurrency: input.concurrency,
			timeoutMs: input.timeoutMs,
		}),
	};
}

/**
 * Define a custom benchmark workload with a name + async run function.
 *
 * @param input - Name + iterations + run function
 */
export function defineWorkload(input: {
	name: string;
	iterations: number;
	warmupIterations?: number;
	concurrency?: number;
	timeoutMs?: number;
	run: (ctx: { iteration: number }) => Promise<unknown>;
}): BenchmarkCase {
	return {
		name: input.name,
		iterations: input.iterations,
		warmupIterations: input.warmupIterations,
		concurrency: input.concurrency,
		timeoutMs: input.timeoutMs,
		async run(ctx) {
			await input.run(ctx);
		},
	};
}
