import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: [
		"src/index.ts",
		"src/stdio/index.ts",
		"src/sdk/index.ts",
		"src/runtime/local.ts",
		"src/runtime/cloud.ts",
		"src/runtime/hybrid.ts",
		"src/runtime/factory.ts",
		"src/bin/tekmemo-mcp.ts",
	],
});
