/**
 * The retrieval strategist — a 4-stage pipeline that replaces the flat
 * `buildContext()` assembler.
 *
 * @packageDocumentation
 */

export { allocateBudget, SECTION_WEIGHTS } from "./strategist/budget";
export { filterCandidates } from "./strategist/filter";
export { resolveEntities, resolveEntityState } from "./strategist/resolve";
export { rewriteQuery, tokenize } from "./strategist/rewrite";
export type {
	BudgetInput,
	BudgetSection,
	EntityState,
	FilterInput,
	ResolvedEntity,
	ResolveGraphEdge,
	ResolveGraphNode,
	ResolveGraphSourceRef,
	RewriteInput,
	RewriteResult,
} from "./strategist/types";
