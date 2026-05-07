import { createVitestConfig } from "@repo/test-utils/vitest";

export default createVitestConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		coverage: {
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
		},
	},
});
