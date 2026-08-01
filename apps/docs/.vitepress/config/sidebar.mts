import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = {
	"/introduction": [
		{
			// text: "API Reference",
			items: [
				{ text: "Cookbooks", link: "/learn/cookbooks/" },
				{ text: "Blog", link: "/blog/" },
				{ text: "Tracks", link: "/learn/tracks/" },
				{ text: "Core Runtime & SDK", link: "/packages/core/" },
				{ text: "Self-Hosting", link: "/packages/server/" },
				{ text: "Adapters", link: "/packages/adapters/" },
				{ text: "Command Line (CLI)", link: "/packages/cli/" },
				{ text: "Model Context Protocol (MCP)", link: "/packages/mcp/" },
				{ text: "Connectors", link: "/packages/connectors/" },
				{ text: "API Reference", link: "/api/" },
			],
		},
	],
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
					text: "Client API & SDK",
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
				{ text: "Overview", link: "/packages/server/" },
				{ text: "Node.js", link: "/packages/server/node" },
				{ text: "Cloudflare", link: "/packages/server/cloudflare" },
				{ text: "HTTP API", link: "/packages/server/http-api" },
				{ text: "Configure Storage", link: "/configure/storage" },
				{ text: "Configure Intelligence", link: "/configure/intelligence" },
				{ text: "API Reference", link: "/packages/server/api-reference" },
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
			items: [
				{ text: "Local mode", link: "/packages/mcp/" },
				{ text: "Hybrid mode", link: "/packages/mcp/hybrid-mode" },
				{
					text: "Hosted MCP Endpoint",
					link: "/packages/mcp/hosted-mcp-endpoint",
				},
			],
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
	"/blog/": [],
	"/learn/cookbooks/": [],
	"/cookbooks/": [],
	"/learn/tracks/": [],
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
