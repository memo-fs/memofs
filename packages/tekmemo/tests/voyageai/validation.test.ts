import { describe, expect, it } from "vitest";
import {
	assertValidOutputDimension,
	createVoyageEmbedder,
	expectedVectorLength,
	VoyageConfigError,
	VoyageValidationError,
} from "../../src/voyageai";
import { createFakeVoyageClient } from "../../src/voyageai/testing";

describe("validation", () => {
	it("requires apiKey when no client is provided", () => {
		expect(() => createVoyageEmbedder({ apiKey: "" })).toThrow(
			VoyageConfigError,
		);
	});

	it("allows fake client without apiKey", () => {
		expect(() =>
			createVoyageEmbedder({ client: createFakeVoyageClient() }),
		).not.toThrow();
	});

	it("rejects empty model", () => {
		expect(() =>
			createVoyageEmbedder({ client: createFakeVoyageClient(), model: "" }),
		).toThrow(VoyageValidationError);
	});

	it("validates flexible dimensions", () => {
		expect(() =>
			assertValidOutputDimension({
				model: "voyage-4-lite",
				outputDimension: 1024,
			}),
		).not.toThrow();
		expect(() =>
			assertValidOutputDimension({
				model: "voyage-4-lite",
				outputDimension: 123,
			}),
		).toThrow(VoyageValidationError);
	});

	it("rejects outputDimension for known fixed-dimension models", () => {
		expect(() =>
			assertValidOutputDimension({
				model: "voyage-finance-2",
				outputDimension: 1024,
			}),
		).toThrow(VoyageValidationError);
	});

	it("computes binary vector length", () => {
		expect(
			expectedVectorLength({ outputDimension: 1024, outputDtype: "binary" }),
		).toBe(128);
		expect(
			expectedVectorLength({ outputDimension: 1024, outputDtype: "float" }),
		).toBe(1024);
	});
});
