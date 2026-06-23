import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		"cloud-client": "src/cloud-client/index.ts",
	},
});
