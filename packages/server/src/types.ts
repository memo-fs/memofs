export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type MemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export interface TekMemoServerProject {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface TekMemoServerCoreMemory {
	content: string;
	updatedAt?: string;
	version?: number;
}

export interface TekMemoServerMemoryNote {
	id: string;
	kind: MemoryKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
	createdAt: string;
	updatedAt: string;
}

export type AgentSessionStatus =
	| "active"
	| "completed"
	| "failed"
	| "abandoned";
export type AgentSessionWorkspaceProvider = "agentfs" | "local" | "hosted";
export type AgentSessionApprovalStatus =
	| "pending"
	| "approved"
	| "rejected"
	| "auto_saved";

export interface TekMemoServerAgentSession {
	id: string;
	projectId: string;
	sessionId: string;
	task: string;
	actorId?: string;
	workspaceProvider: AgentSessionWorkspaceProvider;
	workspaceRoot?: string;
	status: AgentSessionStatus;
	metadata?: JsonObject;
	createdAt: string;
	completedAt?: string;
}

export interface TekMemoServerAgentSessionEvent {
	id: string;
	projectId: string;
	sessionId: string;
	type: string;
	message: string;
	metadata?: JsonObject;
	occurredAt: string;
}

export interface TekMemoServerAgentSessionExtraction {
	id: string;
	projectId: string;
	sessionId: string;
	summary: string;
	durableMemory: string;
	followUps: string;
	errors: string;
	changes: string;
	checkpointLabel?: string;
	approvalStatus: AgentSessionApprovalStatus;
	createdMemoryNoteId?: string;
	createdAt: string;
}

export interface TekMemoServerRecallHit {
	id: string;
	content: string;
	score: number;
	kind?: MemoryKind;
	title?: string;
	tags?: string[];
	metadata?: JsonObject;
	source?: string;
}

export interface TekMemoServerPage<T> {
	items: T[];
	nextCursor?: string;
}

export interface TekMemoServerHealthResult {
	status: "ok" | "degraded";
	service: "tekmemo-server";
	mode: "self-host";
	version?: string;
	time: string;
}

export interface TekMemoServerEnvelope<T> {
	data: T;
	meta?: {
		requestId?: string;
	};
}

export interface TekMemoServerErrorEnvelope {
	error: {
		code: string;
		message: string;
		details?: JsonValue;
	};
	meta?: {
		requestId?: string;
	};
}

export interface TekMemoServerStore {
	isReady(): Promise<boolean>;
	listProjects(): Promise<TekMemoServerProject[]>;
	ensureProject(input: {
		projectId: string;
		name?: string;
	}): Promise<TekMemoServerProject>;
	readCore(projectId: string): Promise<TekMemoServerCoreMemory>;
	updateCore(input: {
		projectId: string;
		content: string;
	}): Promise<TekMemoServerCoreMemory>;
	listNotes(input: {
		projectId: string;
		limit?: number;
		cursor?: string;
		kind?: MemoryKind;
		tag?: string;
	}): Promise<TekMemoServerPage<TekMemoServerMemoryNote>>;
	createNote(input: {
		projectId: string;
		kind?: MemoryKind;
		title?: string;
		content: string;
		tags?: string[];
		confidence?: number;
		source?: string;
		metadata?: JsonObject;
	}): Promise<TekMemoServerMemoryNote>;
	deleteNote(input: {
		projectId: string;
		noteId: string;
	}): Promise<{ deleted: boolean }>;
	recall(input: {
		projectId: string;
		query: string;
		topK?: number;
	}): Promise<{ hits: TekMemoServerRecallHit[] }>;
	index(input: {
		projectId: string;
	}): Promise<{ indexed: number; mode: "inline" | "queued" }>;
	createAgentSession(input: {
		projectId: string;
		sessionId: string;
		task: string;
		actorId?: string;
		workspaceProvider?: AgentSessionWorkspaceProvider;
		workspaceRoot?: string;
		metadata?: JsonObject;
	}): Promise<TekMemoServerAgentSession>;
	addAgentSessionEvent(input: {
		projectId: string;
		sessionId: string;
		type: string;
		message: string;
		metadata?: JsonObject;
		occurredAt?: string;
	}): Promise<TekMemoServerAgentSessionEvent>;
	extractAgentSessionMemory(input: {
		projectId: string;
		sessionId: string;
		summary?: string;
		durableMemory?: string;
		followUps?: string;
		errors?: string;
		changes?: string;
		checkpointLabel?: string;
	}): Promise<TekMemoServerAgentSessionExtraction>;
	approveAgentSessionMemory(input: {
		projectId: string;
		sessionId: string;
		extractionId: string;
		content?: string;
		kind?: MemoryKind;
		title?: string;
		tags?: string[];
		approvedBy?: string;
	}): Promise<TekMemoServerAgentSessionExtraction>;
	completeAgentSession(input: {
		projectId: string;
		sessionId: string;
		status?: AgentSessionStatus;
		checkpointLabel?: string;
		completedAt?: string;
	}): Promise<TekMemoServerAgentSession>;
}

export interface TekMemoServerAuthContext {
	apiKey?: string;
	projectId?: string;
}

export interface TekMemoServerOptions {
	store: TekMemoServerStore;
	queue?: import("./storage/job-queue.js").JobQueue;
	objectStore?: import("./storage/object-store.js").ObjectStore;
	apiKeys?: string[];
	version?: string;
	defaultProjectId?: string;
	requireApiKey?: boolean;
}
