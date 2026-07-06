import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		"bin/memofs": "src/bin/memofs.ts",
	},
});
