import { describe, expect, it } from "vitest";
import { createOpenAIEmbedder } from "../src";
import { createFakeOpenAIClient } from "../src/testing";

describe("batching", () => {
	it("splits requests by batchSize and preserves original ordering", async () => {
		const client = createFakeOpenAIClient({ dimensions: 4 });
		const embedder = createOpenAIEmbedder({
			client,
			model: "text-embedding-3-small",
			batchSize: 2,
			expectedDimensions: 4,
		});

		const result = await embedder.embedTexts({
			texts: ["one", "two", "three", "four", "five"],
		});

		expect(client.requests).toHaveLength(3);
		expect(client.requests.map((request) => request.input.length)).toEqual([
			2, 2, 1,
		]);
		expect(result.embeddings.map((embedding) => embedding.text)).toEqual([
			"one",
			"two",
			"three",
			"four",
			"five",
		]);
		expect(result.embeddings.map((embedding) => embedding.index)).toEqual([
			0, 1, 2, 3, 4,
		]);
	});

	it("rejects invalid batchSize", async () => {
		const embedder = createOpenAIEmbedder({ client: createFakeOpenAIClient() });

		await expect(
			embedder.embedTexts({ texts: ["hello"], batchSize: 0 }),
		).rejects.toThrow();
		await expect(
			embedder.embedTexts({ texts: ["hello"], batchSize: 2049 }),
		).rejects.toThrow();
	});
});
