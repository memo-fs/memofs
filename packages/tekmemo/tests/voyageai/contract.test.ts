import { defineEmbedderContractTests } from "@repo/test-utils/contracts";
import { createVoyageEmbedder } from "../../src";
import { createFakeVoyageClient } from "../../src/voyageai/testing";

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
