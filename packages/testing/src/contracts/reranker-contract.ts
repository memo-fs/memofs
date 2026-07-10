import { describe, expect, it } from "vitest";
import {
	cloneForMutationCheck,
	expectNoMutation,
	expectSortedDescending,
} from "../assertions/assertions";
import { createRerankDocumentsFixture } from "../fixtures/rerank-fixtures";
import type { MinimalReranker } from "../types/contracts";

export interface RerankerContractOptions {
	name: string;
	createReranker: () => Promise<MinimalReranker> | MinimalReranker;
	cleanup?: () => Promise<void> | void;
}

export function defineRerankerContractTests(
	options: RerankerContractOptions,
): void {
	describe(`${options.name} Reranker contract`, () => {
		it("returns ranked results with stable rank numbers", async () => {
			const reranker = await options.createReranker();
			try {
				const results = await reranker.rerank({
					query: "local memory protocol",
					documents: createRerankDocumentsFixture(),
					topK: 2,
				});

				expect(results).toHaveLength(2);
				expect(results.map((result) => result.rank)).toEqual([1, 2]);
				expectSortedDescending(results.map((result) => result.score));
			} finally {
				await options.cleanup?.();
			}
		});

		it("returns empty results for empty documents", async () => {
			const reranker = await options.createReranker();
			try {
				const results = await reranker.rerank({
					query: "memory",
					documents: [],
				});

				expect(results).toEqual([]);
			} finally {
				await options.cleanup?.();
			}
		});

		it("preserves metadata defensively", async () => {
			const reranker = await options.createReranker();
			try {
				const documents = createRerankDocumentsFixture();
				const before = cloneForMutationCheck(documents);

				const results = await reranker.rerank({
					query: "memory",
					documents,
					topK: 3,
				});

				expectNoMutation(before, documents);

				if (results[0]?.metadata) {
					(results[0].metadata as Record<string, unknown>).mutated = true;
					expect(
						documents.find((document) => document.id === results[0]?.id)
							?.metadata,
					).not.toHaveProperty("mutated");
				}
			} finally {
				await options.cleanup?.();
			}
		});

		it("rejects duplicate document IDs", async () => {
			const reranker = await options.createReranker();
			try {
				const documents = createRerankDocumentsFixture();
				const [firstDocument] = documents;
				if (!firstDocument)
					throw new Error("Expected rerank fixture document.");
				await expect(
					reranker.rerank({
						query: "memory",
						documents: [firstDocument, { ...firstDocument }],
					}),
				).rejects.toThrow();
			} finally {
				await options.cleanup?.();
			}
		});

		it("rejects empty query", async () => {
			const reranker = await options.createReranker();
			try {
				await expect(
					reranker.rerank({
						query: "",
						documents: createRerankDocumentsFixture(),
					}),
				).rejects.toThrow();
			} finally {
				await options.cleanup?.();
			}
		});
	});
}
