import type { DefaultTheme } from "vitepress";

const guide = [
	{ text: "Overview", link: "/guide/" },
	{ text: "Getting started", link: "/guide/getting-started" },
	{ text: "Installation", link: "/guide/installation" },
	{ text: "Core concepts", link: "/guide/concepts" },
	{ text: "File-first memory", link: "/guide/file-first-memory" },
	{ text: "Memory filesystem", link: "/guide/filesystem-layout" },
	{ text: "Memory records", link: "/guide/memory-records" },
	{ text: "Configuration", link: "/guide/configuration" },
];

const architecture = [
	{ text: "Overview", link: "/architecture/" },
	{ text: "Package boundaries", link: "/architecture/package-boundaries" },
	{ text: "Memory model", link: "/architecture/memory-model" },
	{ text: "Graph memory", link: "/architecture/graph-memory" },
	{ text: "Indexing and recall", link: "/architecture/indexing-recall" },
	{ text: "Sync and events", link: "/architecture/sync-events" },
	{ text: "Security", link: "/architecture/security" },
];

const api = [
	{ text: "Overview", link: "/packages/" },
	{
		text: "Core Runtime (@tekbreed/tekmemo)",
		items: [
			{ text: "Overview & Primitives", link: "/packages/tekmemo" },
			{ text: "Filesystem Store", link: "/packages/fs" },
			{ text: "Agent Filesystem", link: "/packages/agentfs" },
			{ text: "Graph Memory", link: "/packages/graph" },
			{ text: "Recall & Vectors", link: "/packages/vector-adapters" },
			{ text: "Provider Adapters", link: "/packages/provider-adapters" },
			{ text: "Reranking", link: "/packages/rerank" },
			{ text: "Cloud Client", link: "/packages/cloud-client" },
			{ text: "Benchmark Kit", link: "/packages/benchmark-kit" },
		],
	},
	{ text: "CLI (@tekbreed/tekmemo-cli)", link: "/packages/cli" },
	{ text: "MCP Server (@tekbreed/tekmemo-mcp-server)", link: "/packages/mcp" },
];

const agentInterfaces = [
	{ text: "CLI", link: "/cli/" },
	{ text: "MCP", link: "/mcp/" },
	{ text: "AI SDK", link: "/ai-sdk/" },
];

const reference = [
	{ text: "Overview", link: "/reference/" },
	{ text: "Configuration", link: "/reference/configuration" },
	{ text: "Errors", link: "/reference/errors" },
	{ text: "Glossary", link: "/reference/glossary" },
	{ text: "FAQs", link: "/reference/faqs" },
	{
		text: "Changelog",
		link: "https://github.com/tekbreed/oss/blob/main/CHANGELOG.md",
	},
];

export const sidebar: DefaultTheme.Sidebar = {
	"/guide/": [{ text: "Guide", items: guide }],
	"/architecture/": [{ text: "Architecture", items: architecture }],
	"/packages/": [{ text: "API Reference", items: api }],
	"/cli/": [{ text: "Agent Interfaces", items: agentInterfaces }],
	"/mcp/": [{ text: "Agent Interfaces", items: agentInterfaces }],
	"/ai-sdk/": [{ text: "Agent Interfaces", items: agentInterfaces }],
	"/reference/": [{ text: "Reference", items: reference }],
};
