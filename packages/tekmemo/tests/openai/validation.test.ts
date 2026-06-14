import { describe, expect, it } from "vitest";
import {
	assertValidDimensions,
	createOpenAIEmbedder,
	defaultDimensionsForModel,
	expectedVectorLength,
	OpenAIConfigError,
	OpenAIValidationError,
	supportsDimensions,
} from "../../src";
import { createFakeOpenAIClient } from "../../src/openai/testing";

describe("validation", () => {
	it("requires apiKey when no client is provided", () => {
		expect(() => createOpenAIEmbedder({ apiKey: "" })).toThrow(
			OpenAIConfigError,
		);
	});

	it("allows fake client without apiKey", () => {
		expect(() =>
			createOpenAIEmbedder({ client: createFakeOpenAIClient() }),
		).not.toThrow();
	});

	it("rejects empty model", () => {
		expect(() =>
			createOpenAIEmbedder({ client: createFakeOpenAIClient(), model: "" }),
		).toThrow(OpenAIValidationError);
	});

	it("knows model default dimensions", () => {
		expect(defaultDimensionsForModel("text-embedding-3-small")).toBe(1536);
		expect(defaultDimensionsForModel("text-embedding-3-large")).toBe(3072);
		expect(defaultDimensionsForModel("text-embedding-ada-002")).toBe(1536);
	});

	it("supports dimensions only for v3 models", () => {
		expect(supportsDimensions("text-embedding-3-small")).toBe(true);
		expect(supportsDimensions("text-embedding-3-large")).toBe(true);
		expect(supportsDimensions("text-embedding-ada-002")).toBe(false);
	});

	it("validates dimensions", () => {
		expect(() =>
			assertValidDimensions({
				model: "text-embedding-3-small",
				dimensions: 1024,
			}),
		).not.toThrow();
		expect(() =>
			assertValidDimensions({
				model: "text-embedding-3-small",
				dimensions: 999999,
			}),
		).toThrow(OpenAIValidationError);
		expect(() =>
			assertValidDimensions({
				model: "text-embedding-ada-002",
				dimensions: 1024,
			}),
		).toThrow(OpenAIValidationError);
	});

	it("computes expected vector length", () => {
		expect(expectedVectorLength({ model: "text-embedding-3-small" })).toBe(
			1536,
		);
		expect(
			expectedVectorLength({
				model: "text-embedding-3-small",
				dimensions: 512,
			}),
		).toBe(512);
		expect(
			expectedVectorLength({ model: "custom", expectedDimensions: 12 }),
		).toBe(12);
	});
});
