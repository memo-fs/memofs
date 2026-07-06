/**
 * `@memofs/json-rpc` — a dependency-free, product-neutral JSON-RPC 2.0
 * protocol SSOT for the TekMemo workspace.
 *
 * @remarks
 * Spec types + helpers (parse, validate, success/failure envelopes, the five
 * spec error codes). Extracted from `tekmemo-mcp-server`'s protocol layer so
 * every JSON-RPC-speaking package shares one implementation instead of
 * vendoring copies — the workspace DRY/SSOT rule applied to the
 * transport layer. See `packages/tekmemo-json-rpc/README.md` for the design.
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
