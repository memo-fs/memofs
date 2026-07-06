import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
	createBenchmarkSuite,
	createMemoryReadBenchmarkCase,
	createMemoryWriteBenchmarkCase,
	createRecallQueryBenchmarkCase,
} from "@memofs/benchmark-kit";
import {
	CORE_MEMORY_PATH,
	chunkText,
	createDeterministicFallbackReranker,
	createInMemoryRecallStore,
	createNodeFsMemoryStore,
	NOTES_MEMORY_PATH,
	readCoreMemory,
	writeCoreMemory,
} from "@memofs/core";
import {
	createMemoryText,
	createRecallDocuments,
	createVector,
	runBenchmarks,
} from "./benchmark-runtime.js";

const recallDocuments = createRecallDocuments(150, 12);
const recallStore = createInMemoryRecallStore({
	dimension: 12,
	duplicateDocumentIdBehavior: "last-write-wins",
});
await recallStore.upsert(recallDocuments);

const rootDir = await mkdtemp(path.join(tmpdir(), "tekmemo-release-bench-"));
const fsStore = createNodeFsMemoryStore({
	rootDir,
	missingFileBehavior: "throw",
});
await writeCoreMemory(fsStore, "# Core Memory\n\nRelease benchmark seed.");
await fsStore.write(NOTES_MEMORY_PATH, createMemoryText(40));

try {
	await runBenchmarks({
		mode: "release",
		suites: [
			createBenchmarkSuite({
				name: "release-package-safety",
				description:
					"Publish-gated local checks for built exports and package-level memory behavior.",
				cases: [
					{
						name: "package-exports-resolve",
						iterations: 10,
						warmupIterations: 1,
						async run() {
							await import("@memofs/core");
						},
					},
					createMemoryWriteBenchmarkCase({
						name: "node-fs-write-core-50",
						store: fsStore,
						path: CORE_MEMORY_PATH,
						iterations: 50,
						warmupIterations: 5,
						contentFactory: (iteration) =>
							`# Core Memory\n\nRelease write iteration ${iteration}.`,
					}),
					createMemoryReadBenchmarkCase({
						name: "node-fs-read-core-50",
						store: fsStore,
						path: CORE_MEMORY_PATH,
						iterations: 50,
						warmupIterations: 5,
					}),
					{
						name: "core-memory-read-write-lifecycle",
						iterations: 25,
						warmupIterations: 3,
						async run(ctx) {
							await writeCoreMemory(
								fsStore,
								`# Core Memory\n\nLifecycle iteration ${ctx.iteration}.`,
							);
							const text = await readCoreMemory(fsStore);
							if (!text.includes("Lifecycle iteration")) {
								throw new Error(
									"Core memory lifecycle read did not match write.",
								);
							}
						},
					},
					{
						name: "chunk-notes-release-dataset",
						iterations: 50,
						warmupIterations: 5,
						run() {
							const chunks = chunkText(createMemoryText(80), {
								source: { sourceType: "document", sourceId: "release-notes" },
								memoryType: "notes",
								maxChars: 420,
								overlapChars: 60,
							});
							if (chunks.length < 10) {
								throw new Error("Expected release dataset to produce chunks.");
							}
						},
					},
					createRecallQueryBenchmarkCase({
						name: "in-memory-recall-query-top-10",
						store: recallStore,
						query: {
							embedding: createVector(12, 10),
							topK: 10,
							filter: { projectId: "tekbreed-tekmemo" },
						},
						iterations: 75,
						warmupIterations: 5,
					}),
					{
						name: "deterministic-rerank-top-5",
						iterations: 50,
						warmupIterations: 5,
						async run() {
							const reranker = createDeterministicFallbackReranker();
							const result = await reranker.rerank({
								query: "layered memory recall",
								documents: recallDocuments.slice(0, 20).map((document) => ({
									id: document.id,
									text: document.text,
									metadata: document.metadata,
								})),
								topK: 5,
							});
							if (result.length !== 5) {
								throw new Error("Expected topK rerank result.");
							}
						},
					},
				],
			}),
		],
	});
} finally {
	await rm(rootDir, { recursive: true, force: true });
}
