import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		http: "src/http/index.ts",
		"bin/memofs-mcp": "src/bin/memofs-mcp.ts",
	},
});
