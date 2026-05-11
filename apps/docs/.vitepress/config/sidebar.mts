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
	{ text: "Local testing", link: "/guide/local-testing" },
	{ text: "Production checklist", link: "/guide/production-checklist" },
];

const packages = [
	{ text: "Overview", link: "/packages/" },
	{ text: "tekmemo", link: "/packages/tekmemo" },
	{ text: "@tekmemo/fs", link: "/packages/fs" },
	{ text: "@tekmemo/agentfs", link: "/packages/agentfs" },
	{ text: "@tekmemo/graph", link: "/packages/graph" },
	{ text: "@tekmemo/cloud-client", link: "/packages/cloud-client" },
	{ text: "@tekmemo/cli", link: "/packages/cli" },
	{ text: "@tekmemo/mcp", link: "/packages/mcp" },
	{ text: "@tekmemo/ai-sdk", link: "/packages/ai-sdk" },
	{ text: "@tekmemo/adapters", link: "/packages/adapters" },
	{ text: "@tekmemo/server", link: "/packages/server" },
	{ text: "@tekmemo/recall", link: "/packages/recall" },
	{ text: "Vector adapters", link: "/packages/vector-adapters" },
	{ text: "Reranking", link: "/packages/rerank" },
	{ text: "Provider adapters", link: "/packages/provider-adapters" },
	{ text: "Benchmark kit", link: "/packages/benchmark-kit" },
];

const cli = [
	{ text: "Overview", link: "/cli/" },
	{ text: "Commands", link: "/cli/commands" },
	{ text: "Cloud and hybrid mode", link: "/cli/cloud" },
	{ text: "Agent workflow", link: "/cli/agent-workflow" },
];

const mcp = [
	{ text: "Overview", link: "/mcp/" },
	{ text: "Client setup", link: "/mcp/client-setup" },
	{ text: "Tools", link: "/mcp/tools" },
	{ text: "Runtime modes", link: "/mcp/runtime-modes" },
	{ text: "Security", link: "/mcp/security" },
];

const cloudClient = [
	{ text: "Overview", link: "/cloud-client/" },
	{ text: "Quickstart", link: "/cloud-client/quickstart" },
	{ text: "Routes", link: "/cloud-client/routes" },
	{ text: "Runtime helpers", link: "/cloud-client/runtime" },
	{ text: "Errors", link: "/cloud-client/errors" },
];

const aiSdk = [
	{ text: "Overview", link: "/ai-sdk/" },
	{ text: "Tools", link: "/ai-sdk/tools" },
	{ text: "Agent patterns", link: "/ai-sdk/agent-patterns" },
];

const examples = [
	{ text: "Overview", link: "/examples/" },
	{ text: "Local only", link: "/examples/local-only" },
	{ text: "Graph memory", link: "/examples/graph-memory" },
	{ text: "CLI", link: "/examples/cli" },
	{ text: "MCP", link: "/examples/mcp" },
	{ text: "Cloud client", link: "/examples/cloud-client" },
	{ text: "AI SDK", link: "/examples/ai-sdk" },
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

const reference = [
	{ text: "Overview", link: "/reference/" },
	{ text: "Configuration", link: "/reference/configuration" },
	{ text: "Errors", link: "/reference/errors" },
	{ text: "Glossary", link: "/reference/glossary" },
];

export const sidebar: DefaultTheme.Sidebar = {
	"/guide/": [{ text: "Guide", items: guide }],
	"/packages/": [{ text: "Packages", items: packages }],
	"/cli/": [{ text: "CLI", items: cli }],
	"/mcp/": [{ text: "MCP", items: mcp }],
	"/cloud-client/": [{ text: "Cloud Client", items: cloudClient }],
	"/ai-sdk/": [{ text: "AI SDK", items: aiSdk }],
	"/examples/": [{ text: "Examples", items: examples }],
	"/architecture/": [{ text: "Architecture", items: architecture }],
	"/reference/": [{ text: "Reference", items: reference }],
	"/hosting/": [
		{
			text: "Hosting",
			items: [
				{ text: "Overview", link: "/hosting/" },
				{ text: "Node", link: "/hosting/node" },
				{ text: "Cloudflare Workers", link: "/hosting/cloudflare-workers" },
				{ text: "Vercel", link: "/hosting/vercel" },
				{ text: "Security", link: "/hosting/security" },
			],
		},
	],
};
