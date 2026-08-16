import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = {
	"/": [
		{
			text: "Core Runtime & SDK",
			collapsed: false,
			items: [
				{ text: "Get Started", link: "/introduction" },
				{ text: "Overview", link: "/core/" },
				{ text: "Core Concepts", link: "/core/concepts" },
				{ text: "Configuration", link: "/core/configuration" },
				{ text: "Memory", link: "/core/memory" },
				{ text: "Recall & Context", link: "/core/recall" },
				{ text: "Graph", link: "/core/graph" },
				{ text: "Snapshots", link: "/core/snapshots" },
				{ text: "AgentFS", link: "/core/agentfs" },
				{ text: "Cloud Sync", link: "/core/sync" },
				{ text: "Utilities", link: "/core/utilities" },
				{ text: "Reference", link: "/core/reference" },
			],
		},
		{
			text: "Self-Hosting",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/server/" },
				{ text: "Node.js", link: "/server/node" },
				{ text: "Cloudflare", link: "/server/cloudflare" },
				{ text: "HTTP API", link: "/server/http-api" },
				{ text: "Configure Storage", link: "/server/storage" },
				{ text: "Configure Intelligence", link: "/server/intelligence" },
				{ text: "API Reference", link: "/server/api-reference" },
			],
		},
		{
			text: "Adapters",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/adapters/" },
				{ text: "OpenAI", link: "/adapters/openai" },
				{ text: "Voyage AI", link: "/adapters/voyage" },
				{ text: "Transformers.js", link: "/adapters/transformers" },
				{ text: "Workers AI", link: "/adapters/workers-ai" },
				{ text: "Cloudflare R2", link: "/adapters/r2" },
				{ text: "Turso / libSQL", link: "/adapters/turso" },
				{ text: "Vercel AI SDK", link: "/adapters/ai-sdk" },
			],
		},
		{
			text: "Command Line (CLI)",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/cli/" },
				{ text: "Memory Commands", link: "/cli/memory" },
				{ text: "Agent Commands", link: "/cli/agent" },
				{ text: "Generate Commands", link: "/cli/generate" },
				{ text: "Connectors Commands", link: "/cli/connectors" },
				{ text: "Cloud Commands", link: "/cli/cloud" },
				{ text: "Config Commands", link: "/cli/config" },
			],
		},
		{
			text: "Model Context Protocol (MCP)",
			collapsed: false,
			items: [
				{ text: "Local mode", link: "/mcp/" },
				{ text: "Hybrid mode", link: "/mcp/hybrid-mode" },
				{
					text: "Hosted MCP Endpoint",
					link: "/mcp/hosted-mcp-endpoint",
				},
			],
		},
		{
			text: "Connectors",
			collapsed: false,
			items: [
				{ text: "Framework", link: "/connectors/" },
				{
					text: "Built-In Connectors",
					link: "/connectors/built-in-connectors",
				},
				{
					text: "Custom Connectors",
					link: "/connectors/custom-connectors",
				},
			],
		},
		{
			text: "Developer Tooling",
			collapsed: false,
			items: [
				{ text: "JSON-RPC Primitives", link: "/tooling/json-rpc" },
				{ text: "Testing Framework", link: "/tooling/testing" },
				{ text: "Benchmark Kit", link: "/tooling/benchmark-kit" },
			],
		},
	],
	"/learn/cookbooks/": [],
	"/cookbooks/": [],
	"/learn/tracks/": [],
	"/api/": [
		{
			text: "API Reference",
			items: [
				{ text: "Overview", link: "/api/" },
				{ text: "@memofs/core", link: "/api/core" },
				{ text: "@memofs/cli", link: "/api/cli" },
				{ text: "@memofs/server", link: "/api/server" },
				{ text: "@memofs/mcp-server", link: "/api/mcp-server" },
				{ text: "@memofs/connectors", link: "/api/connectors" },
			],
		},
	],
};
