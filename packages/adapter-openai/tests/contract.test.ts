import { defineEmbedderContractTests } from "@memofs/testing/contracts";
import { createOpenAIEmbedder } from "../src";
import { createFakeOpenAIClient } from "../src/testing";

defineEmbedderContractTests({
	name: "OpenAI",
	createEmbedder: () =>
		createOpenAIEmbedder({
			client: createFakeOpenAIClient({ dimensions: 4 }),
			expectedDimensions: 4,
		}),
	expectedDimensions: 4,
	supportsEmbedText: true,
	rejectsEmptyText: true,
});
