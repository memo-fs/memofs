import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		worker: "src/worker.ts",
		http: "src/http/index.ts",
		"bin/tekmemo-server": "bin/tekmemo-server.ts",
	},
});
