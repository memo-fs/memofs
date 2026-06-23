/**
 * Shared tsdown configuration for TekMemo packages.
 *
 * @internal
 */

import { defineConfig } from "tsdown";

export const baseConfig = {
	entry: "src/index.ts",
	format: ["esm", "cjs"],
	sourcemap: true,
	dts: true,
	clean: true,
	minify: false,
	target: "node20",
	platform: "node",
	fixedExtension: true,
	deps: {
		alwaysBundle: [/^@repo\/utils(?:\/.*)?$/],
	},
};

export function pkgConfig(config = {}) {
	return defineConfig({
		...baseConfig,
		...config,
	});
}
