/**
 * `@memofs/json-rpc` — a dependency-free, neutral JSON-RPC 2.0 protocol SSOT
 * for the MemoFS workspace.
 *
 * @remarks
 * Spec types + helpers (parse, validate, success/failure envelopes, the five
 * spec error codes). Extracted from `@memofs/mcp-server`'s protocol layer so
 * every JSON-RPC-speaking package shares one implementation instead of
 * vendoring copies — the workspace DRY/SSOT rule applied to the transport
 * layer.
 *
 * @public
 */

export {
	type JsonRpcErrorCode,
	JsonRpcProtocolError,
	type JsonRpcProtocolErrorDetails,
} from "./error";
export type {
	JsonRpcErrorResponse,
	JsonRpcId,
	JsonRpcRequest,
	JsonRpcResponse,
	JsonRpcSuccessResponse,
} from "./protocol";

export {
	failure,
	isNotification,
	isPlainObject,
	JSON_RPC_ERRORS,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "./protocol";
export type {
	JsonObject,
	JsonPrimitive,
	JsonValue,
} from "./types";
