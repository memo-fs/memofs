import { describe, expect, it } from "vitest";
import {
	VoyageRerankConfigError,
	VoyageRerankValidationError,
} from "../../src";
import {
	normalizeMaxDocuments,
	validateModel,
} from "../../src/rerank-voyage/utils/validation";

describe("Voyage rerank validation", () => {
	it("validates model names", () => {
		expect(() => validateModel("rerank-2.5-lite", false)).not.toThrow();
		expect(() => validateModel("unknown", false)).toThrow(
			VoyageRerankValidationError,
		);
		expect(() => validateModel("unknown", true)).not.toThrow();
	});

	it("validates max documents", () => {
		expect(normalizeMaxDocuments(undefined)).toBe(1000);
		expect(() => normalizeMaxDocuments(0)).toThrow(VoyageRerankValidationError);
		expect(() => normalizeMaxDocuments(1001)).toThrow(
			VoyageRerankValidationError,
		);
	});

	it("requires api key if no client is provided", async () => {
		const { createVoyageReranker } = await import("../../src");
		expect(() => createVoyageReranker({ apiKey: "" })).toThrow(
			VoyageRerankConfigError,
		);
	});
});
