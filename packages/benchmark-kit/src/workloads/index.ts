/**
 * @file Public entry for the benchmark-kit `/workloads` subpath.
 *
 * @remarks
 * Re-exports the built-in benchmark case factories so consumers can
 * `import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads"`.
 *
 * @public
 */

export { createEmbedderBenchmarkCase } from "./embedder";
export {
	createEmbedderWorkloads,
	createMemoryStoreWorkloads,
	createRecallWorkloads,
	createRerankWorkloads,
	defineWorkload,
} from "./factories";
export {
	createMemoryReadBenchmarkCase,
	createMemoryWriteBenchmarkCase,
} from "./memory-store";
export {
	createRecallQueryBenchmarkCase,
	createRecallUpsertBenchmarkCase,
} from "./recall";
export { createRerankBenchmarkCase } from "./rerank";
export type * from "./types";
