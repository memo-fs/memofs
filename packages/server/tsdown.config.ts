import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: ["src/index.ts", "src/node/index.ts"],
	treeshake: true,
});
