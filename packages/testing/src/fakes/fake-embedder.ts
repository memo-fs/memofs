import { createVector } from "../fixtures/embedding-fixtures";
import type { MinimalEmbedder } from "../types/contracts";

export class FakeEmbedder implements MinimalEmbedder {
	readonly dimensions: number;
	readonly calls: Array<{
		texts: string[];
		inputType?: "query" | "document" | null;
	}> = [];

	constructor(options?: { dimensions?: number }) {
		this.dimensions = options?.dimensions ?? 3;
	}

	async embedTexts(input: {
		texts: string[];
		inputType?: "query" | "document" | null;
	}): Promise<{
		embeddings: Array<{
			text: string;
			embedding: number[];
			index: number;
			dimensions: number;
		}>;
		model: string;
	}> {
		this.calls.push({
			texts: [...input.texts],
			...(input.inputType !== undefined ? { inputType: input.inputType } : {}),
		});

		return {
			model: "fake-embedder",
			embeddings: input.texts.map((text, index) => ({
				text,
				index,
				dimensions: this.dimensions,
				embedding: createVector(this.dimensions, text.length + index),
			})),
		};
	}

	async embedText(
		text: string,
		options?: { inputType?: "query" | "document" | null },
	) {
		const result = await this.embedTexts({
			texts: [text],
			...(options?.inputType !== undefined
				? { inputType: options.inputType }
				: {}),
		});

		const first = result.embeddings[0];
		if (!first) throw new Error("FakeEmbedder produced no embedding.");
		return first;
	}
}

export function createFakeEmbedder(options?: {
	dimensions?: number;
}): FakeEmbedder {
	return new FakeEmbedder(options);
}
