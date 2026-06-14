export type MemoryScope = "workspace" | "user";

/**
 * A recall search hit with relevance score.
 */
export interface MemoryHit {
	/** Unique identifier of the hit. */
	id: string;
	/** The text content of the hit. */
	text: string;
	/** Relevance score (higher = more relevant). */
	score: number;
	/** Whether this hit is from workspace or user scope. */
	scope: MemoryScope;
	/** Optional metadata attached to the hit. */
	metadata?: Record<string, unknown>;
}

/**
 * Plan describing what memory to retrieve and how to prioritize it.
 */
export interface RetrievalPlan {
	/** Which memory scopes are allowed for retrieval. */
	allowedScopes: MemoryScope[];
	/** Whether to read user-scoped core memory. */
	readUserMemory: boolean;
	/** Whether to read workspace-scoped archival (notes) memory. */
	readArchivalMemory: boolean;
	/** Whether to include recall search results. */
	includeRecall: boolean;
	/** Order of precedence for memory sections. */
	precedence: MemoryScope[];
}
