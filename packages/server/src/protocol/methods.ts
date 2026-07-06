/**
 * JSON-RPC method names + the live/gated partition for the `memofs-server`
 * runtime API.
 *
 * @remarks
 * This is the single source of truth for the **Hard ordering rule**
 * (s3-execution-plan.md §"Hard ordering rule"). Every mutating method is a
 * member of {@link GATED_METHODS}; until slice 3's concurrency layer
 * merges, the dispatcher refuses those methods with `503`. No
 * concurrent-write surface is reachable before its serialization — the gate
 * is "method rejects," never "method present unsafely."
 *
 * Slice 3 flips the gate: it injects a `concurrencyLayer`, and the mutating
 * methods run live through it. The method names themselves never change, so
 * the OSS Node deploy and the cloud Worker deploy stay identical.
 *
 * The method surface mirrors the {@link MemoFS} client's frozen public API
 * (`recall`, `context`, `writeMemory`, `core`, `notes`, `graph`, `snapshots`,
 * `health`) — this **is** the two-Worker boundary: the runtime API
 * the commercial Worker reaches over a Service Binding is the same surface an
 * OSS self-hoster gets over HTTP.
 *
 * @module methods
 */

/**
 * JSON-RPC method names exposed by the runtime API.
 *
 * Kept as a `const` object so handlers + tests reference names symbolically
 * (no stringly-typed drift) and the live/gated sets below are checked against
 * the same constants.
 */
export const RUNTIME_METHOD = {
	/** Liveness probe (mirrors `MemoFS.health`). */
	health: "health",
	/** Semantic recall (mirrors `MemoFS.recall`). */
	recall: "recall",
	/** Task briefing / progressive-disclosure context (`MemoFS.context`). */
	context: "context",
	/** Read the core-memory document (`MemoFS.core.read`). */
	readCore: "memory.readCore",
	/** Read the notes document (`MemoFS.notes.read`). */
	readNotes: "memory.readNotes",
	/** Read conversation history (`MemoFS.conversations.read`). */
	readConversations: "memory.readConversations",
	/** List recent memory events (`MemoFS.listRecentMemories`). */
	listRecent: "memory.listRecent",
	/** Validate memory integrity (`MemoFS.validate`). */
	validate: "memory.validate",
	/** List graph nodes (`MemoFS.graph.listNodes`). */
	listNodes: "graph.listNodes",
	/** List graph edges (`MemoFS.graph.listEdges`). */
	listEdges: "graph.listEdges",
	/** Graph neighbors (`MemoFS.graph.neighbors`). */
	graphNeighbors: "graph.neighbors",
	/** Graph path search (`MemoFS.graph.path`). */
	graphPath: "graph.path",
	/** List snapshots (`MemoFS.snapshots.list`). */
	listSnapshots: "snapshots.list",
	/** Write a memory (`MemoFS.writeMemory`) — MUTATING. */
	write: "memory.write",
	/** Record a note (`MemoFS.notes.record`) — MUTATING. */
	recordNote: "memory.recordNote",
	/** Update core memory (`MemoFS.core.update`) — MUTATING. */
	updateCore: "memory.updateCore",
	/** Append a conversation entry (`MemoFS.conversations.append`) — MUTATING. */
	appendConversation: "memory.appendConversation",
	/** Upsert graph nodes (`MemoFS.graph.upsertNodes`) — MUTATING. */
	upsertNodes: "graph.upsertNodes",
	/** Upsert graph edges (`MemoFS.graph.upsertEdges`) — MUTATING. */
	upsertEdges: "graph.upsertEdges",
	/** Run consolidation (`MemoFS.consolidate`) — MUTATING. */
	consolidate: "consolidate",
	/** Create a snapshot (`MemoFS.snapshots.create`) — MUTATING. */
	createSnapshot: "snapshots.create",
	/** Restore a snapshot (`MemoFS.snapshots.restore`) — MUTATING. */
	restoreSnapshot: "snapshots.restore",
} as const;

/** The set of method names that are live (read-only) at slice 1. */
export const LIVE_METHODS: ReadonlySet<string> = new Set<string>([
	RUNTIME_METHOD.health,
	RUNTIME_METHOD.recall,
	RUNTIME_METHOD.context,
	RUNTIME_METHOD.readCore,
	RUNTIME_METHOD.readNotes,
	RUNTIME_METHOD.readConversations,
	RUNTIME_METHOD.listRecent,
	RUNTIME_METHOD.validate,
	RUNTIME_METHOD.listNodes,
	RUNTIME_METHOD.listEdges,
	RUNTIME_METHOD.graphNeighbors,
	RUNTIME_METHOD.graphPath,
	RUNTIME_METHOD.listSnapshots,
]);

/**
 * The set of method names gated on slice 3's concurrency layer.
 *
 * Every mutating operation lives here. Until a `concurrencyLayer` is injected
 * (slice 3), the dispatcher refuses these with `503`. This is the Hard
 * ordering rule made machine-checkable: no concurrent-write surface is
 * reachable before its serialization.
 */
export const GATED_METHODS: ReadonlySet<string> = new Set<string>([
	RUNTIME_METHOD.write,
	RUNTIME_METHOD.recordNote,
	RUNTIME_METHOD.updateCore,
	RUNTIME_METHOD.appendConversation,
	RUNTIME_METHOD.upsertNodes,
	RUNTIME_METHOD.upsertEdges,
	RUNTIME_METHOD.consolidate,
	RUNTIME_METHOD.createSnapshot,
	RUNTIME_METHOD.restoreSnapshot,
]);
