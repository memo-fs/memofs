import { createFakeExtractor, defineExtractorContractTests } from "../src";

/**
 * Runs the shared {@link MinimalExtractor} contract against the bundled
 * FakeExtractor. The FakeExtractor is the reference implementation for adapter
 * packages — if it can't pass the contract, nothing can.
 */
defineExtractorContractTests({
	name: "FakeExtractor",
	createExtractor() {
		return createFakeExtractor();
	},
});
