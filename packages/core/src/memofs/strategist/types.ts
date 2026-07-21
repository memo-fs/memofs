import type { RecallItem, TaskType } from "../types";

export interface ResolveGraphNode {
	id: string;
	type: string;
	label: string;
	aliases?: string[];
	summary?: string;
	status?: string;
}

export interface ResolveGraphEdge {
	from: string;
	to: string;
	type: string;
	status?: string;
	sourceRefs?: ResolveGraphSourceRef[];
}

export interface ResolveGraphSourceRef {
	sourceType?: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
}

export interface RewriteInput {
	query: string;
	adapterExpansions?: string[];
	taskType?: TaskType;
}

export interface RewriteResult {
	original: string;
	tokens: string[];
	expandedTerms: string[];
	expanded: boolean;
}

export interface ResolvedEntity {
	nodeId: string;
	label: string;
	type: string;
	summary: string;
	matchedTerm: string;
}

export interface EntityState {
	nodeId: string;
	label: string;
	type: string;
	currentState: string;
	summary: string;
	activeEdgeCount: number;
	provenance?: string;
}

export interface FilterInput {
	items: RecallItem[];
	retiredGraphDocIds?: ReadonlySet<string>;
	minScore?: number;
}

export interface BudgetSection {
	type: "directive" | "core" | "entities" | "recall" | "recent" | "notes";
	title: string;
	content: string;
	nonNegotiable?: boolean;
	weight?: number;
}

export interface BudgetInput {
	sections: BudgetSection[];
	maxBytes: number;
	truncationNotice?: string;
}
