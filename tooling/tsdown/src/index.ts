/**
 * Shared tsdown configuration for TekMemo packages.
 *
 * @remarks
 * Provides the base build configuration for all packages.
 * Sets dual ESM + CJS output, Node.js target, and bundling rules.
 *
 * @internal
 */

import { defineConfig, type UserConfig } from "tsdown";

export const baseConfig: UserConfig = {
	entry: "src/index.ts",
	format: ["esm", "cjs"],
	sourcemap: true,
	dts: true,
	clean: true,
	minify: false,
	target: "node22",
	platform: "node",
	fixedExtension: true,
	deps: {
		alwaysBundle: [/^@repo\/utils(?:\/.*)?$/],
	},
};

export function pkgConfig(config: UserConfig = {}) {
	return defineConfig({
		...baseConfig,
		...config,
	});
}
