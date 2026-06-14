import { describe, expect, it } from "vitest";
import {
	createVoyageEmbedder,
	VoyageResponseError,
	VoyageValidationError,
} from "../../src";
import { createFakeVoyageClient } from "../../src/voyageai/testing";

describe("VoyageEmbedder", () => {
	it("returns empty result for empty text array", async () => {
		const embedder = createVoyageEmbedder({ client: createFakeVoyageClient() });
		const result = await embedder.embedTexts({ texts: [] });
		expect(result.embeddings).toEqual([]);
		expect(result.usage?.totalTokens).toBe(0);
	});

	it("rejects whitespace-only text by default", async () => {
		const embedder = createVoyageEmbedder({ client: createFakeVoyageClient() });
		await expect(embedder.embedTexts({ texts: ["   "] })).rejects.toThrow(
			VoyageValidationError,
		);
	});

	it("can allow empty text explicitly", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient({ dimensions: 4 }),
			expectedDimensions: 4,
		});
		await expect(
			embedder.embedTexts({ texts: [""], allowEmptyText: true }),
		).resolves.toHaveProperty("embeddings");
	});

	it("passes model, input type, truncation and output dimension to client", async () => {
		const client = createFakeVoyageClient({ dimensions: 1024 });
		const embedder = createVoyageEmbedder({
			client,
			model: "voyage-4-lite",
			outputDimension: 1024,
			truncation: false,
		});

		await embedder.embedTexts({
			texts: ["memory chunk"],
			inputType: "document",
		});

		expect(client.requests[0]).toMatchObject({
			model: "voyage-4-lite",
			input_type: "document",
			truncation: false,
			output_dimension: 1024,
			output_dtype: "float",
			encoding_format: null,
		});
	});

	it("rejects base64 encoding because TekMemo expects numeric vectors", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient(),
			encodingFormat: "base64",
		});
		await expect(embedder.embedTexts({ texts: ["hello"] })).rejects.toThrow(
			VoyageValidationError,
		);
	});

	it("detects response count mismatch", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient({ responseCountOffset: -1 }),
		});

		await expect(
			embedder.embedTexts({ texts: ["one", "two"] }),
		).rejects.toThrow(VoyageResponseError);
	});

	it("detects dimension mismatch", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient({ dimensions: 3 }),
			expectedDimensions: 4,
		});

		await expect(embedder.embedTexts({ texts: ["one"] })).rejects.toThrow(
			VoyageResponseError,
		);
	});

	it("detects malformed finite values", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient({ malformedEmbeddingAt: 0 }),
		});

		await expect(embedder.embedTexts({ texts: ["one"] })).rejects.toThrow(
			VoyageResponseError,
		);
	});

	it("embeds one text", async () => {
		const embedder = createVoyageEmbedder({
			client: createFakeVoyageClient({ dimensions: 4 }),
			expectedDimensions: 4,
		});
		const result = await embedder.embedText("hello", { inputType: "query" });
		expect(result.text).toBe("hello");
		expect(result.inputType).toBe("query");
		expect(result.embedding).toHaveLength(4);
	});
});
