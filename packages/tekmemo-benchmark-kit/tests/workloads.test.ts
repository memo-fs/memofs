import { describe, expect, it } from "vitest";
import {
	BenchmarkRunner,
	createBenchmarkSuite,
	createEmbedderBenchmarkCase,
	createMemoryReadBenchmarkCase,
	createMemoryWriteBenchmarkCase,
	createRecallQueryBenchmarkCase,
	createRecallUpsertBenchmarkCase,
	createRerankBenchmarkCase,
} from "../../src";
import {
	createFakeEmbedder,
	createFakeMemoryStore,
	createFakeRecallStore,
	createFakeReranker,
} from "../../src/testing";

describe("workload helpers", () => {
	it("runs workload benchmark cases", async () => {
		const memoryStore = createFakeMemoryStore();
		const embedder = createFakeEmbedder();
		const recallStore = createFakeRecallStore();
		const reranker = createFakeReranker();

		await recallStore.upsert([
			{
				id: "doc_1",
				text: "memory",
				embedding: [1, 0],
				metadata: { projectId: "proj_1" },
			},
		]);

		const suite = createBenchmarkSuite({
			name: "workloads",
			cases: [
				createMemoryWriteBenchmarkCase({
					name: "memory-write",
					store: memoryStore,
					path: "core.md",
					iterations: 1,
				}),
				createMemoryReadBenchmarkCase({
					name: "memory-read",
					store: memoryStore,
					path: "core.md",
					iterations: 1,
				}),
				createEmbedderBenchmarkCase({
					name: "embed",
					embedder,
					texts: ["hello"],
					iterations: 1,
				}),
				createRecallUpsertBenchmarkCase({
					name: "recall-upsert",
					store: recallStore,
					documents: [
						{
							id: "doc_1",
							text: "memory",
							embedding: [1, 0],
							metadata: { projectId: "proj_1" },
						},
					],
					iterations: 1,
				}),
				createRecallQueryBenchmarkCase({
					name: "recall-query",
					store: recallStore,
					query: {
						embedding: [1, 0],
						topK: 1,
						filter: { projectId: "proj_1" },
					},
					iterations: 1,
				}),
				createRerankBenchmarkCase({
					name: "rerank",
					reranker,
					query: "memory",
					documents: [{ id: "doc_1", text: "memory" }],
					iterations: 1,
				}),
			],
		});

		const result = await new BenchmarkRunner().runSuite(suite);
		expect(
			result.cases.every((testCase) => testCase.stats.successes === 1),
		).toBe(true);
	});
});
