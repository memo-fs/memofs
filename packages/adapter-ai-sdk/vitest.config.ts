import { createVitestConfig } from "@memofs/testing/vitest";

export default createVitestConfig({
	test: {
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
});
