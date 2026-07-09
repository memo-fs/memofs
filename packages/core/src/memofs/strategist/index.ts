/**
 * The retrieval strategist — a 4-stage pipeline that replaces the flat
 * `buildContext()` assembler.
 *
 * @packageDocumentation
 */

export { allocateBudget, SECTION_WEIGHTS } from "./budget";
export { filterCandidates } from "./filter";
export { resolveEntities, resolveEntityState } from "./resolve";
export { rewriteQuery, tokenize } from "./rewrite";
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
} from "./types";
