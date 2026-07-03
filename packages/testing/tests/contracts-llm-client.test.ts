import { createFakeLlmClient, defineLlmClientContractTests } from "../src";

/**
 * Runs the shared {@link MinimalLlmClient} contract against the bundled
 * FakeLlmClient. The FakeLlmClient is the reference implementation for adapter
 * packages — if it can't pass the contract, nothing can. Its resolver returns
 * JSON matching the requested schema so the structured-output assertion holds.
 */
defineLlmClientContractTests({
	name: "FakeLlmClient",
	createClient() {
		return createFakeLlmClient({
			resolveText: (input) =>
				input.schema === undefined
					? `rewrite: ${input.user}`
					: JSON.stringify({ query: `rewrite: ${input.user}` }),
		});
	},
});
