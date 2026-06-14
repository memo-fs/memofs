import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		"bin/tekmemo-mcp": "src/bin/tekmemo-mcp.ts",
	},
});
