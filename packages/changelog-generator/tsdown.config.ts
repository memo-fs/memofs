import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: "src/index.ts",
	deps: { onlyBundle: false },
});
