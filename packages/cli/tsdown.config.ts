import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: ["src/index.ts", "src/bin/tekmemo.ts", "src/testing/index.ts"],
});
