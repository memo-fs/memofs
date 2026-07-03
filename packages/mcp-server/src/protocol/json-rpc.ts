/**
 * JSON-RPC 2.0 protocol — re-exports from the shared `@tekmemo/json-rpc`
 * SSOT, plus the MCP-layer adapter that maps the neutral protocol error back
 * into this package's own {@link McpValidationError}.
 *
 * @remarks
 * Historically this module held its own copy of the JSON-RPC types + helpers,
 * coupled to `McpValidationError`. Extracting that into
 * `@tekmemo/json-rpc` makes one spec implementation the workspace
 * SSOT (consumed here and by `tekmemo-server`'s runtime API). The MCP layer
 * keeps its error identity by catching the neutral
 * {@link JsonRpcProtocolError} and re-throwing as `McpValidationError` at the
 * call sites in `protocol/server.ts` — the protocol layer never imports a
 * consumer's error classes, and the consumer keeps its own hierarchy.
 *
 * @module json-rpc
 */

export {
	failure,
	isNotification,
	JSON_RPC_ERRORS,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "@tekmemo/json-rpc";

export type {
	JsonRpcErrorResponse,
	JsonRpcId,
	JsonRpcRequest,
	JsonRpcResponse,
	JsonRpcSuccessResponse,
} from "@tekmemo/json-rpc";

// Re-exported for callers that need the neutral protocol error directly (e.g.
// the adapter below, or advanced consumers). Not part of the MCP error
// hierarchy — it is the transport-layer error.
export { JsonRpcProtocolError } from "@tekmemo/json-rpc";
