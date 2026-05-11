import {
	booleanSchema,
	graphEdgeSchema,
	graphNodeSchema,
	numberSchema,
	objectSchema,
	sourceRefSchema,
	stringSchema,
} from "../schema.js";
import type { JsonObject, McpToolDefinition } from "../types.js";

const commonScopeProperties: JsonObject = {
	workspaceId: stringSchema(
		"Workspace id. The runtime decides whether this is required.",
		256,
	),
	projectId: stringSchema("Project id inside the workspace.", 256),
};

const kindSchema: JsonObject = {
	type: "string",
	enum: [
		"decision",
		"constraint",
		"goal",
		"preference",
		"reference",
		"summary",
		"note",
	],
	description: "Memory kind. Defaults to note.",
};

export function createToolDefinitions(
	maxPageSize: number,
): McpToolDefinition[] {
	return [
		{
			name: "tekmemo_agent_session_start",
			title: "Start TekMemo Agent Session",
			description:
				"Create an AgentFS-backed TekMemo session workspace and return paths/resources for coding agents.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					task: stringSchema("Agent task or brief.", 4096),
					actorId: stringSchema("Actor id such as assistant:codex.", 256),
					sessionId: stringSchema("Optional safe session id.", 256),
					...commonScopeProperties,
				},
				["task"],
			),
		},
		{
			name: "tekmemo_agent_session_read",
			title: "Read TekMemo Agent Session File",
			description: "Read one AgentFS session file.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					sessionId: stringSchema("Session id.", 256),
					path: stringSchema("Session file path.", 2048),
					...commonScopeProperties,
				},
				["sessionId", "path"],
			),
		},
		{
			name: "tekmemo_agent_session_write",
			title: "Write TekMemo Agent Session File",
			description:
				"Write an allowed working/ or output/ file in an AgentFS session.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					sessionId: stringSchema("Session id.", 256),
					path: stringSchema("Session file path.", 2048),
					content: stringSchema("File content.", 200_000),
					...commonScopeProperties,
				},
				["sessionId", "path", "content"],
			),
		},
		{
			name: "tekmemo_agent_session_append",
			title: "Append TekMemo Agent Session File",
			description:
				"Append to an allowed working/ or output/ file in an AgentFS session.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					sessionId: stringSchema("Session id.", 256),
					path: stringSchema("Session file path.", 2048),
					content: stringSchema("Content to append.", 200_000),
					...commonScopeProperties,
				},
				["sessionId", "path", "content"],
			),
		},
		{
			name: "tekmemo_agent_session_extract",
			title: "Extract TekMemo Agent Session Memory",
			description:
				"Extract summary, durable memory, follow-ups, errors, and changes from an AgentFS session.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					sessionId: stringSchema("Session id.", 256),
					...commonScopeProperties,
				},
				["sessionId"],
			),
		},
		{
			name: "tekmemo_agent_session_complete",
			title: "Complete TekMemo Agent Session",
			description:
				"Extract, checkpoint, push, and optionally persist durable memory from an AgentFS session.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					sessionId: stringSchema("Session id.", 256),
					extractDurableMemory: booleanSchema(
						"Persist output/durable-memory.md into TekMemo notes.",
					),
					checkpointLabel: stringSchema("Checkpoint label.", 128),
					...commonScopeProperties,
				},
				["sessionId"],
			),
		},
		{
			name: "tekmemo.health",
			title: "TekMemo Health",
			description:
				"Check TekMemo MCP runtime health, mode, and available capabilities.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({}),
			outputSchema: objectSchema(
				{
					ok: { type: "boolean" },
					name: { type: "string" },
					version: { type: "string" },
					mode: { type: "string" },
					capabilities: { type: "array", items: { type: "string" } },
				},
				["ok", "name", "version", "capabilities"],
			),
		},
		{
			name: "tekmemo.context",
			title: "Build TekMemo Agent Context",
			description:
				"Build task-ready memory context for an agent by combining core memory, recent memory, and recall results when supported.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					query: stringSchema("Current user task or context query.", 4096),
					...commonScopeProperties,
					limit: {
						type: "integer",
						minimum: 1,
						maximum: maxPageSize,
						description: "Maximum recall items to include.",
					},
					maxBytes: {
						type: "integer",
						minimum: 1024,
						maximum: 262144,
						description: "Maximum context text bytes.",
					},
					includeCore: booleanSchema("Include core memory."),
					includeNotes: booleanSchema("Include notes memory."),
					includeRecent: booleanSchema("Include recent memory events."),
					includeGraph: booleanSchema("Ask runtime for graph-aware context."),
					includeSources: booleanSchema("Include source references."),
					filters: {
						type: "object",
						description: "Runtime-specific JSON filters.",
					},
				},
				["query"],
			),
		},
		{
			name: "tekmemo.recall",
			title: "Recall TekMemo Memory",
			description:
				"Search TekMemo memory for relevant context. This is read-only and does not modify memory.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					query: stringSchema("Natural language recall query.", 4096),
					...commonScopeProperties,
					limit: {
						type: "integer",
						minimum: 1,
						maximum: maxPageSize,
						description: "Maximum results to return.",
					},
					includeGraph: booleanSchema(
						"Whether to include graph-aware recall if supported.",
					),
					includeSources: booleanSchema(
						"Whether to include source references.",
					),
					filters: {
						type: "object",
						description: "Runtime-specific JSON filters.",
					},
				},
				["query"],
			),
		},
		{
			name: "tekmemo.remember",
			title: "Remember TekMemo Memory",
			description:
				"Add a user-approved durable memory item to TekMemo. Hosts should request user consent before calling this tool.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					title: stringSchema("Optional title.", 512),
					content: stringSchema("Memory note content.", 100_000),
					kind: kindSchema,
					confidence: numberSchema("Confidence score.", 0, 1),
					source: stringSchema("Source actor or origin label.", 512),
					...commonScopeProperties,
					tags: {
						type: "array",
						items: stringSchema("Tag", 128),
						maxItems: 50,
					},
					sourceRefs: { type: "array", items: sourceRefSchema, maxItems: 100 },
					metadata: { type: "object", description: "JSON metadata." },
				},
				["content"],
			),
		},
		{
			name: "tekmemo.write_note",
			title: "Write TekMemo Note (legacy alias)",
			description:
				"Backward-compatible alias for tekmemo.remember. New clients should use tekmemo.remember.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					title: stringSchema("Optional title.", 512),
					content: stringSchema("Memory note content.", 100_000),
					kind: kindSchema,
					...commonScopeProperties,
					tags: {
						type: "array",
						items: stringSchema("Tag", 128),
						maxItems: 50,
					},
					sourceRefs: { type: "array", items: sourceRefSchema, maxItems: 100 },
					metadata: { type: "object", description: "JSON metadata." },
				},
				["content"],
			),
		},
		{
			name: "tekmemo.read_core_memory",
			title: "Read Core Memory",
			description: "Read stable TekMemo core memory.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(commonScopeProperties),
		},
		{
			name: "tekmemo.read_notes_memory",
			title: "Read Notes Memory",
			description: "Read TekMemo notes memory.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(commonScopeProperties),
		},
		{
			name: "tekmemo.list_recent_memories",
			title: "List Recent Memory Events",
			description:
				"List recent TekMemo memory events for review and debugging.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				limit: { type: "integer", minimum: 1, maximum: maxPageSize },
			}),
		},
		{
			name: "tekmemo.validate",
			title: "Validate TekMemo Memory",
			description: "Validate TekMemo memory health and report warnings/errors.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				strict: booleanSchema("Treat warnings as deployment blockers."),
			}),
		},
		{
			name: "tekmemo.snapshot",
			title: "Create TekMemo Snapshot",
			description:
				"Create a memory snapshot before major agentic changes. Hosts should request authorization.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				label: stringSchema("Short snapshot label.", 128),
				type: {
					type: "string",
					enum: ["manual", "automatic", "pre-sync", "pre-restore"],
				},
			}),
		},
		{
			name: "tekmemo.update_core_memory",
			title: "Update Core Memory",
			description:
				"Replace stable core memory. This is high-impact and should require explicit user approval.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					content: stringSchema("New core memory markdown.", 200_000),
					...commonScopeProperties,
				},
				["content"],
			),
		},

		{
			name: "tekmemo.sync_status",
			title: "TekMemo Sync Status",
			description:
				"Read project sync status from TekMemo Cloud/self-hosted cloud when the runtime supports sync.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				clientId: stringSchema("Optional local sync client id.", 256),
			}),
		},
		{
			name: "tekmemo.sync_pull",
			title: "TekMemo Sync Pull",
			description:
				"Pull accepted memory sync events from TekMemo Cloud/self-hosted cloud.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					clientId: stringSchema("Local sync client id.", 256),
					sinceServerVersion: {
						type: "integer",
						minimum: 0,
						description: "Server version cursor to pull from.",
					},
					limit: { type: "integer", minimum: 1, maximum: maxPageSize },
				},
				["clientId"],
			),
		},
		{
			name: "tekmemo.sync_push",
			title: "TekMemo Sync Push",
			description:
				"Push local memory sync events to TekMemo Cloud/self-hosted cloud. Hosts should authorize this write operation.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					clientId: stringSchema("Local sync client id.", 256),
					events: {
						type: "array",
						items: { type: "object" },
						minItems: 1,
						maxItems: 100,
					},
					checkpoint: { type: "object" },
				},
				["clientId", "events"],
			),
		},
		{
			name: "tekmemo.sync_resolve_conflict",
			title: "Resolve TekMemo Sync Conflict",
			description:
				"Resolve a cloud sync conflict using keep_cloud, use_client, or ignore.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					conflictId: stringSchema("Sync conflict id.", 256),
					resolution: {
						type: "string",
						enum: ["keep_cloud", "use_client", "ignore"],
					},
					content: { type: "object" },
				},
				["conflictId", "resolution"],
			),
		},
		{
			name: "tekmemo.graph_upsert_nodes",
			title: "Upsert Graph Nodes",
			description:
				"Create or update graph memory nodes. This is a write operation and should require user authorization.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					workspaceId: stringSchema("Workspace id.", 256),
					nodes: {
						type: "array",
						items: graphNodeSchema,
						minItems: 1,
						maxItems: 100,
					},
				},
				["nodes"],
			),
		},
		{
			name: "tekmemo.graph_upsert_edges",
			title: "Upsert Graph Edges",
			description:
				"Create or update graph memory edges. This is a write operation and should require user authorization.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					workspaceId: stringSchema("Workspace id.", 256),
					edges: {
						type: "array",
						items: graphEdgeSchema,
						minItems: 1,
						maxItems: 200,
					},
				},
				["edges"],
			),
		},
		{
			name: "tekmemo.graph_neighbors",
			title: "Find Graph Neighbors",
			description:
				"Read graph neighbors around a node with direction, edge type, weight, cursor, and limit controls.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					workspaceId: stringSchema("Workspace id.", 256),
					nodeId: stringSchema("Seed node id.", 256),
					direction: { type: "string", enum: ["in", "out", "both"] },
					edgeTypes: {
						type: "array",
						items: stringSchema("Edge type", 128),
						maxItems: 50,
					},
					minWeight: numberSchema("Minimum edge weight.", 0, 1),
					limit: { type: "integer", minimum: 1, maximum: maxPageSize },
					cursor: stringSchema(
						"Opaque cursor returned by a previous call.",
						512,
					),
				},
				["nodeId"],
			),
		},
		{
			name: "tekmemo.graph_path",
			title: "Find Graph Path",
			description:
				"Find a graph path between two nodes. Use weighted=true for strength-aware pathfinding when supported by the runtime.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					workspaceId: stringSchema("Workspace id.", 256),
					from: stringSchema("Start node id.", 256),
					to: stringSchema("Target node id.", 256),
					weighted: booleanSchema("Prefer weighted pathfinding."),
					maxDepth: { type: "integer", minimum: 1, maximum: 25 },
					edgeTypes: {
						type: "array",
						items: stringSchema("Edge type", 128),
						maxItems: 50,
					},
					minWeight: numberSchema("Minimum edge weight.", 0, 1),
				},
				["from", "to"],
			),
		},
		{
			name: "tekmemo.readiness",
			title: "TekMemo Readiness",
			description: "Check TekMemo Cloud production readiness.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({}),
		},
		{
			name: "tekmemo.context_compose",
			title: "Compose Context Package",
			description:
				"Compose full context using cloud API with core memory, recall results, and optional graph context.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					query: stringSchema(
						"Natural language query for context composition.",
						4096,
					),
					...commonScopeProperties,
					topK: { type: "integer", minimum: 1, maximum: 20 },
					strategy: { type: "string", enum: ["auto", "vector", "local"] },
					rerank: booleanSchema("Request reranking."),
					includeCoreMemory: booleanSchema("Include core memory."),
					includeRecallResults: booleanSchema("Include recall results."),
					includeGraphContext: booleanSchema("Include graph context."),
					graphDepth: { type: "integer", minimum: 1, maximum: 3 },
					graphLimit: { type: "integer", minimum: 1, maximum: 50 },
					maxContextCharacters: {
						type: "integer",
						minimum: 1000,
						maximum: 50000,
					},
					maxSourceCharacters: { type: "integer", minimum: 300, maximum: 8000 },
				},
				["query"],
			),
		},
		{
			name: "tekmemo.graph_list_nodes",
			title: "List Graph Nodes",
			description: "List graph nodes with pagination and status filters.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				limit: { type: "integer", minimum: 1, maximum: 100 },
				cursor: stringSchema("Opaque cursor for pagination.", 512),
				status: {
					type: "string",
					enum: ["active", "deprecated", "conflicted", "deleted"],
				},
			}),
		},
		{
			name: "tekmemo.graph_create_node",
			title: "Create Graph Node",
			description: "Create or update a graph node.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					nodeId: stringSchema("Node id.", 256),
					type: stringSchema("Node type.", 128),
					label: stringSchema("Node label.", 256),
					summary: stringSchema("Node summary.", 1024),
					aliases: {
						type: "array",
						items: stringSchema("Alias", 128),
						maxItems: 20,
					},
					metadata: { type: "object", description: "JSON metadata." },
				},
				["nodeId", "type", "label"],
			),
		},
		{
			name: "tekmemo.graph_list_edges",
			title: "List Graph Edges",
			description: "List graph edges with pagination and status filters.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				limit: { type: "integer", minimum: 1, maximum: 100 },
				cursor: stringSchema("Opaque cursor for pagination.", 512),
				status: {
					type: "string",
					enum: ["active", "deprecated", "conflicted", "deleted"],
				},
			}),
		},
		{
			name: "tekmemo.graph_create_edge",
			title: "Create Graph Edge",
			description: "Create or update a graph edge.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					edgeId: stringSchema("Edge id (optional for create).", 256),
					from: stringSchema("From node id.", 256),
					to: stringSchema("To node id.", 256),
					type: stringSchema("Edge type.", 128),
					directed: booleanSchema("Directed edge."),
					weight: numberSchema("Edge weight (0-1).", 0, 1),
					metadata: { type: "object", description: "JSON metadata." },
				},
				["from", "to", "type"],
			),
		},
		{
			name: "tekmemo.extraction_run",
			title: "Run Extraction",
			description: "Run graph extraction for the project.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				mode: {
					type: "string",
					enum: ["full", "core", "notes", "sync", "connectors"],
				},
				force: booleanSchema("Force re-extraction."),
			}),
		},
		{
			name: "tekmemo.extraction_jobs",
			title: "List Extraction Jobs",
			description: "List graph extraction jobs.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				limit: { type: "integer", minimum: 1, maximum: 100 },
			}),
		},
		{
			name: "tekmemo.evals_run",
			title: "Run Evaluations",
			description: "Run context quality evaluations.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				fixtureIds: {
					type: "array",
					items: stringSchema("Fixture id", 256),
					maxItems: 50,
				},
				iterations: { type: "integer", minimum: 1, maximum: 20 },
				thresholds: { type: "object", description: "Evaluation thresholds." },
			}),
		},
		{
			name: "tekmemo.benchmarks_run",
			title: "Run Benchmarks",
			description: "Run context benchmarks.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				fixtureIds: {
					type: "array",
					items: stringSchema("Fixture id", 256),
					maxItems: 50,
				},
				iterations: { type: "integer", minimum: 1, maximum: 20 },
				warmupIterations: { type: "integer", minimum: 0, maximum: 5 },
				thresholds: { type: "object", description: "Benchmark thresholds." },
			}),
		},
		{
			name: "tekmemo.exports_create",
			title: "Create Export",
			description: "Create a memory export archive.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				label: stringSchema("Export label (max 120 chars).", 120),
			}),
		},
		{
			name: "tekmemo.exports_download",
			title: "Download Export",
			description: "Get download URL for an export archive.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					exportId: stringSchema("Export id.", 256),
				},
				["exportId"],
			),
		},
		{
			name: "tekmemo.snapshots_create",
			title: "Create Snapshot",
			description: "Create a memory snapshot.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				label: stringSchema("Snapshot label (max 120 chars).", 120),
				trigger: { type: "string", enum: ["manual", "sync", "system"] },
			}),
		},
		{
			name: "tekmemo.snapshots_download",
			title: "Download Snapshot",
			description: "Get download URL for a snapshot archive.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					snapshotId: stringSchema("Snapshot id.", 256),
				},
				["snapshotId"],
			),
		},
		{
			name: "tekmemo.providers_list",
			title: "List Providers",
			description: "List provider credentials.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({ ...commonScopeProperties }),
		},
		{
			name: "tekmemo.providers_create",
			title: "Create Provider",
			description: "Create a provider credential.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					provider: {
						type: "string",
						enum: ["voyageai", "openai", "upstash-vector"],
					},
					keyName: stringSchema("Key name.", 256),
					secret: stringSchema("Provider secret.", 4096),
					restUrl: stringSchema(
						"REST URL (required for upstash-vector).",
						2048,
					),
					embeddingModel: stringSchema("Embedding model.", 256),
					rerankModel: stringSchema("Rerank model.", 256),
				},
				["provider", "keyName", "secret"],
			),
		},
		{
			name: "tekmemo.providers_test",
			title: "Test Provider",
			description: "Test a provider credential.",
			safety: "read",
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema(
				{
					...commonScopeProperties,
					credentialId: stringSchema("Credential id.", 256),
				},
				["credentialId"],
			),
		},
	];
}
