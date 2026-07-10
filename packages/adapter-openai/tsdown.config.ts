import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		"testing/index": "src/testing/index.ts",
	},
});
