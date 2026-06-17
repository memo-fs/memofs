import { describe, expect, it } from "vitest";
import {
	createFakeEmbedder,
	createFakeMemoryStore,
	createFakeRecallStore,
	createFakeReranker,
	createRecallDocumentsFixture,
	createRerankDocumentsFixture,
} from "../src";

describe("fakes", () => {
	it("fake memory store reads and writes", async () => {
		const store = createFakeMemoryStore();
		await store.write("a", "hello");
		await store.append("a", " world");
		await expect(store.read("a")).resolves.toBe("hello world");
	});

	it("fake embedder returns vectors", async () => {
		const embedder = createFakeEmbedder({ dimensions: 4 });
		const result = await embedder.embedTexts({ texts: ["hello"] });
		expect(result.embeddings[0]?.embedding).toHaveLength(4);
	});

	it("fake recall store queries", async () => {
		const store = createFakeRecallStore();
		const docs = createRecallDocumentsFixture(3);
		await store.upsert(docs);
		const [firstDocument] = docs;
		if (!firstDocument) throw new Error("Expected recall fixture document.");

		const results = await store.query({
			embedding: firstDocument.embedding,
			topK: 1,
			filter: { projectId: "proj_1" },
		});

		expect(results[0]?.id).toBe("chunk_core");
	});

	it("fake reranker ranks", async () => {
		const reranker = createFakeReranker();
		const results = await reranker.rerank({
			query: "local memory",
			documents: createRerankDocumentsFixture(),
			topK: 1,
		});

		expect(results[0]?.rank).toBe(1);
	});
});
