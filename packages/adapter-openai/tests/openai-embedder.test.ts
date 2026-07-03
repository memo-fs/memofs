import { describe, expect, it } from "vitest";
import {
	createOpenAIEmbedder,
	OpenAIResponseError,
	OpenAIValidationError,
} from "../src";
import { createFakeOpenAIClient } from "../src/testing";

describe("OpenAIEmbedder", () => {
	it("returns empty result for empty text array", async () => {
		const embedder = createOpenAIEmbedder({ client: createFakeOpenAIClient() });
		const result = await embedder.embedTexts({ texts: [] });
		expect(result.embeddings).toEqual([]);
		expect(result.usage?.totalTokens).toBe(0);
	});

	it("rejects whitespace-only text by default", async () => {
		const embedder = createOpenAIEmbedder({ client: createFakeOpenAIClient() });
		await expect(embedder.embedTexts({ texts: ["   "] })).rejects.toThrow(
			OpenAIValidationError,
		);
	});

	it("can allow empty text explicitly", async () => {
		const embedder = createOpenAIEmbedder({
			client: createFakeOpenAIClient({ dimensions: 4 }),
			expectedDimensions: 4,
		});
		await expect(
			embedder.embedTexts({ texts: [""], allowEmptyText: true }),
		).resolves.toHaveProperty("embeddings");
	});

	it("passes model, dimensions, encoding and user to client", async () => {
		const client = createFakeOpenAIClient({ dimensions: 1024 });
		const embedder = createOpenAIEmbedder({
			client,
			model: "text-embedding-3-small",
			dimensions: 1024,
			user: "user_123",
		});

		await embedder.embedTexts({ texts: ["memory chunk"] });

		expect(client.requests[0]).toMatchObject({
			model: "text-embedding-3-small",
			dimensions: 1024,
			encoding_format: "float",
			user: "user_123",
		});
	});

	it("rejects base64 encoding because TekMemo expects numeric vectors", async () => {
		const embedder = createOpenAIEmbedder({
			client: createFakeOpenAIClient(),
			encodingFormat: "base64",
		});
		await expect(embedder.embedTexts({ texts: ["hello"] })).rejects.toThrow(
			OpenAIValidationError,
		);
	});

	it("detects response count mismatch", async () => {
		const embedder = createOpenAIEmbedder({
			client: createFakeOpenAIClient({ responseCountOffset: -1 }),
		});
		await expect(
			embedder.embedTexts({ texts: ["one", "two"] }),
		).rejects.toThrow(OpenAIResponseError);
	});

	it("detects dimension mismatch", async () => {
		const embedder = createOpenAIEmbedder({
			client: createFakeOpenAIClient({ dimensions: 3 }),
			expectedDimensions: 4,
		});
		await expect(embedder.embedTexts({ texts: ["one"] })).rejects.toThrow(
			OpenAIResponseError,
		);
	});

	it("handles shuffled provider results by index", async () => {
		const client = createFakeOpenAIClient({
			dimensions: 4,
			shuffleResponse: true,
		});
		const embedder = createOpenAIEmbedder({ client, expectedDimensions: 4 });
		const result = await embedder.embedTexts({ texts: ["a", "b", "c"] });
		expect(result.embeddings.map((x) => x.text)).toEqual(["a", "b", "c"]);
	});

	it("embeds one text", async () => {
		const embedder = createOpenAIEmbedder({
			client: createFakeOpenAIClient({ dimensions: 4 }),
			expectedDimensions: 4,
		});
		const result = await embedder.embedText("hello");
		expect(result.text).toBe("hello");
		expect(result.embedding).toHaveLength(4);
	});
});
