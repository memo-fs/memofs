import { createVitestConfig } from "@tekmemo/testing/vitest";

export default createVitestConfig({
	test: {
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
});
