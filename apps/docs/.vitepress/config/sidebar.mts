import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = {
	"/": [
		{
			text: "Core Runtime",
			items: [
				{ text: "Overview", link: "/packages/core/" },
				{ text: "Core Concepts", link: "/packages/core/concepts" },
				{ text: "Configuration", link: "/packages/core/configuration" },
				{ text: "Client API", link: "/packages/core/client" },
				{ text: "AgentFS", link: "/packages/core/agentfs" },
			],
		},
		{
			text: "Self-Hosting",
			items: [
				{ text: "Server Deployment", link: "/packages/server/" },
				{ text: "Configure Storage", link: "/configure/storage" },
				{ text: "Configure Intelligence", link: "/configure/intelligence" },
			],
		},
		{
			text: "Adapters",
			// collapsed: true,
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
			items: [{ text: "Overview & Commands", link: "/packages/cli/" }],
		},
		{
			text: "Model Context Protocol (MCP)",
			items: [{ text: "MCP Server", link: "/packages/mcp/" }],
		},
		{
			text: "Connectors",
			items: [{ text: "Connectors Framework", link: "/packages/connectors/" }],
		},
		{
			text: "Developer Tooling",
			items: [
				{ text: "JSON-RPC Primitives", link: "/packages/json-rpc" },
				{ text: "Testing Framework", link: "/packages/testing" },
				{ text: "Benchmark Kit", link: "/packages/benchmark-kit" },
			],
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
