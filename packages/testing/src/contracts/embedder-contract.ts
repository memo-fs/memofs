import { describe, expect, it } from "vitest";
import { expectVector } from "../assertions/assertions";
import { EMBEDDING_TEXTS_FIXTURE } from "../fixtures/embedding-fixtures";
import type { MinimalEmbedder } from "../types/contracts";

export interface EmbedderContractOptions {
	name: string;
	createEmbedder: () => Promise<MinimalEmbedder> | MinimalEmbedder;
	expectedDimensions: number;
	supportsEmbedText?: boolean;
	rejectsEmptyText?: boolean;
}

export function defineEmbedderContractTests(
	options: EmbedderContractOptions,
): void {
	describe(`${options.name} Embedder contract`, () => {
		it("returns one embedding per input text", async () => {
			const embedder = await options.createEmbedder();
			const result = await embedder.embedTexts({
				texts: [...EMBEDDING_TEXTS_FIXTURE],
				inputType: "document",
				expectedDimensions: options.expectedDimensions,
			});

			expect(result.embeddings).toHaveLength(EMBEDDING_TEXTS_FIXTURE.length);

			result.embeddings.forEach((item, index) => {
				expectVector(item.embedding, options.expectedDimensions);
				if (item.index !== undefined) {
					expect(item.index).toBe(index);
				}
			});
		});

		it("returns empty embeddings for empty input", async () => {
			const embedder = await options.createEmbedder();
			const result = await embedder.embedTexts({ texts: [] });
			expect(result.embeddings).toEqual([]);
		});

		it("handles query input type", async () => {
			const embedder = await options.createEmbedder();
			const result = await embedder.embedTexts({
				texts: ["What is MemoFS memory?"],
				inputType: "query",
				expectedDimensions: options.expectedDimensions,
			});

			expect(result.embeddings).toHaveLength(1);
			expectVector(result.embeddings[0]?.embedding, options.expectedDimensions);
		});

		it("handles empty text according to configured behavior", async () => {
			const embedder = await options.createEmbedder();
			const promise = embedder.embedTexts({ texts: [""] });

			if (options.rejectsEmptyText ?? true) {
				await expect(promise).rejects.toThrow();
			} else {
				await expect(promise).resolves.toHaveProperty("embeddings");
			}
		});

		if (options.supportsEmbedText ?? true) {
			it("supports embedText when available", async () => {
				const embedder = await options.createEmbedder();
				expect(typeof embedder.embedText).toBe("function");
				if (!embedder.embedText) {
					throw new Error("Expected embedder.embedText to be available.");
				}

				const result = await embedder.embedText("MemoFS", {
					inputType: "query",
					expectedDimensions: options.expectedDimensions,
				});

				expectVector(result.embedding, options.expectedDimensions);
			});
		}
	});
}
