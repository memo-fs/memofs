import { defineEmbedderContractTests } from "@repo/test-utils/contracts";
import { createOpenAIEmbedder } from "../../src";
import { createFakeOpenAIClient } from "../../src/openai/testing";

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
