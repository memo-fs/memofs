import { describe, expect, it } from "vitest";
import {
	adapterImportPaths,
	adapterPackages,
	tekMemoAdapters,
} from "../src/index";

describe("adapter catalog", () => {
	it("lists every first-party adapter reexport", () => {
		expect(adapterPackages).toEqual({
			agentfs: "@tekmemo/agentfs",
			aiSdk: "@tekmemo/ai-sdk",
			cloudClient: "@tekmemo/cloud-client",
			openai: "@tekmemo/openai",
			rerankVoyage: "@tekmemo/rerank-voyage",
			upstashVector: "@tekmemo/upstash-vector",
			voyageai: "@tekmemo/voyageai",
		});
		expect(adapterImportPaths.aiSdk).toBe("@tekmemo/adapters/ai-sdk");
		expect(adapterImportPaths.agentfs).toBe("@tekmemo/adapters/agentfs");
		expect(adapterImportPaths.voyageaiTesting).toBe(
			"@tekmemo/adapters/voyageai/testing",
		);
		expect(tekMemoAdapters).toHaveLength(7);
	});
});
