import {
	createBenchmarkSuite,
	createRecallQueryBenchmarkCase,
} from "@memofs/benchmark-kit";
import { chunkText, createInMemoryRecallStore } from "@memofs/core";
import {
	createMemoryText,
	createRecallDocuments,
	createVector,
	providerSkipNotes,
	runBenchmarks,
} from "./benchmark-runtime.js";

const dimensions = 16;
const recallDocuments = createRecallDocuments(1000, dimensions);
const recallStore = createInMemoryRecallStore({
	dimension: dimensions,
	duplicateDocumentIdBehavior: "last-write-wins",
});
await recallStore.upsert(recallDocuments);

await runBenchmarks({
	mode: "full",
	notes: providerSkipNotes({
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
		UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL,
		UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN,
	}),
	suites: [
		createBenchmarkSuite({
			name: "full-local-memory-scale",
			description:
				"Larger deterministic local benchmark that can run on schedule without provider secrets.",
			cases: [
				{
					name: "chunk-large-memory-set",
					iterations: 25,
					warmupIterations: 2,
					run() {
						const chunks = chunkText(createMemoryText(500), {
							source: { sourceType: "document", sourceId: "full-local" },
							memoryType: "notes",
							maxChars: 600,
							overlapChars: 80,
						});
						if (chunks.length < 50) {
							throw new Error("Expected large memory set to produce chunks.");
						}
					},
				},
				createRecallQueryBenchmarkCase({
					name: "in-memory-recall-query-1000-documents",
					store: recallStore,
					query: {
						embedding: createVector(dimensions, 42),
						topK: 20,
						filter: { projectId: "tekbreed-tekmemo" },
					},
					iterations: 50,
					warmupIterations: 5,
				}),
			],
		}),
	],
});
