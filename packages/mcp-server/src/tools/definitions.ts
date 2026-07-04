/**
 * MCP Tool definitions configuration mapping schemas and safety constraints.
 *
 * The model-facing surface is two namespaces and ten tools:
 *
 * - 4 memory verbs: `tekmemo.context`, `tekmemo.recall`, `tekmemo.remember`,
 * `tekmemo.consolidate`. This is the entire memory lifecycle the model
 * drives. Graph/sync/health/snapshot/validation/core-memory-update ops were
 * demoted to runtime methods (`TekMemoMcpRuntime`) the developer/host calls
 * imperatively — capabilities are preserved, only the model-facing wrapper
 * was removed. The strategist lives behind
 * `tekmemo.context`; the write gate (Component 6) lives behind
 * `tekmemo.remember`.
 * - 6 AgentFS session tools: `tekmemo_agent_session_*`. A separate axis (a
 * coding-agent scratch filesystem, not the memory store), kept model-facing
 * because agents drive their own sessions mid-work.
 *
 * @module definitions
 */

import {
	booleanSchema,
	numberSchema,
	objectSchema,
	sourceRefSchema,
	stringSchema,
} from "../schema";
import type { JsonObject, McpToolDefinition } from "../types";

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

/**
 * Creates and returns all model-facing MCP tool definitions supported by TekMemo.
 *
 * The surface is the 4 memory verbs plus the 6 AgentFS session tools (
 * Component 1). Developer-level operations (graph/sync/health/snapshot/validate/
 * core-memory-update) are runtime methods on `TekMemoMcpRuntime`, not tools.
 *
 * @param maxPageSize - The maximum allowed page limit size constraint.
 * @returns An array of all available McpToolDefinitions.
 */
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
			name: "tekmemo.context",
			title: "Build TekMemo Agent Context",
			description:
				'REQUIRED at the start of every task: build task-ready memory context by combining core memory, recent memory, and recall. TekMemo is the single source of truth for project identity, architecture, constraints, and decisions — ALWAYS call this before planning or writing code so your work adheres to stored memory. The returned text already tells you how to act on it. Read-only.\n\nBy default returns a COMPACT briefing (~6kb): core memory in full, the top entities and a few recall fragments, plus an `expandable` list. Each expandable entry names a section (entities/recall/recent/notes), how many more items it holds, and an opaque cursor. To pull just one section in full, call tekmemo.context again with the same query plus `section` and `expand` (the cursor). Expand only the sections you need, then stop — do not expand everything. Pass `detail: "full"` to get the entire context in one call instead (larger; use when you want the whole dump).',
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
					detail: {
						type: "string",
						enum: ["compact", "full"],
						description:
							'Disclosure level. "compact" (default): a small briefing with expandable sections. "full": the entire context in one call.',
					},
					section: {
						type: "string",
						enum: ["entities", "recall", "recent", "notes"],
						description:
							"Expand a single section: set together with `expand` to the cursor a compact call returned.",
					},
					expand: {
						type: "string",
						maxLength: 512,
						description:
							"Opaque expansion cursor returned by a prior compact call. Set together with `section`.",
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
				"Semantic + lexical memory search. Use this proactively — before answering, when unsure, or when a fact might already be known. Phrases it understands: synonyms and paraphrases, not just exact keywords. Call it instead of guessing or re-deriving facts. Read-only; never modifies memory.",
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
				"Persist a durable fact so future agents benefit — call this WITHOUT being asked whenever you discover a decision, constraint, preference, or architectural fact. Use kind to classify (decision/constraint/goal/preference/reference/summary/note). Set confidence to reflect certainty. Hosts may require user consent; never store secrets. This is what makes memory accumulate intelligently.",
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
			name: "tekmemo.consolidate",
			title: "Consolidate TekMemo Graph Memory",
			description:
				"Run a memory consolidation pass over the local graph: merge duplicate entities and retire facts superseded by a `supersedes` edge. The audit trail is preserved — nothing is deleted, only marked `deprecated`. This is the second half of v1 intelligence: extraction grows the graph, consolidation keeps it tidy. Pass apply=false to preview the plan without persisting. Hosts should authorize this write when apply is true.",
			safety: "write",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			inputSchema: objectSchema({
				...commonScopeProperties,
				apply: booleanSchema(
					"Persist the computed plan (merges + retirements). Defaults to true; pass false to preview.",
				),
				now: stringSchema(
					"Override the `now` timestamp stamped on retirements (ISO 8601). Mainly for tests.",
					64,
				),
				supersedingEdgeType: stringSchema(
					"Edge type expressing 'A replaces B'. Defaults to 'supersedes'.",
					128,
				),
			}),
		},
	];
}
