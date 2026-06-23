import type { UserConfig } from "tsdown";

export declare const baseConfig: UserConfig;

export declare function pkgConfig(
	config?: UserConfig,
): ReturnType<typeof import("tsdown").defineConfig>;
