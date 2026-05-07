export type {
	GraphErrorCode,
	GraphErrorOptions,
} from "./errors/graph-errors";
export {
	GraphConfigError,
	GraphConflictError,
	GraphNotFoundError,
	GraphParseError,
	GraphValidationError,
	isTekMemoGraphError,
	TekMemoGraphError,
} from "./errors/graph-errors";
export { expandFromEntities } from "./expansion/expand-from-entities";
export { extractGraphFactsRuleBased } from "./extraction/rule-based-extractor";
export { matchesMetadataFilter } from "./filters/metadata-filter";
export {
	invalidateSupersededEdges,
	markConflictingEdges,
} from "./invalidation/invalidate-superseded-edges";
export type {
	JsonlParseIssue,
	JsonlParseOptions,
	JsonlParseResult,
} from "./jsonl/jsonl";
export {
	normalizeGraphSnapshot,
	parseGraphEdgesJsonl,
	parseGraphEdgesJsonlDetailed,
	parseGraphNodesJsonl,
	parseGraphNodesJsonlDetailed,
	parseGraphSnapshot,
	serializeGraphEdgesJsonl,
	serializeGraphNodesJsonl,
	serializeGraphSnapshot,
} from "./jsonl/jsonl";
export type { InMemoryGraphStoreOptions } from "./store/in-memory-graph-store";
export {
	createInMemoryGraphStore,
	InMemoryGraphStore,
} from "./store/in-memory-graph-store";
export {
	resolveCurrentEdges,
	resolveCurrentNodes,
} from "./temporal/resolve-current-facts";
export type {
	GraphDecayInput,
	GraphDirection,
	GraphEdge,
	GraphEdgeIdentityMode,
	GraphEdgeQuery,
	GraphEdgeType,
	GraphExpansionInput,
	GraphExpansionResult,
	GraphFactStatus,
	GraphMergeNodesInput,
	GraphMetadata,
	GraphMetadataValue,
	GraphNeighbor,
	GraphNeighborQuery,
	GraphNode,
	GraphNodeQuery,
	GraphNodeType,
	GraphPath,
	GraphPathStep,
	GraphShortestPathQuery,
	GraphSnapshot,
	GraphSourceRef,
	GraphSourceSpan,
	GraphStats,
	GraphStore,
	JsonPrimitive,
	RuleBasedExtractionInput,
	RuleBasedExtractionResult,
	StoredGraphEdge,
	StoredGraphNode,
} from "./types";
export {
	assertGraphId,
	fnv1a,
	slugifyGraphPart,
	stableEdgeId,
	stableNodeId,
} from "./utils/ids";
export { cloneAndValidateMetadata, mergeMetadata } from "./utils/metadata";
export {
	cloneAndValidateSourceRefs,
	mergeSourceRefs,
	sourceLabels,
} from "./utils/source-refs";
export {
	normalizeEdge,
	normalizeNode,
	validateDepth,
	validateLimit,
	validateUnitNumber,
} from "./utils/validation";
