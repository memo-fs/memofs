import {
	CORE_MEMORY_PATH,
	chunkText,
	createBenchmarkSuite,
	createMemoryReadBenchmarkCase,
	createMemoryWriteBenchmarkCase,
	createRecallQueryBenchmarkCase,
	createRecallUpsertBenchmarkCase,
	createRerankBenchmarkCase,
} from "@tekbreed/tekmemo";
import {
	createFakeMemoryStore,
	createFakeRecallStore,
	createFakeReranker,
} from "../../packages/tekmemo/src/benchmark-kit/testing/index.js";
import {
	createMemoryText,
	createRecallDocuments,
	createVector,
	runBenchmarks,
} from "./benchmark-runtime.js";

const recallDocuments = createRecallDocuments(50, 8);
const recallStore = createFakeRecallStore();
await recallStore.upsert(recallDocuments);

const memoryStore = createFakeMemoryStore();
await memoryStore.write(CORE_MEMORY_PATH, createMemoryText(25));

await runBenchmarks({
	mode: "smoke",
	suites: [
		createBenchmarkSuite({
			name: "smoke-memory-pipeline",
			description:
				"Fast deterministic local checks for memory I/O, chunking, recall, and reranking.",
			cases: [
				createMemoryWriteBenchmarkCase({
					name: "fake-memory-write-100",
					store: memoryStore,
					path: CORE_MEMORY_PATH,
					iterations: 100,
					warmupIterations: 5,
					contentFactory: (iteration) =>
						`# Core Memory\n\nSmoke write ${iteration}`,
				}),
				createMemoryReadBenchmarkCase({
					name: "fake-memory-read-100",
					store: memoryStore,
					path: CORE_MEMORY_PATH,
					iterations: 100,
					warmupIterations: 5,
				}),
				{
					name: "chunk-core-memory-100",
					iterations: 100,
					warmupIterations: 5,
					run() {
						const chunks = chunkText(createMemoryText(30), {
							source: { sourceType: "document", sourceId: "smoke-core" },
							memoryType: "core",
							maxChars: 280,
							overlapChars: 40,
						});
						if (chunks.length === 0) throw new Error("Expected chunks.");
					},
				},
				createRecallUpsertBenchmarkCase({
					name: "fake-recall-upsert-20",
					store: createFakeRecallStore(),
					documents: recallDocuments.slice(0, 20),
					iterations: 10,
					warmupIterations: 2,
				}),
				createRecallQueryBenchmarkCase({
					name: "fake-recall-query-top-5",
					store: recallStore,
					query: {
						embedding: createVector(8, 5),
						topK: 5,
						filter: { projectId: "@tekbreed/tekmemo" },
					},
					iterations: 100,
					warmupIterations: 5,
				}),
				createRerankBenchmarkCase({
					name: "fake-rerank-top-3",
					reranker: createFakeReranker(),
					query: "layered agent memory",
					documents: recallDocuments.slice(0, 10).map((document) => ({
						id: document.id,
						text: document.text,
						metadata: document.metadata,
					})),
					topK: 3,
					iterations: 50,
					warmupIterations: 5,
				}),
			],
		}),
	],
});
