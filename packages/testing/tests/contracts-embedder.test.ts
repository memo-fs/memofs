import { createFakeEmbedder, defineEmbedderContractTests } from "../src";

defineEmbedderContractTests({
	name: "FakeEmbedder",
	expectedDimensions: 3,
	rejectsEmptyText: false,
	createEmbedder() {
		return createFakeEmbedder({ dimensions: 3 });
	},
});
