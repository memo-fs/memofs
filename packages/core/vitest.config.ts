import { fileURLToPath } from "node:url";
import { createVitestConfig } from "@memofs/testing/vitest";

export default createVitestConfig({
	resolve: {
		alias: {
			"@memofs/core": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
		},
	},
	test: {
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
});
