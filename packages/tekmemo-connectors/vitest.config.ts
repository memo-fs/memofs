import { createVitestConfig } from "@tekbreed/tekmemo-testing/vitest";

export default createVitestConfig({
	test: {
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
});
