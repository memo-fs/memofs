/**
 * Valid roles for a conversation entry.
 * @public
 */
export type ConversationRole = "user" | "assistant" | "system" | "tool";

/**
 * A single entry in the conversation history (conversations.jsonl).
 *
 * @public
 */
export interface ConversationEntry {
	/** ISO 8601 timestamp of when the entry was created. */
	timestamp: string;
	/** The role of the speaker (user, assistant, system, tool). */
	role: ConversationRole;
	/** The content of the conversation entry. */
	content: string;
	/** Optional one-line summary of the entry. */
	summary?: string;
	/** Optional arbitrary metadata attached to the entry. */
	metadata?: Record<string, unknown>;
}

/**
 * Valid kinds of timestamped notes.
 * @public
 */
export type NoteKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

/**
 * A timestamped note appended to notes.md.
 *
 * @public
 */
export interface TimestampedNote {
	/** ISO 8601 timestamp of when the note was created. */
	timestamp: string;
	/** The kind/category of the note. */
	kind: NoteKind;
	/** The body content of the note. */
	content: string;
	/** Optional title for the note. */
	title?: string;
	/** Optional tags for categorizing the note. */
	tags?: string[];
	/** Optional source identifier (where the note originated). */
	source?: string;
	/** Confidence score between 0 and 1 (defaults to 1). */
	confidence?: number;
	/** Optional arbitrary metadata attached to the note. */
	metadata?: Record<string, unknown>;
}

/**
 * Document-level memory types (high-level categories).
 * @public
 */
export type MemoryDocumentType = "core" | "notes" | "conversations";

/**
 * Fine-grained memory types used across the system.
 * @public
 */
export type MemoryType =
	| "core"
	| "notes"
	| "conversation"
	| "event"
	| "chunk"
	| "graph";

/**
 * Source types identifying where memory data originated.
 * @public
 */
export type MemorySourceType =
	| "document"
	| "note"
	| "conversation"
	| "event"
	| "import"
	| "graph";

/**
 * Reference to the source of a memory chunk or record.
 *
 * @public
 */
export interface MemorySourceReference {
	/** Optional tenant ID for multi-tenant setups. */
	tenantId?: string;
	/** Optional project ID to scope the source. */
	projectId?: string;
	/** The type of source (document, note, conversation, etc.). */
	sourceType: MemorySourceType;
	/** Unique identifier for the source within its type. */
	sourceId: string;
	/** Optional filesystem or URL path to the source. */
	sourcePath?: string;
}

/**
 * A text chunk produced by the chunking process, ready for embedding.
 *
 * @public
 */
export interface MemoryChunk {
	/** Unique ID for this chunk (derived from source + index + hash). */
	id: string;
	/** The chunk text content. */
	text: string;
	/** Reference to the source of this chunk. */
	source: MemorySourceReference;
	/** The memory type this chunk belongs to. */
	memoryType: MemoryType;
	/** Sequential index of this chunk within its source. */
	index: number;
	/** Character offset where this chunk starts in the source text. */
	startOffset: number;
	/** Character offset where this chunk ends in the source text. */
	endOffset: number;
	/** Hash of the chunk text for change detection. */
	hash: string;
	/** Optional section name for organizational purposes. */
	sectionName?: string;
	/** Optional arbitrary metadata attached to the chunk. */
	metadata?: Record<string, unknown>;
}

/**
 * Manifest describing the structure and file paths of a TekMemo project.
 *
 * @remarks
 * The manifest is stored as `manifest.json` in the `.tekmemo/` directory
 * and defines where each canonical file lives.
 *
 * @public
 */
export interface TekMemoManifest {
	/** Manifest schema version (currently "1"). */
	version: string;
	/** Optional project ID for namespacing. */
	projectId?: string;
	/** ISO 8601 timestamp when the manifest was created. */
	createdAt: string;
	/** ISO 8601 timestamp when the manifest was last updated. */
	updatedAt: string;
	/** Paths to memory documents (core, notes). */
	memory: {
		/** Path to core memory (core.md). */
		core: string;
		/** Path to notes memory (notes.md). */
		notes: string;
	};
	/** Paths to event logs (memory events, conversations). */
	events: {
		/** Path to memory events JSONL. */
		memoryEvents: string;
		/** Path to conversations JSONL. */
		conversations: string;
	};
	/** Paths to index files (chunks). */
	indexes: {
		/** Path to chunks index JSONL. */
		chunks: string;
	};
	/** Paths to graph files (nodes, edges). */
	graph: {
		/** Path to graph nodes JSONL. */
		nodes: string;
		/** Path to graph edges JSONL. */
		edges: string;
	};
	/** Paths to snapshot files. */
	snapshots: {
		/** Path to snapshots index JSONL. */
		index: string;
	};
}

/**
 * Valid memory event types for the event log.
 * @public
 */
export type MemoryEventType =
	| "memory.created"
	| "memory.updated"
	| "memory.merged"
	| "memory.conflicted"
	| "memory.decayed"
	| "memory.forgotten"
	| "memory.restored"
	| "memory.indexed"
	| "memory.reindexed"
	| "snapshot.created"
	| "sync.started"
	| "sync.completed"
	| "sync.failed";

/**
 * Valid actor types that can trigger memory events.
 * @public
 */
export type MemoryActorType = "user" | "agent" | "system" | "api";

/**
 * A memory event recorded in the event log (memory-events.jsonl).
 *
 * @public
 */
export interface MemoryEvent {
	/** Unique ID for this event (auto-generated). */
	id: string;
	/** The type of event that occurred. */
	type: MemoryEventType;
	/** ISO 8601 timestamp of when the event occurred. */
	timestamp: string;
	/** Optional project ID associated with this event. */
	projectId?: string;
	/** Optional source path that triggered the event. */
	sourcePath?: string;
	/** Optional actor that performed the action. */
	actor?: {
		/** The type of actor (user, agent, system, api). */
		type: MemoryActorType;
		/** Optional ID of the actor. */
		id?: string;
	};
	/** Optional one-line summary of the event. */
	summary?: string;
	/** Optional arbitrary metadata attached to the event. */
	metadata?: Record<string, unknown>;
}

/**
 * A record in the chunks index (chunks.jsonl) tracking chunk lifecycle.
 *
 * @public
 */
export interface ChunkRecord {
	/** ID of the chunk this record tracks. */
	chunkId: string;
	/** Source file path that produced this chunk. */
	sourcePath: string;
	/** Type of source that produced this chunk. */
	sourceType: MemorySourceType;
	/** Unique ID of the source. */
	sourceId: string;
	/** Hash of the source content at chunk time. */
	sourceHash: string;
	/** Hash of the chunk text for change detection. */
	textHash: string;
	/** Memory type this chunk belongs to. */
	memoryType: MemoryType;
	/** Sequential index of this chunk. */
	index: number;
	/** Character offset where this chunk starts. */
	startOffset: number;
	/** Character offset where this chunk ends. */
	endOffset: number;
	/** Current status of the chunk (active, stale, or deleted). */
	status: "active" | "stale" | "deleted";
	/** ISO 8601 timestamp when the record was created. */
	createdAt: string;
	/** ISO 8601 timestamp when the record was last updated. */
	updatedAt?: string;
	/** Optional section name for organizational purposes. */
	sectionName?: string;
	/** Optional arbitrary metadata attached to the record. */
	metadata?: Record<string, unknown>;
}

/**
 * A record in the snapshots index (snapshots.jsonl).
 *
 * @public
 */
export interface SnapshotRecord {
	/** Unique ID for this snapshot. */
	id: string;
	/** Filesystem path to the snapshot JSON file. */
	path: string;
	/** How the snapshot was created (manual, automatic, etc.). */
	type: "manual" | "automatic" | "pre-sync" | "pre-restore";
	/** Current status of the snapshot. */
	status: "available" | "expired" | "deleted";
	/** ISO 8601 timestamp when the snapshot was created. */
	createdAt: string;
	/** Optional ISO 8601 timestamp when the snapshot expires. */
	expiresAt?: string;
	/** Optional checksum for integrity verification. */
	checksum?: string;
	/** Optional arbitrary metadata attached to the snapshot. */
	metadata?: Record<string, unknown>;
}
