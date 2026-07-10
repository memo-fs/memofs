import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		workloads: "src/workloads/index.ts",
		"testing/fake-targets": "src/testing/fake-targets.ts",
	},
});
