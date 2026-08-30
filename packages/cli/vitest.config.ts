import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			// CLI unit tests must be hermetic. `memofs init` now writes
			// `recall.localEmbeddings: true` into `.memofs/config.json`, so
			// commands that recall (e.g. `context --query`) would lazily load
			// the real ONNX embedder and attempt a model download whenever the
			// adapter happens to be resolvable from the test runner. Force the
			// documented off-switch so recall stays lexical-only under test.
			MEMOFS_LOCAL_EMBEDDINGS: "0",
		},
	},
});
