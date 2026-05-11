/**
 * Metadata-only entry point for `@tekmemo/adapters`.
 *
 * Runtime adapter implementations are intentionally exposed through subpath
 * exports such as `@tekmemo/adapters/ai-sdk` and
 * `@tekmemo/adapters/voyageai`.
 *
 * This root module does not import provider adapters, so installing the
 * convenience package does not force optional peers such as `ai`, `openai`, or
 * `@upstash/vector` to load unless the matching subpath is imported.
 *
 * @packageDocumentation
 */

export type TekMemoAdapterCategory =
	| "agent-workspace"
	| "ai-sdk"
	| "cloud"
	| "embedding-provider"
	| "rerank-provider"
	| "vector-store";

export interface TekMemoAdapterDescriptor {
	readonly name: string;
	readonly packageName: string;
	readonly importPath: string;
	readonly category: TekMemoAdapterCategory;
	readonly description: string;
	readonly optionalPeerDependencies?: readonly string[];
}

export const adapterPackages = {
	agentfs: "@tekmemo/agentfs",
	aiSdk: "@tekmemo/ai-sdk",
	cloudClient: "@tekmemo/cloud-client",
	openai: "@tekmemo/openai",
	rerankVoyage: "@tekmemo/rerank-voyage",
	upstashVector: "@tekmemo/upstash-vector",
	voyageai: "@tekmemo/voyageai",
} as const;

export const adapterImportPaths = {
	agentfs: "@tekmemo/adapters/agentfs",
	aiSdk: "@tekmemo/adapters/ai-sdk",
	cloudClient: "@tekmemo/adapters/cloud-client",
	openai: "@tekmemo/adapters/openai",
	openaiTesting: "@tekmemo/adapters/openai/testing",
	rerankVoyage: "@tekmemo/adapters/rerank-voyage",
	rerankVoyageTesting: "@tekmemo/adapters/rerank-voyage/testing",
	upstashVector: "@tekmemo/adapters/upstash-vector",
	voyageai: "@tekmemo/adapters/voyageai",
	voyageaiTesting: "@tekmemo/adapters/voyageai/testing",
} as const;

export type TekMemoAdapterName = keyof typeof adapterPackages;
export type TekMemoAdapterImportPath =
	(typeof adapterImportPaths)[keyof typeof adapterImportPaths];

export const tekMemoAdapters = [
	{
		name: "AgentFS",
		packageName: adapterPackages.agentfs,
		importPath: adapterImportPaths.agentfs,
		category: "agent-workspace",
		description:
			"AgentFS session workspaces, checkpoints, and memory extraction for TekMemo agents.",
	},
	{
		name: "AI SDK",
		packageName: adapterPackages.aiSdk,
		importPath: adapterImportPaths.aiSdk,
		category: "ai-sdk",
		description:
			"Vercel AI SDK tools and prompt helpers for scoped TekMemo memory.",
		optionalPeerDependencies: ["ai"],
	},
	{
		name: "Cloud client",
		packageName: adapterPackages.cloudClient,
		importPath: adapterImportPaths.cloudClient,
		category: "cloud",
		description:
			"TekMemo Cloud API client and cloud or hybrid runtime helpers.",
	},
	{
		name: "OpenAI",
		packageName: adapterPackages.openai,
		importPath: adapterImportPaths.openai,
		category: "embedding-provider",
		description: "OpenAI embedding adapter for TekMemo recall pipelines.",
		optionalPeerDependencies: ["openai"],
	},
	{
		name: "VoyageAI",
		packageName: adapterPackages.voyageai,
		importPath: adapterImportPaths.voyageai,
		category: "embedding-provider",
		description: "VoyageAI embedding adapter for TekMemo recall pipelines.",
	},
	{
		name: "Upstash Vector",
		packageName: adapterPackages.upstashVector,
		importPath: adapterImportPaths.upstashVector,
		category: "vector-store",
		description: "Upstash Vector recall adapter for indexed TekMemo memory.",
		optionalPeerDependencies: ["@upstash/vector"],
	},
	{
		name: "VoyageAI rerank",
		packageName: adapterPackages.rerankVoyage,
		importPath: adapterImportPaths.rerankVoyage,
		category: "rerank-provider",
		description: "VoyageAI reranking adapter for recall result ranking.",
	},
] as const satisfies readonly TekMemoAdapterDescriptor[];
