import { describe, expect, it } from "vitest";
import {
	createVoyageReranker,
	VoyageRerankResponseError,
	VoyageRerankValidationError,
} from "../../src";
import { createFakeVoyageRerankClient } from "../../src/reranker/testing";

describe("VoyageReranker", () => {
	it("returns empty results for empty documents", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient(),
		});
		await expect(
			reranker.rerank({ query: "memory", documents: [] }),
		).resolves.toEqual([]);
	});

	it("maps Voyage indexes back to original document IDs", async () => {
		const client = createFakeVoyageRerankClient({ scores: [0.1, 0.9] });
		const reranker = createVoyageReranker({ client, model: "rerank-2.5-lite" });

		const results = await reranker.rerank({
			query: "memory",
			documents: [
				{ id: "a", text: "billing" },
				{ id: "b", text: "memory" },
			],
			topK: 1,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("b");
		expect(results[0]?.rank).toBe(1);
		expect(client.requests[0]).toMatchObject({
			model: "rerank-2.5-lite",
			top_k: 1,
			truncation: true,
		});
	});

	it("preserves metadata defensively", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient({ scores: [1] }),
		});
		const metadata = { tags: ["core"] };

		const results = await reranker.rerank({
			query: "memory",
			documents: [{ id: "a", text: "memory", metadata }],
		});

		(results[0]?.metadata as { tags: string[] }).tags.push("mutated");
		expect(metadata.tags).toEqual(["core"]);
	});

	it("rejects more than configured max documents", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient(),
			maxDocuments: 1,
		});

		await expect(
			reranker.rerank({
				query: "x",
				documents: [
					{ id: "a", text: "a" },
					{ id: "b", text: "b" },
				],
			}),
		).rejects.toThrow(VoyageRerankValidationError);
	});

	it("rejects duplicate provider indexes", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient({
				responseData: [
					{ index: 0, relevance_score: 0.9 },
					{ index: 0, relevance_score: 0.8 },
				],
			}),
		});

		await expect(
			reranker.rerank({
				query: "x",
				documents: [{ id: "a", text: "a" }],
			}),
		).rejects.toThrow(VoyageRerankResponseError);
	});

	it("rejects out-of-range provider indexes", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient({
				responseData: [{ index: 99, relevance_score: 0.9 }],
			}),
		});

		await expect(
			reranker.rerank({
				query: "x",
				documents: [{ id: "a", text: "a" }],
			}),
		).rejects.toThrow(VoyageRerankResponseError);
	});

	it("rejects non-finite provider scores", async () => {
		const reranker = createVoyageReranker({
			client: createFakeVoyageRerankClient({
				responseData: [{ index: 0, relevance_score: Number.NaN }],
			}),
		});

		await expect(
			reranker.rerank({
				query: "x",
				documents: [{ id: "a", text: "a" }],
			}),
		).rejects.toThrow(VoyageRerankResponseError);
	});
});
