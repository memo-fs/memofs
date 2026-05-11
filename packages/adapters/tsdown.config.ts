import { pkgConfig } from "@repo/tsdown-config";

export default pkgConfig({
	entry: [
		"src/index.ts",
		"src/agentfs/index.ts",
		"src/ai-sdk/index.ts",
		"src/cloud-client/index.ts",
		"src/openai/index.ts",
		"src/openai/testing/index.ts",
		"src/rerank-voyage/index.ts",
		"src/rerank-voyage/testing/index.ts",
		"src/upstash-vector/index.ts",
		"src/voyageai/index.ts",
		"src/voyageai/testing/index.ts",
	],
	treeshake: true,
});
