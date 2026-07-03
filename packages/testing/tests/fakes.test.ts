import { describe, expect, it } from "vitest";
import {
	createFakeEmbedder,
	createFakeExtractor,
	createFakeLlmClient,
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

	it("fake extractor emits nodes, edges, and contradictions", async () => {
		const extractor = createFakeExtractor();
		const result = await extractor.extract({
			text: "TekMemo uses BM25\nOAuth2 supersedes JWT",
			sourceRef: { sourceType: "document", sourceId: "core" },
		});

		expect(result.model).toBe("fake-extractor");
		expect(result.nodes.length).toBeGreaterThanOrEqual(3);
		expect(result.edges.map((e) => e.type)).toEqual(
			expect.arrayContaining(["uses", "supersedes"]),
		);
		expect(result.contradictions?.[0]?.type).toBe("supersedes");
		// Provenance is stamped onto every emitted entity.
		for (const node of result.nodes) {
			expect(node.sourceRefs?.[0]).toMatchObject({
				sourceType: "document",
				sourceId: "core",
			});
		}
	});

	it("fake extractor rejects empty text", async () => {
		const extractor = createFakeExtractor();
		await expect(extractor.extract({ text: "" })).rejects.toThrow();
	});

	it("fake llm client echoes the user turn and records the call", async () => {
		const client = createFakeLlmClient();
		const result = await client.complete({
			system: "rewrite queries",
			user: "how do I rotate logs",
		});
		expect(result.text).toBe("how do I rotate logs");
		expect(result.model).toBe("fake-llm-client");
		expect(result.structured).toBeUndefined();
		expect(client.calls[0]).toMatchObject({
			system: "rewrite queries",
			user: "how do I rotate logs",
		});
	});

	it("fake llm client surfaces a structured object for JSON-shaped responses", async () => {
		const client = createFakeLlmClient({
			resolveText: () => JSON.stringify({ query: "rotate logs" }),
		});
		const result = await client.complete({
			user: "rotate logs",
			schema: { type: "object", properties: { query: { type: "string" } } },
		});
		expect(result.structured).toEqual({ query: "rotate logs" });
		// Text stays present even when structured is returned.
		expect(typeof result.text).toBe("string");
	});

	// Defensive-parse parity (s3-execution-plan.md universal bar): a resolver that
	// throws never escapes the client — it surfaces a text-only empty result, the
	// same contract a real adapter must satisfy so the deterministic fallback
	// stays reachable on malformed provider output.
	it("fake llm client never throws when the resolver fails", async () => {
		const client = createFakeLlmClient({
			resolveText: () => {
				throw new Error("provider 500");
			},
		});
		const result = await client.complete({ user: "anything" });
		expect(result.text).toBe("");
		expect(result.structured).toBeUndefined();
		expect(result.model).toBe("fake-llm-client");
	});
});
