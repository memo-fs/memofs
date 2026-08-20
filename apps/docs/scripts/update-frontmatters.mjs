import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, "..");

const METADATA_MAP = {
	"index.md": {
		title: "MemoFS Documentation — File-First Memory for AI Agents",
		description:
			"File-first memory runtime for AI agents. Store decisions as markdown in your repo with local offline execution and cloud sync.",
	},
	"api/index.md": {
		title: "API Reference Overview",
		description:
			"Complete API reference for MemoFS npm packages: @memofs/core, @memofs/server, @memofs/mcp-server, and @memofs/connectors.",
	},
	"api/connectors.md": {
		title: "@memofs/connectors API",
		description:
			"API reference for @memofs/connectors: ingestion pipelines, connector registry, deterministic note ID generation, and third-party sources.",
	},
	"api/core.md": {
		title: "@memofs/core API",
		description:
			"API reference for the central MemoFS client, memory stores, graph engine, snapshot management, and hybrid recall router.",
	},
	"api/mcp-server.md": {
		title: "@memofs/mcp-server API",
		description:
			"API reference for the MemoFS Model Context Protocol server exposing context, recall, remember, and consolidate tools to AI agents.",
	},
	"api/server.md": {
		title: "@memofs/server API",
		description:
			"API reference for @memofs/server: JSON-RPC 2.0 HTTP API, authentication middleware, and self-hosted memory runtime.",
	},
	"server/intelligence.md": {
		title: "Memory Intelligence Configuration",
		description:
			"Configure semantic embeddings, vector stores, graph consolidation, and LLM reranking models for MemoFS.",
	},
	"server/storage.md": {
		title: "Storage Configuration",
		description:
			"Configure filesystem, in-memory, Turso libSQL, Cloudflare R2, and remote S3-compatible blob storage backends for MemoFS.",
	},
	"learn/tracks/index.md": {
		title: "Learning Tracks",
		description:
			"Structured learning tracks to master MemoFS memory runtimes, agent integration, MCP servers, and cloud synchronization.",
	},
	"learn/cookbooks/index.md": {
		title: "MemoFS Cookbooks",
		description:
			"Collection of practical integration recipes for AI coding assistants, autonomous agent frameworks, and custom SDKs.",
	},
	"learn/cookbooks/ai-sdk.md": {
		title: "How to use MemoFS with Vercel AI SDK",
		description:
			"Integrate MemoFS file-first memory with Vercel AI SDK agents and generative UI workflows.",
	},
	"learn/cookbooks/aider.md": {
		title: "How to use MemoFS with Aider",
		description:
			"Connect MemoFS persistent memory to Aider for cross-session coding context and architectural retention.",
	},
	"learn/cookbooks/amazon-q.md": {
		title: "How to use MemoFS with Amazon Q Developer",
		description:
			"Configure Amazon Q Developer with MemoFS file-backed project memory and decision tracking.",
	},
	"learn/cookbooks/antigravity.md": {
		title: "How to use MemoFS with Google AntiGravity",
		description:
			"Connect MemoFS to Google AntiGravity agents for persistent project memory across multi-agent workflows.",
	},
	"learn/cookbooks/claude-code.md": {
		title: "How to use MemoFS with Claude Code",
		description:
			"Connect MemoFS persistent memory to Claude Code via Model Context Protocol (MCP) and SessionStart hooks.",
	},
	"learn/cookbooks/cline.md": {
		title: "How to use MemoFS with Cline",
		description:
			"Configure Cline in VS Code to read and write persistent MemoFS memory via MCP stdio tools.",
	},
	"learn/cookbooks/codex.md": {
		title: "How to use MemoFS with Codex",
		description:
			"Integrate MemoFS memory runtime with Codex CLI and OpenAI developer workflows.",
	},
	"learn/cookbooks/command-code.md": {
		title: "How to use MemoFS with Command Code",
		description:
			"Setup Command Code terminal assistant with file-first MemoFS project memory and recall.",
	},
	"learn/cookbooks/copilot.md": {
		title: "How to use MemoFS with GitHub Copilot",
		description:
			"Enhance GitHub Copilot with MemoFS markdown memory files for improved codebase comprehension.",
	},
	"learn/cookbooks/cursor.md": {
		title: "How to use MemoFS with Cursor",
		description:
			"Configure Cursor IDE with MemoFS Model Context Protocol (MCP) server for instant context recall.",
	},
	"learn/cookbooks/gemini.md": {
		title: "How to use MemoFS with Gemini",
		description:
			"Connect Google Gemini AI agents and SDKs to MemoFS persistent memory stores.",
	},
	"learn/cookbooks/gh-pr-summaries.md": {
		title: "GitHub PR Memory Summaries",
		description:
			"Automate GitHub pull request memory delta summaries and commit tracking with MemoFS Cloud.",
	},
	"learn/cookbooks/github-connector.md": {
		title: "GitHub Ingestion Connector",
		description:
			"Ingest GitHub issues, pull requests, and discussions into local MemoFS memory with the GitHub connector.",
	},
	"learn/cookbooks/hosted-mcp.md": {
		title: "Connecting to Hosted MCP",
		description:
			"Connect AI agents to MemoFS Cloud Hosted MCP Endpoint over HTTPS with API key authentication.",
	},
	"learn/cookbooks/jetbrains.md": {
		title: "How to use MemoFS with JetBrains IDEs",
		description:
			"Configure JetBrains IDEs (IntelliJ, WebStorm, PyCharm) with MemoFS project memory.",
	},
	"learn/cookbooks/kilo-code.md": {
		title: "How to use MemoFS with Kilo Code",
		description:
			"Connect Kilo Code to MemoFS memory runtime for persistent context across terminal coding sessions.",
	},
	"learn/cookbooks/linear-connector.md": {
		title: "Linear Ingestion Connector",
		description:
			"Ingest Linear issues, project roadmaps, and cycle updates into MemoFS memory files.",
	},
	"learn/cookbooks/memory-intelligence.md": {
		title: "Configuring Memory Intelligence",
		description:
			"Enable vector embeddings, semantic search, and entity graph consolidation in MemoFS.",
	},
	"learn/cookbooks/notion-connector.md": {
		title: "Notion Ingestion Connector",
		description:
			"Ingest Notion workspace pages and databases into structured MemoFS markdown memory files.",
	},
	"learn/cookbooks/opencode.md": {
		title: "How to use MemoFS with OpenCode",
		description:
			"Configure OpenCode autonomous terminal agent with MemoFS file-first memory.",
	},
	"learn/cookbooks/org-core-memory.md": {
		title: "Organization Core Memory Alignment",
		description:
			"Align development teams with organization-level core memory rules and shared architectural invariants.",
	},
	"learn/cookbooks/rollback.md": {
		title: "Pre-Sync Snapshots and Rollback",
		description:
			"Create pre-sync memory checkpoints and execute 1-click rollbacks using MemoFS snapshots.",
	},
	"learn/cookbooks/sync.md": {
		title: "Multi-Device Memory Sync",
		description:
			"Synchronize .memofs/ directory across workstations, laptops, and CI/CD runners using MemoFS Cloud.",
	},
	"learn/cookbooks/webhooks.md": {
		title: "Real-Time Memory Webhooks",
		description:
			"Receive real-time signed HMAC HTTP POST webhooks on MemoFS memory write and consolidation events.",
	},
	"learn/cookbooks/windsurf.md": {
		title: "How to use MemoFS with Windsurf",
		description:
			"Configure Codeium Windsurf IDE with MemoFS MCP server for persistent coding agent context.",
	},
	"learn/cookbooks/zed.md": {
		title: "How to use MemoFS with Zed",
		description:
			"Configure Zed editor assistant with MemoFS memory tools and workspace context.",
	},
	"adapters/index.md": {
		title: "Adapters Overview",
		description:
			"Overview of storage and embedding adapters for MemoFS: OpenAI, Voyage, Turso, Cloudflare Workers AI, R2.",
	},
	"adapters/ai-sdk.md": {
		title: "@memofs/adapters/ai-sdk",
		description:
			"Vercel AI SDK adapter for MemoFS embedding generation and agent tool integration.",
	},
	"adapters/openai.md": {
		title: "@memofs/adapters/openai",
		description:
			"OpenAI embeddings adapter for MemoFS vector search and semantic recall.",
	},
	"adapters/r2.md": {
		title: "@memofs/adapters/r2",
		description:
			"Cloudflare R2 object storage adapter for remote blob replication and snapshot storage in MemoFS.",
	},
	"adapters/transformers.md": {
		title: "@memofs/adapters/transformers",
		description:
			"Local HuggingFace Transformers embedding adapter for 100% offline semantic recall in MemoFS.",
	},
	"adapters/turso.md": {
		title: "@memofs/adapters/turso",
		description:
			"Turso libSQL database adapter for vector indexing and distributed SQLite storage in MemoFS.",
	},
	"adapters/voyage.md": {
		title: "@memofs/adapters/voyage",
		description:
			"Voyage AI embeddings adapter for high-precision code and document recall in MemoFS.",
	},
	"adapters/workers-ai.md": {
		title: "@memofs/adapters/workers-ai",
		description:
			"Cloudflare Workers AI embedding adapter for serverless edge inference in MemoFS.",
	},
	"tooling/benchmark-kit.md": {
		title: "@memofs/benchmark-kit",
		description:
			"Benchmarking suite and profiling harness for measuring MemoFS memory latency, throughput, and recall quality.",
	},
	"cli/index.md": {
		title: "@memofs/cli Overview",
		description:
			"Command-line interface (@memofs/cli) reference for initializing, syncing, and managing agent memory.",
	},
	"cli/agent.md": {
		title: "CLI Agent Commands",
		description:
			"CLI commands for generating agent configurations, MCP configs, rules, and lifecycle hooks.",
	},
	"cli/cloud.md": {
		title: "CLI Cloud Commands",
		description:
			"CLI commands for authenticating, linking, pushing, and pulling project memory with MemoFS Cloud.",
	},
	"cli/config.md": {
		title: "CLI Config Commands",
		description:
			"CLI commands for inspecting and modifying local .memofs/ configuration settings.",
	},
	"cli/connectors.md": {
		title: "CLI Connector Commands",
		description:
			"CLI commands for configuring and running data ingestion connectors (GitHub, Notion).",
	},
	"cli/generate.md": {
		title: "CLI Generate Commands",
		description:
			"CLI commands for scaffolding agent rules, IDE configurations, and MCP client setups.",
	},
	"cli/memory.md": {
		title: "CLI Memory Commands",
		description:
			"CLI commands for reading, recording, searching, and consolidating project memory.",
	},
	"connectors/index.md": {
		title: "@memofs/connectors Overview",
		description:
			"Data ingestion framework for synchronizing external documentation and issue trackers into MemoFS.",
	},
	"connectors/built-in-connectors.md": {
		title: "Built-In Ingestion Connectors",
		description:
			"Reference guide for built-in GitHub and Notion connectors in MemoFS.",
	},
	"connectors/custom-connectors.md": {
		title: "Custom Ingestion Connectors",
		description:
			"Guide to authoring custom TypeScript data ingestion connectors for MemoFS.",
	},
	"core/index.md": {
		title: "@memofs/core Overview",
		description:
			"Core architecture, API contracts, and memory primitives of the @memofs/core package.",
	},
	"core/agentfs.md": {
		title: "AgentFS Virtual Filesystem",
		description:
			"Virtual file-system abstraction (AgentFS) providing safe read/write boundaries for AI agents.",
	},
	"core/concepts.md": {
		title: "Core Memory Concepts",
		description:
			"Architectural overview of Core Memory, Working Notes, Knowledge Graph, and Hybrid Recall in MemoFS.",
	},
	"core/configuration.md": {
		title: "@memofs/core Configuration",
		description:
			"Configuration options and schema specifications for @memofs/core client instances.",
	},
	"core/graph.md": {
		title: "Graph Client API",
		description:
			"Graph API for entity extraction, relationship querying, and memory deduplication in MemoFS.",
	},
	"core/recall.md": {
		title: "Recall Client API",
		description:
			"Recall API for executing hybrid lexical and semantic searches over project memories.",
	},
	"core/snapshots.md": {
		title: "Snapshots Client API",
		description:
			"Snapshots API for creating immutable memory checkpoints and performing rollbacks.",
	},
	"core/sync.md": {
		title: "Sync Client API",
		description:
			"Sync API for monotonic cursor replication between local stores and MemoFS Cloud.",
	},
	"core/utilities.md": {
		title: "Utilities Client API",
		description:
			"Helper utilities, health checks, validation routines, and formatters in @memofs/core.",
	},
	"core/memory.md": {
		title: "Memory Client API",
		description:
			"Memory primitives, operations, and persistence API in @memofs/core.",
	},
	"core/reference.md": {
		title: "@memofs/core API Reference",
		description:
			"Complete API reference and type definitions for @memofs/core.",
	},
	"tooling/json-rpc.md": {
		title: "@memofs/json-rpc",
		description:
			"JSON-RPC 2.0 protocol specifications, types, and schema validators for MemoFS client-server communication.",
	},
	"mcp/index.md": {
		title: "@memofs/mcp-server Overview",
		description:
			"Model Context Protocol (MCP) server package for exposing MemoFS memory tools to AI agents.",
	},
	"mcp/hosted-mcp-endpoint.md": {
		title: "Hosted MCP Endpoint",
		description:
			"Connecting AI agents to remote MemoFS Cloud Hosted MCP servers over HTTPS with SSE/Streamable HTTP.",
	},
	"mcp/hybrid-mode.md": {
		title: "Hybrid Mode MCP",
		description:
			"Hybrid MCP operation mode combining local disk storage with cloud replica synchronization.",
	},
	"server/index.md": {
		title: "@memofs/server Overview",
		description:
			"Self-hosted HTTP/JSON-RPC server package for running MemoFS in centralized environments.",
	},
	"server/api-reference.md": {
		title: "@memofs/server API Reference",
		description:
			"JSON-RPC 2.0 endpoint reference for @memofs/server methods and parameters.",
	},
	"server/cloudflare.md": {
		title: "@memofs/server on Cloudflare",
		description:
			"Deploying @memofs/server on Cloudflare Workers with KV, D1/Turso, and R2 storage.",
	},
	"server/http-api.md": {
		title: "@memofs/server HTTP API",
		description:
			"HTTP endpoints, authentication headers, and request formats for @memofs/server.",
	},
	"server/node.md": {
		title: "@memofs/server on Node.js",
		description:
			"Deploying @memofs/server on Node.js runtimes with Express, Fastify, or standalone HTTP.",
	},
	"tooling/testing.md": {
		title: "@memofs/testing",
		description:
			"Testing utilities, mock stores, fixture generators, and test harnesses for MemoFS applications.",
	},
};

let count = 0;

for (const [relPath, meta] of Object.entries(METADATA_MAP)) {
	const filePath = path.join(docsDir, relPath);
	if (!fs.existsSync(filePath)) {
		console.warn(`File not found: ${filePath}`);
		continue;
	}

	let content = fs.readFileSync(filePath, "utf8");

	if (content.startsWith("---")) {
		const endFm = content.indexOf("\n---", 3);
		if (endFm !== -1) {
			let fmBlock = content.substring(3, endFm);
			const restOfDoc = content.substring(endFm + 4);

			// Check if title exists in frontmatter
			if (!/^title:/m.test(fmBlock)) {
				fmBlock = `\ntitle: "${meta.title}"${fmBlock}`;
			}
			// Check if description exists in frontmatter
			if (!/^description:/m.test(fmBlock)) {
				fmBlock = `${fmBlock}\ndescription: "${meta.description}"`;
			} else {
				fmBlock = fmBlock.replace(
					/^description:.*$/m,
					`description: "${meta.description}"`,
				);
			}

			content = `---${fmBlock}\n---${restOfDoc}`;
		}
	} else {
		content = `---\ntitle: "${meta.title}"\ndescription: "${meta.description}"\n---\n\n${content}`;
	}

	fs.writeFileSync(filePath, content, "utf8");
	count++;
}

console.log(
	`Successfully updated frontmatter metadata for ${count} doc files.`,
);
