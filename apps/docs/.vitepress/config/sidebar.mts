import type { DefaultTheme } from "vitepress";

const tekmemo = [
	// ── Introduction ──
	{ text: "Overview", link: "/packages/tekmemo/" },
	{ text: "Core concepts", link: "/packages/tekmemo/concepts" },

	// ── Getting started ──
	{ text: "Getting started", link: "/packages/tekmemo/getting-started" },
	{ text: "Installation", link: "/packages/tekmemo/installation" },

	// ── Guides ──
	{ text: "Configuration", link: "/packages/tekmemo/configuration" },
	{ text: "File-first memory", link: "/packages/tekmemo/file-first-memory" },
	{ text: "The `Tekmemo` client", link: "/packages/tekmemo/client" },
	{ text: "Memory records", link: "/packages/tekmemo/memory-records" },
	{ text: "Memory filesystem", link: "/packages/tekmemo/filesystem-layout" },
	{ text: "Memory intelligence", link: "/packages/tekmemo/intelligence" },

	// ── Integrations ──
	{
		text: "AI SDK",
		collapsed: true,
		items: [
			{ text: "Overview", link: "/packages/tekmemo/ai-sdk/" },
			{ text: "Tools", link: "/packages/tekmemo/ai-sdk/tools" },
			{
				text: "Agent patterns",
				link: "/packages/tekmemo/ai-sdk/agent-patterns",
			},
		],
	},
	{ text: "Cloud client", link: "/packages/tekmemo/cloud-client" },
	{ text: "Connectors", link: "/packages/tekmemo/connectors" },

	// ── Architecture ──
	{
		text: "Architecture",
		collapsed: true,
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

	// ── Reference ──
	{
		text: "Production checklist",
		link: "/packages/tekmemo/production-checklist",
	},
	{ text: "Errors", link: "/packages/tekmemo/errors" },
	{ text: "FAQ", link: "/packages/tekmemo/faq" },
];

const tekmemoCli = [
	{ text: "Getting started", link: "/packages/cli/" },
	{ text: "Local commands", link: "/packages/cli/local-commands" },
	{ text: "Cloud commands", link: "/packages/cli/cloud-commands" },
	{ text: "Agent workflow", link: "/packages/cli/agent-workflow" },
	{ text: "Generate agent rules", link: "/packages/cli/generate-agent-rules" },
];
const tekmemoMcp = [
	// ── Getting started ──
	{ text: "Getting started", link: "/packages/mcp/" },
	{ text: "Client Setup", link: "/packages/mcp/client-setup" },
	{ text: "Hosted MCP", link: "/packages/mcp/hosted" },
	// ── Guides ──
	{ text: "Runtime modes", link: "/packages/mcp/runtime-modes" },
	// ── Reference ──
	{ text: "Tools", link: "/packages/mcp/tools" },
	{ text: "Resources", link: "/packages/mcp/resources" },
	{ text: "Prompts", link: "/packages/mcp/prompts" },
	{ text: "Security", link: "/packages/mcp/security" },
];

const tekMemoApi = [
	{ text: "Overview", link: "/api/tekmemo/" },
	{ text: "`Tekmemo` class", link: "/api/tekmemo/tekmemo" },
	{
		text: "Integrations",
		collapsed: true,
		items: [
			{ text: "AI SDK", link: "/api/tekmemo/ai-sdk" },
			{ text: "Cloud client", link: "/api/tekmemo/cloud-client" },
		],
	},
	{
		text: "Modules",
		collapsed: true,
		items: [
			{ text: "Core Primitives", link: "/api/tekmemo/core" },
			{ text: "Filesystem Store", link: "/api/tekmemo/fs" },
			{ text: "Agent Filesystem", link: "/api/tekmemo/agentfs" },
			{ text: "Graph Memory", link: "/api/tekmemo/graph" },
			{ text: "Recall", link: "/api/tekmemo/recall" },
			{ text: "Reranking", link: "/api/tekmemo/rerank" },
			{ text: "Embedder adapters", link: "/api/tekmemo/provider-adapters" },
			{ text: "Benchmark Kit", link: "/api/tekmemo/benchmark-kit" },
		],
	},
];

const blog = [
	{ text: "Home", link: "/blog/" },
	{
		text: "Posts",
		collapsed: true,
		items: [{ text: "Introducing TekMemo", link: "/blog/introducing-tekmemo" }],
	},
];

const changelog = [
	{ text: "X", link: "https://x.com/tekbreed" },
	{ text: "GitHub Repo", link: "https://github.com/tekbreed/tekmemo" },
];

export const sidebar: DefaultTheme.Sidebar = {
	"/packages/tekmemo/": [{ text: "Core Runtime", items: tekmemo }],
	"/packages/cli/": [{ text: "CLI", items: tekmemoCli }],
	"/packages/mcp/": [{ text: "MCP", items: tekmemoMcp }],
	"/api/tekmemo/": [{ text: "API", items: tekMemoApi }],
	"/blog/": [{ text: "Blog", items: blog }],
	"/changelog": [{ text: "Stay Updated", items: changelog }],
};
