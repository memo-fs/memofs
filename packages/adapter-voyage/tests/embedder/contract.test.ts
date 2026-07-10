import { defineEmbedderContractTests } from "@memofs/testing/contracts";
import { createVoyageEmbedder } from "../../src";
import { createFakeVoyageClient } from "../../src/embedder/testing";

defineEmbedderContractTests({
	name: "Voyage",
	createEmbedder: () =>
		createVoyageEmbedder({
			client: createFakeVoyageClient({ dimensions: 4 }),
			expectedDimensions: 4,
		}),
	expectedDimensions: 4,
	supportsEmbedText: true,
	rejectsEmptyText: true,
});
