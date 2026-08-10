import type { MemoryStore } from "../../core/types/memory-store";
import type { SessionOutcome } from "../../memofs/types";
import type { AgentfsLikeClient } from "../client/agentfs-like";
import type { SyncAfterSessionResult } from "../sync/sync-after-session";
import type { SyncOperationResult } from "../sync/types";

export interface MemoFSAgentSessionPaths {
	readonly root: string;
	readonly meta: string;
	readonly context: {
		readonly manifest: string;
		readonly core: string;
		readonly notes: string;
	};
	readonly working: {
		readonly plan: string;
		readonly commands: string;
		readonly errors: string;
		readonly changes: string;
		readonly notes: string;
	};
	readonly output: {
		readonly summary: string;
		readonly durableMemory: string;
		readonly followUps: string;
	};
}

export interface CreateMemoFSAgentSessionOptions {
	readonly client: AgentfsLikeClient;
	readonly memory: MemoryStore;
	readonly task: string;
	readonly projectId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly actorId?: string | undefined;
	readonly rootPrefix?: string | undefined;
	readonly overwriteWorkspaceFiles?: boolean | undefined;
}

export interface PrepareMemoFSAgentSessionResult {
	readonly sync: SyncOperationResult;
	readonly paths: MemoFSAgentSessionPaths;
}

export interface ExtractedSessionMemory {
	readonly summary: string;
	readonly durableMemory: string;
	readonly followUps: string;
	readonly errors: string;
	readonly changes: string;
}

export interface CompleteMemoFSAgentSessionOptions {
	readonly checkpointLabel?: string | undefined;
	readonly extractDurableMemory?: boolean | undefined;
	readonly skipCheckpoint?: boolean | undefined;
	readonly requireSync?: boolean | undefined;
	/**
	 * Session outcome. When set to `"failure"`, durable memory is never
	 * promoted regardless of `extractDurableMemory`. When set to
	 * `"aborted"`, the workspace is preserved for resume and no promotion
	 * or cleanup runs. Defaults to `"success"` for backward-compatibility.
	 */
	readonly outcome?: SessionOutcome | undefined;
	/**
	 * Opt-in cleanup of `working/` + `output/` session files on
	 * `outcome: "failure"`. Ignored for other outcomes.
	 */
	readonly ephemeral?: boolean | undefined;
	/**
	 * Structured failure/abort audit text. Carried on `session.failed`
	 * events written to `memory-events.jsonl`.
	 */
	readonly reason?: string | undefined;
}

export interface CompleteMemoFSAgentSessionResult {
	readonly extracted: ExtractedSessionMemory;
	readonly sync: SyncAfterSessionResult;
	readonly durableMemoryWritten: boolean;
	/** The resolved session outcome (defaults to `"success"`). */
	readonly outcome: SessionOutcome;
	/** Whether `working/` scratchpad files were deleted. */
	readonly workingCleaned: boolean;
	/** Whether `output/` audit files were deleted. */
	readonly outputCleaned: boolean;
	/** Whether the session workspace was preserved for resume (`aborted`). */
	readonly preserved: boolean;
	/** Whether a `session.failed` event was written. */
	readonly failureEventWritten: boolean;
}

export interface MemoFSAgentSession {
	readonly sessionId: string;
	readonly paths: MemoFSAgentSessionPaths;
	prepare(): Promise<PrepareMemoFSAgentSessionResult>;
	extract(): Promise<ExtractedSessionMemory>;
	complete(
		options?: CompleteMemoFSAgentSessionOptions,
	): Promise<CompleteMemoFSAgentSessionResult>;
}
