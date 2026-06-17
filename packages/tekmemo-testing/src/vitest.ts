import { defineConfig, type ViteUserConfig } from "vitest/config";

const baseConfig: ViteUserConfig = {
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
};

export function createVitestConfig(overrides?: ViteUserConfig): ViteUserConfig {
	return defineConfig({
		...baseConfig,
		...overrides,
		test: {
			...baseConfig.test,
			...overrides?.test,
		},
	});
}
