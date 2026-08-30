/**
 * Unified public types for the MemoFS client API.
 *
 * These types were previously scattered across the MCP server, CLI, and cloud-client.
 * They are now consolidated here as the single source of truth.
 *
 * @public
 */

import type { JsonObject } from "../core/types/json";
import type {
	DurabilityReason,
	DurabilityTier,
} from "../security/durability-tier";

export type {
	JsonArray,
	JsonObject,
	JsonPrimitive,
	JsonValue,
} from "../core/types/json";

export type MemoFSRuntimeMode = "local" | "hybrid";

/**
 * The kind of task an agent is performing, used by the strategist to tailor
 * the recall query. The strategist augments the expansion lexicon per task
 * type so the most relevant memories surface first.
 *
 * - `"coding"` — surfaces constraints and recent patterns.
 * - `"debug"` — surfaces recent errors and bug-fix decisions.
 * - `"refactor"` — surfaces architecture decisions and dependency graph.
 * - `"docs"` — surfaces terminology and API contracts.
 * - `"general"` (default) — the current broad briefing with no extra
 *   task-type augmentation.
 *
 * @public
 */
export type TaskType = "coding" | "debug" | "refactor" | "docs" | "general";

/**
 * The canonical list of valid {@link TaskType} values, in enum order.
 * Imported by the MCP server (JSON schema `enum`) and the CLI (commander
 * `choices`) so the set of accepted task types has exactly one source.
 *
 * @public
 */
export const TASK_TYPES: readonly TaskType[] = [
	"coding",
	"debug",
	"refactor",
	"docs",
	"general",
] as const;

/**
 * Type guard — returns `true` when `value` is one of {@link TASK_TYPES}.
 *
 * @param value - The string to test.
 * @public
 */
export function isTaskType(value: string): value is TaskType {
	return (TASK_TYPES as readonly string[]).includes(value);
}

export type MemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export interface Page<T> {
	items: T[];
	nextCursor?: string;
}

export interface SourceRef {
	sourceType: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
	metadata?: JsonObject;
}

export interface RecallInput {
	query: string;
	workspaceId?: string;
	projectId?: string;
	limit?: number;
	includeGraph?: boolean;
	includeSources?: boolean;
	filters?: JsonObject;
}

/**
 * Code binding site for self-heal — `where in the code this fact is anchored`.
 *
 * - `file` is a repository-relative path (forward slashes, no leading `/`).
 * - `hash` is the SHA-256 (hex, lowercase, 64 chars) of the anchored file's
 *   bytes at write time — the drift-detection comparison baseline.
 * - `symbol` is the optional dotted AST symbol path for `.ts`/`.tsx` files
 *   (`<repo-relative file path>#<dotted-symbol-path>`, e.g.
 *   `src/auth/provider.ts#verifyJwt`). Undefined for non-TS files at v1.
 *
 * Hash-only is the v1 anchor contract; `symbol` is the optional
 * TS-Compiler-extracted AST binding. Drift detection (hash mismatch OR
 * file-deleted) works for any language; only the optional `symbol` field
 * is TS-only at v1.
 *
 * @public
 */
export interface AnchorRef {
	/** Repository-relative file path (forward slashes, no leading `/`). */
	file: string;
	/** SHA-256 (hex, lowercase, 64 chars) of the anchored file's bytes at write time. */
	hash: string;
	/**
	 * Optional AST symbol path for `.ts`/`.tsx` files extracted via the
	 * TypeScript Compiler API at write time. Format:
	 * `<repo-relative file path>#<dotted-symbol-path>`. Undefined for
	 * non-TS files at v1.
	 */
	symbol?: string;
}

export interface RecallItem {
	id: string;
	text: string;
	score?: number;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
	/**
	 * The code binding site copied through from the originating
	 * {@link WriteMemoryInput.anchor} when the memory was written. Absent
	 * when the memory was written without an anchor (today's default
	 * behavior). Drift detection reads `anchor.hash` against the live file
	 * at query time and sets {@link RecallItem.stale} on mismatch.
	 *
	 * @public
	 */
	anchor?: AnchorRef;
	/**
	 * `true` when the runtime detected hash drift (or file deletion) on
	 * {@link RecallItem.anchor} since the memory was written. Stale items
	 * are still surfaced (ranked lower) so the next agent session sees
	 * drift happened. Absent when no anchor was set or when the file
	 * still matches its stored hash.
	 *
	 * @public
	 */
	stale?: boolean;
	/**
	 * `true` when the runtime detected the memory's age exceeded its
	 * kind-specific expiry floor (`EXPIRY_DAYS[kind]`) at query time.
	 * Unverified items are still surfaced (ranked lower, milder than
	 * {@link RecallItem.stale}) so the next agent session invokes the
	 * LLM re-verify lifecycle on them. Absent when the memory has no
	 * `kind`, the `kind` is outside the expiry table, or the memory is
	 * younger than its floor.
	 *
	 * @public
	 */
	unverified?: boolean;
}

export interface RecallResult {
	items: RecallItem[];
	warnings?: string[];
}

export interface MemoryContextInput extends RecallInput {
	/**
	 * The kind of task the agent is performing. The strategist augments the
	 * recall query per task type so the most relevant memories surface first.
	 * Defaults to `"general"` when omitted.
	 */
	taskType?: TaskType;
	maxBytes?: number;
	includeCore?: boolean;
	includeNotes?: boolean;
	includeRecent?: boolean;
	/**
	 * Progressive disclosure level.
	 *
	 * - `"compact"` (default): a small briefing with expandable sections. The
	 * agent calls back with `section` + `expand` to pull only the section it
	 * needs. Compact ≈ 6kb vs ~64kb truncated today — the
	 * cold-start token-reduction north star.
	 * - `"full"`: today's whole-budget behavior — all sections packed into
	 * `maxBytes`, no expansion affordances, no cache. Use this when you want
	 * the entire dump in one call (the benchmark kit measuring recall
	 * coverage, power users, debugging).
	 */
	detail?: "compact" | "full";
	/**
	 * Expand a single section (progressive disclosure).
	 * Set together with {@link expand} to the opaque cursor the compact
	 * call returned in `MemoryContextResult.expandable`. The result then
	 * contains only that one section, expanded beyond the compact cap, and
	 * reuses the first call's resolved pointers (no re-rewrite). Ignored unless
	 * `expand` is also set.
	 */
	section?: MemoryContextExpandableSection;
	/**
	 * Opaque expansion cursor returned by a prior compact
	 * `memofs.context` call (`MemoryContextResult.expandable[].cursor`). Set
	 * together with {@link section} to pull that section's expanded content.
	 * Malformed/expired cursors degrade gracefully: a fresh compact briefing is
	 * returned with a warning (expansion is best-effort, never a hard error).
	 */
	expand?: string;
}

/**
 * The sections a compact `memofs.context` briefing marks expandable.
 * Each can be pulled individually on a second call via
 * `section` + `expand`.
 *
 * @public
 */
export type MemoryContextExpandableSection =
	| "entities"
	| "recall"
	| "recent"
	| "notes";

export interface MemoryContextResult {
	text: string;
	/**
	 * Ordered context sections. The first section is a `directive` that tells
	 * the agent how to act on the rest of the context; the remaining sections
	 * carry the memory content in trust order (core → entities → recall →
	 * recent → notes). The `entities` section (/3) renders
	 * graph entities the strategist's Resolve stage matched for the query.
	 */
	sections: Array<{
		type:
			| "directive"
			| "core"
			| "entities"
			| "notes"
			| "recent"
			| "recall"
			| "graph";
		title: string;
		content: string;
	}>;
	items?: RecallItem[];
	/**
	 * Expandable sections for progressive disclosure. Populated on compact
	 * calls; absent on `detail: "full"` and on
	 * expand calls. Each entry tells the agent what it can pull and the opaque
	 * cursor to pass back via `memofs.context(section, expand)`. The agent
	 * expands only what it needs and stops — the headline delivery of the
	 * cold-start token-reduction north star.
	 */
	expandable?: MemoryContextExpansion[];
	warnings?: string[];
}

/**
 * One expandable section in a compact `memofs.context` briefing.
 *
 * @public
 */
export interface MemoryContextExpansion {
	/** The section this cursor expands. */
	section: MemoryContextExpandableSection;
	/**
	 * Opaque cursor. Pass back as `memofs.context({ section, expand: cursor })`.
	 * Encodes the first call's resolved pointers so the second call re-resolves
	 * fast. Opaque by contract — callers must not inspect it.
	 */
	cursor: string;
	/**
	 * How many additional units are available behind the cursor (recall
	 * fragments, recent events, ...). Omitted when the count isn't meaningful.
	 */
	available?: number;
	/** One-line description of what expanding returns ("14 more recall fragments"). */
	hint: string;
}

export interface WriteMemoryInput {
	title?: string;
	content: string;
	kind?: MemoryKind;
	workspaceId?: string;
	projectId?: string;
	tags?: string[];
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
	confidence?: number;
	source?: string;
	/**
	 * Optional caller-supplied stable memory id. When set, the strategy uses it
	 * verbatim instead of computing the default `mem_<wall-clock:content>` hash.
	 * This is the connector-write-discipline hook: connectors pass
	 * a content-derived id with no wall-clock in the hashed bytes, so re-ingesting
	 * unchanged external content reproduces identical bytes → the sync manifest
	 * reports "no change". When omitted, the strategy's default id is computed.
	 */
	id?: string;
	/**
	 * Optional idempotency key. When provided, duplicate calls to `writeMemory`
	 * with the same idempotency key will return the existing record result with
	 * `created: false` instead of appending duplicate notes and events.
	 */
	idempotencyKey?: string;
	/**
	 * Optional explicit durability tier override. When
	 * set, the classifier returns it verbatim; when omitted, the deterministic
	 * classifier decides from `kind` + `confidence` + content shape. `transient`
	 * memories are written to `notes.md` (audit trail) but not indexed into
	 * recall/graph — they don't pollute retrieval.
	 */
	tier?: DurabilityTier;
	/**
	 * Optional human writer attribution (email or name). When present, the
	 * write strategy records it in the note frontmatter and the cloud's audit
	 * trail uses it instead of the generic default. Distinct from `source` —
	 * both can be set and both are preserved.
	 */
	writer?: string;
	/**
	 * Optional code binding site for self-heal. When set, the write
	 * strategy persists the anchor in the note's metadata block AND in the
	 * `memory.created` event metadata, so the in-process and cold-start
	 * paths can recover it. At query-time, the recall runtime recomputes
	 * the anchored file's SHA-256 and compares; mismatch OR
	 * file-deleted transitions the corresponding graph node's status to
	 * `"stale"`, sets {@link RecallItem.stale} on the recalled item, and
	 * demotes `score *= 0.5`. Omitting `anchor` preserves today's behavior
	 * (status never transitions to `"stale"`, `RecallItem.stale` undefined).
	 *
	 * @public
	 */
	anchor?: AnchorRef;
}

export interface WriteMemoryResult {
	id: string;
	created: boolean;
	/**
	 * Present when the write was skipped as a near-duplicate of an
	 * already-indexed memory (`created: false`, nothing appended). Names the
	 * existing memory's id so callers can update or supersede it instead of
	 * re-recording the same fact.
	 */
	duplicateOf?: string;
	sourceRefs?: SourceRef[];
	/**
	 * The durability tier the write was classified into.
	 * `transient` means the memory was written to `notes.md` but **not** indexed
	 * into recall/graph. Always present on a successful write so callers can
	 * audit the decision.
	 */
	tier: DurabilityTier;
	/** Why the classifier chose `tier` (auditable; the benchmark kit reads it). */
	tierReason: DurabilityReason;
	warnings?: string[];
}

export interface ReadMemoryInput {
	workspaceId?: string;
	projectId?: string;
}

export interface MemoryDocumentResult {
	content: string;
	warnings?: string[];
}

export interface RecentMemoryInput extends ReadMemoryInput {
	limit?: number;
}

export interface RecentMemoryResult {
	items: Array<{
		id: string;
		type?: string;
		timestamp?: string;
		summary?: string;
		metadata?: JsonObject;
	}>;
	warnings?: string[];
}

export interface ValidateMemoryInput extends ReadMemoryInput {
	strict?: boolean;
}

export interface ValidateMemoryResult {
	ok: boolean;
	warnings: string[];
	errors: string[];
}

export interface SnapshotMemoryInput extends ReadMemoryInput {
	label?: string;
	type?: "manual" | "automatic" | "pre-sync" | "pre-restore";
	metadata?: JsonObject;
}

export interface SnapshotMemoryResult {
	id: string;
	path?: string;
	created: boolean;
	warnings?: string[];
}

export interface AgentSessionStartInput extends ReadMemoryInput {
	task: string;
	actorId?: string;
	sessionId?: string;
}

export interface AgentSessionFileInput extends ReadMemoryInput {
	sessionId: string;
	path: string;
	content?: string;
}

/**
 * The outcome of an AgentFS session, gating durable-memory promotion and
 * session-file cleanup.
 *
 * - `"success"`: the task completed; durable memory promotes when
 *   `extractDurableMemory: true`; `working/` is auto-cleaned.
 * - `"failure"`: the task failed; durable memory is NOT promoted; the
 *   `ephemeral` flag drives cleanup of `working/` + `output/`.
 * - `"aborted"`: the task was paused; nothing is promoted or cleaned; the
 *   session workspace is preserved for resume via a future
 *   `complete({outcome: "success" | "failure"})` with the same `sessionId`.
 *
 * @public
 */
export type SessionOutcome = "success" | "failure" | "aborted";

/**
 * The canonical session-outcome values, used for runtime validation of
 * MCP tool arguments and CLI inputs.
 *
 * @public
 */
export const SESSION_OUTCOMES: readonly SessionOutcome[] = [
	"success",
	"failure",
	"aborted",
] as const;

/**
 * Narrows an unknown value to a {@link SessionOutcome}.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a valid {@link SessionOutcome}.
 * @public
 */
export function isSessionOutcome(value: unknown): value is SessionOutcome {
	return (
		typeof value === "string" &&
		(SESSION_OUTCOMES as readonly string[]).includes(value)
	);
}

export interface AgentSessionCompleteInput extends ReadMemoryInput {
	sessionId: string;
	extractDurableMemory?: boolean;
	checkpointLabel?: string;
	/** Session outcome; absent defaults to `"success"`. */
	outcome?: SessionOutcome;
	/**
	 * Opt-in cleanup of `working/` + `output/` session files on
	 * `outcome: "failure"`. Ignored for other outcomes.
	 */
	ephemeral?: boolean;
	/** Structured failure audit text; carried on `session.failed` events. */
	reason?: string;
}

export interface AgentSessionResult {
	sessionId: string;
	root: string;
	paths: JsonObject;
}

export interface AgentSessionExtractResult {
	sessionId: string;
	extracted: JsonObject;
}

export interface AgentSessionCompleteResult extends AgentSessionExtractResult {
	durableMemoryWritten: boolean;
	outcome: SessionOutcome;
	workingCleaned: boolean;
	outputCleaned: boolean;
	preserved: boolean;
	failureEventWritten: boolean;
}

/**
 * File-based sync types — single source of truth.
 *
 * These are re-exported from the cloud-client, which freezes the four-method
 * file-replica contract (`push`, `complete`, `pull`, `status`).
 * The cloud is a file replica, never an engine: there are no event-level
 * types, no conflict-resolution types, and no `serverVersion`/`openConflicts`
 * fields. All engine operations (recall, memory CRUD, graph, extraction,
 * agent sessions) run locally.
 *
 * @public
 */
export type {
	CloudFileManifest,
	CloudFileSyncEntry,
	FileManifest,
	FileSyncEntry,
	SyncCursor,
	SyncDownloadTarget,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	SyncUploadTarget,
} from "../cloud-client/types";

export interface GraphNodeInput {
	id: string;
	type: string;
	label: string;
	aliases?: string[];
	summary?: string;
	confidence?: number;
	importance?: number;
	status?: string;
	disputed?: boolean;
	stale?: boolean;
	unverified?: boolean;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
}

export interface GraphEdgeInput {
	id?: string;
	from: string;
	to: string;
	type: string;
	directed?: boolean;
	dedupeKey?: string;
	weight?: number;
	confidence?: number;
	status?: string;
	disputed?: boolean;
	stale?: boolean;
	unverified?: boolean;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
}

export interface GraphNeighborsInput {
	nodeId: string;
	workspaceId?: string;
	projectId?: string;
	direction?: "in" | "out" | "both";
	edgeTypes?: string[];
	minWeight?: number;
	limit?: number;
	cursor?: string;
}

export interface GraphPathInput {
	from: string;
	to: string;
	workspaceId?: string;
	projectId?: string;
	weighted?: boolean;
	maxDepth?: number;
	edgeTypes?: string[];
	minWeight?: number;
}

export interface ListGraphInput {
	workspaceId?: string;
	projectId?: string;
	limit?: number;
	cursor?: string;
}

export interface GraphPathResult {
	found: boolean;
	nodes: GraphNodeInput[];
	edges: GraphEdgeInput[];
	totalWeight?: number;
	totalCost?: number;
}

/**
 * Input to a memory consolidation pass.
 *
 * Consolidation is a local, deterministic pass that merges duplicate entities
 * and retires superseded facts — never deleting (the audit trail is preserved).
 * It runs over the whole graph snapshot, so the input carries only optional
 * knobs (an override for "now" and the edge type that expresses supersession).
 *
 * @public
 */
export interface ConsolidateMemoryInput {
	workspaceId?: string;
	projectId?: string;
	/**
	 * When `true` (default), the computed plan is persisted to the graph store
	 * (merges applied, edges/nodes marked `deprecated`). When `false`, the pass
	 * is read-only — useful for previewing what a consolidation would change.
	 */
	apply?: boolean;
	/**
	 * Override the `now` timestamp stamped onto every retirement, for
	 * deterministic tests. Defaults to the current ISO time.
	 */
	now?: string;
	/**
	 * Edge type that expresses "A replaces B". Defaults to `"supersedes"` — the
	 * type the rule-based extractor and the contradiction normalization in
	 * `autoExtractGraph` both emit.
	 */
	supersedingEdgeType?: string;
}

/**
 * Result of a memory consolidation pass.
 *
 * Carries both the computed {@link ConsolidationResult} plan (what *would*
 * change) and the counts actually applied (which may be lower when `apply` is
 * `false` or the store rejected individual operations).
 *
 * @public
 */
export interface ConsolidateMemoryResult {
	/** The full plan: merges + retirements that consolidation proposed. */
	plan: {
		merges: number;
		retiredEdges: number;
		retiredNodes: number;
		changed: boolean;
		now: string;
	};
	/** How many merges were actually persisted (`0` when `apply` is `false`). */
	mergesApplied: number;
	/** How many retirements were actually persisted (`0` when `apply` is `false`). */
	retirementsApplied: number;
	/** Whether the plan was persisted. */
	applied: boolean;
}

export interface MemoFSHealthResult {
	ok: boolean;
	name: string;
	version: string;
	mode?: MemoFSRuntimeMode;
	capabilities: string[];
	warnings?: string[];
}
