/**
 * The retrieval strategist — a 4-stage pipeline that replaces the flat
 * `buildContext()` assembler.
 *
 * @packageDocumentation
 */

export type {
	ResolveGraphNode,
	ResolveGraphEdge,
	ResolveGraphSourceRef,
	RewriteInput,
	RewriteResult,
	ResolvedEntity,
	EntityState,
	FilterInput,
	BudgetSection,
	BudgetInput,
} from "./strategist/types";

export { tokenize, rewriteQuery } from "./strategist/rewrite";
export { resolveEntities, resolveEntityState } from "./strategist/resolve";
export { filterCandidates } from "./strategist/filter";
export { allocateBudget, SECTION_WEIGHTS } from "./strategist/budget";
