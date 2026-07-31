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
				{ text: "Configure Storage", link: "/configure/storage" },
				{ text: "Configure Intelligence", link: "/configure/intelligence" },
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
	"/learn/cookbooks/": [
		{
			text: "Popular Agents",
			collapsed: false,
			items: [
				{ text: "Claude Code", link: "/learn/cookbooks/a-claude-code" },
				{ text: "Cursor", link: "/learn/cookbooks/a-cursor" },
				{ text: "Codex", link: "/learn/cookbooks/a-codex" },
				{ text: "OpenCode", link: "/learn/cookbooks/a-opencode" },
			],
		},
		{
			text: "More Agents",
			collapsed: true,
			items: [
				{ text: "Aider", link: "/learn/cookbooks/c-aider" },
				{ text: "Amazon Q", link: "/learn/cookbooks/c-amazon-q" },
				{ text: "Google Antigravity", link: "/learn/cookbooks/b-antigravity" },
				{ text: "Cline", link: "/learn/cookbooks/b-cline" },
				{ text: "Command Code", link: "/learn/cookbooks/b-command-code" },
				{ text: "GitHub Copilot", link: "/learn/cookbooks/b-copilot" },
				{ text: "Gemini CLI", link: "/learn/cookbooks/b-gemini" },
				{ text: "JetBrains AI", link: "/learn/cookbooks/c-jetbrains" },
				{ text: "Kilo Code", link: "/learn/cookbooks/b-kilo-code" },
				{ text: "Windsurf", link: "/learn/cookbooks/b-windsurf" },
				{ text: "Zed AI", link: "/learn/cookbooks/b-zed" },
			],
		},
		{
			text: "Connectors",
			collapsed: false,
			items: [
				{ text: "GitHub Connector", link: "/learn/cookbooks/github-connector" },
				{ text: "Notion Connector", link: "/learn/cookbooks/notion-connector" },
			],
		},
		{
			text: "Cloud & Sync",
			collapsed: false,
			items: [
				{ text: "CLI Sync", link: "/learn/cookbooks/sync" },
				{ text: "Pre-Sync Snapshots & Rollback", link: "/learn/cookbooks/rollback" },
				{ text: "Hosted MCP & HTTP Endpoints", link: "/learn/cookbooks/hosted-mcp" },
			],
		},
	],
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
