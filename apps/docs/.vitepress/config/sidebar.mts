import type { DefaultTheme } from "vitepress";

const tekmemo = [
	{ text: "Overview", link: "/packages/tekmemo/" },
	{ text: "Getting started", link: "/packages/tekmemo/getting-started" },
	{ text: "Installation", link: "/packages/tekmemo/installation" },
	{ text: "Core concepts", link: "/packages/tekmemo/concepts" },
	{ text: "File-first memory", link: "/packages/tekmemo/file-first-memory" },
	{ text: "Memory filesystem", link: "/packages/tekmemo/filesystem-layout" },
	{ text: "Memory records", link: "/packages/tekmemo/memory-records" },
	{ text: "Configuration", link: "/packages/tekmemo/configuration" },

	{
		text: "Architecture",
		items: [
			{ text: "Overview", link: "/packages/tekmemo/architecture/" },
			{
				text: "Package boundaries",
				link: "/packages/tekmemo/architecture/package-boundaries",
			},
			{
				text: "Memory model",
				link: "/packages/tekmemo/architecture/memory-model",
			},
			{
				text: "Graph memory",
				link: "/packages/tekmemo/architecture/graph-memory",
			},
			{
				text: "Indexing and recall",
				link: "/packages/tekmemo/architecture/indexing-recall",
			},
			{
				text: "Sync and events",
				link: "/packages/tekmemo/architecture/sync-events",
			},
			{ text: "Security", link: "/packages/tekmemo/architecture/security" },
		],
	},
	{
		text: "Cloud client",
		link: "/packages/tekmemo/cloud-client",
	},
];

const tekmemoCli = [
	{ text: "Getting started", link: "/packages/cli/" },
	{ text: "Local commands", link: "/packages/cli/local-commands" },
	{ text: "Cloud commands", link: "/packages/cli/cloud-commands" },
	{ text: "Agent workflow", link: "/packages/cli/agent-workflow" },
];
const tekmemoMcp = [
	{ text: "Getting started", link: "/packages/mcp/" },
	{ text: "Client Setup", link: "/packages/mcp/client-setup" },
	{ text: "Runtime modes", link: "/packages/mcp/runtime-modes" },
	{ text: "Tools", link: "/packages/mcp/tools" },
	{ text: "Resources", link: "/packages/mcp/resources" },
	{ text: "Prompts", link: "/packages/mcp/prompts" },
	{ text: "Security", link: "/packages/mcp/security" },
];

const tekMemoApi = [
	{ text: "Overview", link: "/api/tekmemo/" },
	{
		text: "Core Runtime (@tekbreed/tekmemo)",
		items: [
			{ text: "Filesystem Store", link: "/api/tekmemo/fs" },
			{ text: "Agent Filesystem", link: "/api/tekmemo/agentfs" },
			{ text: "Graph Memory", link: "/api/tekmemo/graph" },
			{ text: "Recall", link: "/api/tekmemo/recall" },
			{ text: "Recall & Vectors", link: "/api/tekmemo/vector-adapters" },
			{ text: "Provider Adapters", link: "/api/tekmemo/provider-adapters" },
			{ text: "Reranking", link: "/api/tekmemo/rerank" },
			{ text: "Cloud client", link: "/api/tekmemo/cloud-client" },
			{ text: "Benchmark Kit", link: "/api/tekmemo/benchmark-kit" },
		],
	},
	// { text: "CLI (@tekbreed/tekmemo-cli)", link: "/api/cli/" },
	// { text: "MCP Server (@tekbreed/tekmemo-mcp-server)", link: "/api/mcp/" },
];

const tekmemoReference = [
	{ text: "Overview", link: "/reference/tekmemo/" },
	{ text: "Configuration", link: "/reference/tekmemo/configuration" },
	{ text: "Errors", link: "/reference/tekmemo/errors" },
	{ text: "Glossary", link: "/reference/tekmemo/glossary" },
	{ text: "FAQs", link: "/reference/tekmemo/faqs" },
	{
		text: "Changelog",
		link: "https://github.com/tekbreed/oss/blob/main/CHANGELOG.md",
	},
];

export const sidebar: DefaultTheme.Sidebar = {
	"/packages/tekmemo/": [{ text: "TekMemo", items: tekmemo }],
	"/packages/cli/": [{ text: "TekMemo CLI", items: tekmemoCli }],
	"/packages/mcp/": [{ text: "TekMemo MCP", items: tekmemoMcp }],
	"/api/tekmemo/": [{ text: "TekMemo API", items: tekMemoApi }],
	"/reference/tekmemo/": [
		{ text: "TekMemo Reference", items: tekmemoReference },
	],
};
