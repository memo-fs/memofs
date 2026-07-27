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
	"/learn/tracks/agent-skills-engineering/": [
		{
			text: "Module 1: Foundations",
			collapsed: false,
			items: [
				{ text: "Lesson 1: Overview", link: "/learn/tracks/agent-skills-engineering/" },
				{ text: "Lesson 2: The Copy-Paste Tax", link: "/learn/tracks/agent-skills-engineering/foundations/copy-paste-tax" },
				{ text: "Lesson 3: Anatomy of a SKILL.md", link: "/learn/tracks/agent-skills-engineering/foundations/anatomy-of-skill" },
			],
		},
		{
			text: "Module 2: Trigger & Workflow Mechanics",
			collapsed: false,
			items: [
				{ text: "Lesson 4: The Description Is the Trigger", link: "/learn/tracks/agent-skills-engineering/trigger-mechanics/description-is-the-trigger" },
				{ text: "Lesson 5: Scripts vs Sentences", link: "/learn/tracks/agent-skills-engineering/trigger-mechanics/scripts-vs-sentences" },
				{ text: "Lesson 6: Leashing the Skill", link: "/learn/tracks/agent-skills-engineering/trigger-mechanics/leashing-the-skill" },
			],
		},
		{
			text: "Module 3: Architecture & Governance",
			collapsed: false,
			items: [
				{ text: "Lesson 7: Skill, Hook, Subagent, or CLAUDE.md?", link: "/learn/tracks/agent-skills-engineering/architecture/skill-hook-subagent" },
				{ text: "Lesson 8: Isolated Expert to Team Standard", link: "/learn/tracks/agent-skills-engineering/architecture/team-standard" },
			],
		},
		{
			text: "Module 4: Org Deployment & Diagnostics",
			collapsed: false,
			items: [
				{ text: "Lesson 9: Repo to Org", link: "/learn/tracks/agent-skills-engineering/deployment/repo-to-org" },
				{ text: "Lesson 10: Reading the Failure", link: "/learn/tracks/agent-skills-engineering/deployment/reading-the-failure" },
			],
		},
	],
	"/learn/tracks/ai-behavior-diagnostic-model/": [
		{
			text: "Module 1: Core Mechanics",
			collapsed: false,
			items: [
				{ text: "Lesson 1: Overview", link: "/learn/tracks/ai-behavior-diagnostic-model/" },
				{ text: "Lesson 2: The Confidence Trap", link: "/learn/tracks/ai-behavior-diagnostic-model/core-mechanics/confidence-trap" },
				{ text: "Lesson 3: Next Token Prediction", link: "/learn/tracks/ai-behavior-diagnostic-model/core-mechanics/next-token-prediction" },
			],
		},
		{
			text: "Module 2: Knowledge & Memory Limits",
			collapsed: false,
			items: [
				{ text: "Lesson 4: The Edge of Knowledge", link: "/learn/tracks/ai-behavior-diagnostic-model/knowledge-and-limits/edge-of-knowledge" },
				{ text: "Lesson 5: The Size of the Desk", link: "/learn/tracks/ai-behavior-diagnostic-model/knowledge-and-limits/size-of-desk" },
			],
		},
		{
			text: "Module 3: Steerability & Troubleshooting",
			collapsed: false,
			items: [
				{ text: "Lesson 6: The Leash, Not the Switch", link: "/learn/tracks/ai-behavior-diagnostic-model/steerability-and-troubleshooting/leash-not-switch" },
				{ text: "Lesson 7: Reading the Failure", link: "/learn/tracks/ai-behavior-diagnostic-model/steerability-and-troubleshooting/reading-the-failure" },
			],
		},
	],
	"/learn/tracks/ai-memory-architectures/": [
		{
			text: "Module 1: Foundations & Indexing",
			collapsed: false,
			items: [
				{ text: "Lesson 1: The Limits of Context Windows", link: "/learn/tracks/ai-memory-architectures/" },
				{ text: "Lesson 2: Vector Search & Embedding Retrieval", link: "/learn/tracks/ai-memory-architectures/foundations-and-indexing/vector-search-retrieval" },
			],
		},
		{
			text: "Module 2: Graph Persistence & State Pipelines",
			collapsed: false,
			items: [
				{ text: "Lesson 3: Hierarchical Graph Memory", link: "/learn/tracks/ai-memory-architectures/graph-persistence-and-state/hierarchical-graph-memory" },
				{ text: "Lesson 4: MemoFS Stateful Memory Pipelines", link: "/learn/tracks/ai-memory-architectures/graph-persistence-and-state/memofs-stateful-pipelines" },
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
