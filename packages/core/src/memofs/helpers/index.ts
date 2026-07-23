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
	decodeBase64Url,
	decodeCursor,
	encodeBase64Url,
	encodeCursor,
	normalizeLimit,
	type PaginationOptions,
	paginateArray,
	sliceUtf8ByBytes,
	truncateUtf8,
	utf8ByteLength,
} from "./utils";
