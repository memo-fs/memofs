/**
 * Shared internal helpers for MemoFS runtime implementations.
 *
 * @internal
 */

export {
	AGENT_CONTEXT_DIRECTIVE,
	buildContext,
} from "./context-builder";
export {
	decodeCursor,
	encodeCursor,
	normalizeLimit,
	type PaginationOptions,
	paginateArray,
	truncateUtf8,
} from "./utils";
