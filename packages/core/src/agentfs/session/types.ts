import type { MemoryStore, SyncOperationResult } from "../../index";
import type { AgentfsLikeClient } from "../client/agentfs-like";
import type { SyncAfterSessionResult } from "../sync/sync-after-session";

export interface TekMemoAgentSessionPaths {
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

export interface CreateTekMemoAgentSessionOptions {
	readonly client: AgentfsLikeClient;
	readonly memory: MemoryStore;
	readonly task: string;
	readonly projectId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly actorId?: string | undefined;
	readonly rootPrefix?: string | undefined;
	readonly overwriteWorkspaceFiles?: boolean | undefined;
}

export interface PrepareTekMemoAgentSessionResult {
	readonly sync: SyncOperationResult;
	readonly paths: TekMemoAgentSessionPaths;
}

export interface ExtractedSessionMemory {
	readonly summary: string;
	readonly durableMemory: string;
	readonly followUps: string;
	readonly errors: string;
	readonly changes: string;
}

export interface CompleteTekMemoAgentSessionOptions {
	readonly checkpointLabel?: string | undefined;
	readonly extractDurableMemory?: boolean | undefined;
	readonly skipCheckpoint?: boolean | undefined;
	readonly requireSync?: boolean | undefined;
}

export interface CompleteTekMemoAgentSessionResult {
	readonly extracted: ExtractedSessionMemory;
	readonly sync: SyncAfterSessionResult;
	readonly durableMemoryWritten: boolean;
}

export interface TekMemoAgentSession {
	readonly sessionId: string;
	readonly paths: TekMemoAgentSessionPaths;
	prepare(): Promise<PrepareTekMemoAgentSessionResult>;
	extract(): Promise<ExtractedSessionMemory>;
	complete(
		options?: CompleteTekMemoAgentSessionOptions,
	): Promise<CompleteTekMemoAgentSessionResult>;
}
