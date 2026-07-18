import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = {
	"/": [
		{
			text: "Core Runtime",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/packages/core/" },
				{ text: "Core Concepts", link: "/packages/core/concepts" },
				{ text: "Configuration", link: "/packages/core/configuration" },
				{ text: "AgentFS", link: "/packages/core/agentfs" },
				{
					text: "Client API",
					items: [
						{ text: "Constructor", link: "/packages/core/client/" },
						{
							text: "Memory Sub-Paths",
							link: "/packages/core/client/sub-paths",
						},
						{ text: "Recall & Context", link: "/packages/core/client/recall" },
						{ text: "Graph Sub-API", link: "/packages/core/client/graph" },
						{
							text: "Snapshots Sub-API",
							link: "/packages/core/client/snapshots",
						},
						{ text: "AgentFS Sub-API", link: "/packages/core/client/agentfs" },
						{ text: "Sync Sub-API", link: "/packages/core/client/sync" },
						{ text: "Utilities", link: "/packages/core/client/utilities" },
					],
					collapsed: false,
				},
			],
		},
		{
			text: "Self-Hosting",
			collapsed: false,
			items: [
				{
					text: "Server Deployment",
					items: [
						{ text: "Overview", link: "/packages/server/" },
						{ text: "Node.js", link: "/packages/server/node" },
						{ text: "Cloudflare", link: "/packages/server/cloudflare" },
						{ text: "HTTP API", link: "/packages/server/http-api" },
						{ text: "API Reference", link: "/packages/server/api-reference" },
					],
				},
				{ text: "Configure Storage", link: "/configure/storage" },
				{ text: "Configure Intelligence", link: "/configure/intelligence" },
			],
		},
		{
			text: "Adapters",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/packages/adapters/" },
				{ text: "OpenAI", link: "/packages/adapters/openai" },
				{ text: "Voyage AI", link: "/packages/adapters/voyage" },
				{ text: "Transformers.js", link: "/packages/adapters/transformers" },
				{ text: "Workers AI", link: "/packages/adapters/workers-ai" },
				{ text: "Cloudflare R2", link: "/packages/adapters/r2" },
				{ text: "Turso / libSQL", link: "/packages/adapters/turso" },
				{ text: "Vercel AI SDK", link: "/packages/adapters/ai-sdk" },
			],
		},
		{
			text: "Command Line (CLI)",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/packages/cli/" },
				{ text: "Memory Commands", link: "/packages/cli/memory" },
				{ text: "Agent Commands", link: "/packages/cli/agent" },
				{ text: "Generate Commands", link: "/packages/cli/generate" },
				{ text: "Connectors Commands", link: "/packages/cli/connectors" },
				{ text: "Cloud Commands", link: "/packages/cli/cloud" },
				{ text: "Config Commands", link: "/packages/cli/config" },
			],
		},
		{
			text: "Model Context Protocol (MCP)",
			collapsed: false,
			items: [{ text: "MCP Server", link: "/packages/mcp/" }],
		},
		{
			text: "Connectors",
			items: [{ text: "Connectors Framework", link: "/packages/connectors/" }],
		},
		{
			text: "Developer Tooling",
			collapsed: false,
			items: [
				{ text: "JSON-RPC Primitives", link: "/packages/json-rpc" },
				{ text: "Testing Framework", link: "/packages/testing" },
				{ text: "Benchmark Kit", link: "/packages/benchmark-kit" },
			],
		},
	],
	"/blog/": [
		{
			text: "Blog",
			items: [],
			collapsed: false,
		},
	],
	"/api/": [
		{
			text: "API Reference",
			items: [
				{ text: "Overview", link: "/api/" },
				{ text: "@memofs/core", link: "/api/core" },
				{ text: "@memofs/server", link: "/api/server" },
				{ text: "@memofs/mcp-server", link: "/api/mcp-server" },
				{ text: "@memofs/connectors", link: "/api/connectors" },
			],
		},
	],
};
