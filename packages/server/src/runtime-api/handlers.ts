/**
 * Runtime-API method handlers — each maps a JSON-RPC method to a
 * {@link MemoFS} client call.
 *
 * @remarks
 * The method surface mirrors the frozen `MemoFS` public API (`recall`,
 * `context`, `core`, `notes`, `graph`, `snapshots`, `health`). This **is** the
 * two-Worker boundary: the runtime API the commercial Worker reaches
 * over a Service Binding is the same surface an OSS self-hoster gets over HTTP.
 *
 * Read handlers run live at slice 1. Write handlers (the gated set) only run
 * once slice 3's concurrency layer is injected; the dispatcher refuses them
 * with `503` until then (see {@link dispatch}). They are defined here so the
 * slice-3 flip is "inject the lock + drop the gate," not "add new routes."
 *
 * Param extraction is defensive: every field is narrowed from `unknown`
 * before it reaches the typed {@link MemoFS} call, so a malformed payload
 * surfaces as a clean `invalidParams` JSON-RPC error, never a runtime crash.
 *
 * @module handlers
 */

import type { MemoFS } from "@memofs/core";
import type { JsonObject, JsonValue } from "@memofs/json-rpc";
import { RUNTIME_METHOD } from "../protocol/methods";

/**
 * A method handler: given the assembled runtime + the validated JSON-RPC
 * `params` object, returns the JSON-serializable result.
 */
export type RuntimeMethodHandler = (
	tek: MemoFS,
	params: JsonObject,
) => Promise<JsonValue>;

/** Extracts an optional string field from params, or `undefined`. */
function optionalString(params: JsonObject, key: string): string | undefined {
	const value = params[key];
	return typeof value === "string" ? value : undefined;
}

/** Extracts a required string field from params; throws `invalidParams`. */
function requiredString(params: JsonObject, key: string): string {
	const value = params[key];
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`"${key}" is required and must be a non-empty string.`);
	}
	return value;
}

/** Extracts an optional number field from params, or `undefined`. */
function optionalNumber(params: JsonObject, key: string): number | undefined {
	const value = params[key];
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

/** Extracts an optional boolean field from params, or `undefined`. */
function optionalBoolean(params: JsonObject, key: string): boolean | undefined {
	const value = params[key];
	return typeof value === "boolean" ? value : undefined;
}

/** Extracts an optional plain-object field from params, or `undefined`. */
function optionalObject(
	params: JsonObject,
	key: string,
): JsonObject | undefined {
	const value = params[key];
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as JsonObject)
		: undefined;
}

/**
 * The complete method → handler map. Read methods run live; the gated
 * mutating methods run only once the dispatcher injects a concurrency layer
 * (slice 3). Grouped read-first, then mutating.
 */
export const RUNTIME_HANDLERS: Record<string, RuntimeMethodHandler> = {
	// ── Reads (live) ──────────────────────────────────────────────────────
	async [RUNTIME_METHOD.health](tek) {
		return (await tek.health()) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.recall](tek, params) {
		const query = requiredString(params, "query");
		return (await tek.recall(query, {
			...(optionalNumber(params, "limit") === undefined
				? {}
				: { limit: optionalNumber(params, "limit") }),
			...(optionalObject(params, "filter") === undefined
				? {}
				: { filter: optionalObject(params, "filter") as never }),
			...(optionalString(params, "namespace") === undefined
				? {}
				: { namespace: optionalString(params, "namespace") }),
			...(optionalString(params, "workspaceId") === undefined
				? {}
				: { workspaceId: optionalString(params, "workspaceId") }),
			...(optionalString(params, "projectId") === undefined
				? {}
				: { projectId: optionalString(params, "projectId") }),
		})) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.context](tek, params) {
		return (await tek.context(params as never)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.readCore](tek) {
		return { content: await tek.core.read() } as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.readNotes](tek) {
		return { content: await tek.notes.read() } as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.readConversations](tek) {
		return {
			items: await tek.conversations.read(),
		} as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.listRecent](tek, params) {
		return (await tek.listRecentMemories(
			optionalNumber(params, "limit") === undefined
				? {}
				: { limit: optionalNumber(params, "limit") },
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.validate](tek, params) {
		return (await tek.validate(
			optionalBoolean(params, "strict") === undefined
				? {}
				: { strict: optionalBoolean(params, "strict") },
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.listNodes](tek, params) {
		return (await tek.graph.listNodes(
			buildListParams(params),
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.listEdges](tek, params) {
		return (await tek.graph.listEdges(
			buildListParams(params),
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.graphNeighbors](tek, params) {
		return (await tek.graph.neighbors(params as never)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.graphPath](tek, params) {
		return (await tek.graph.path(params as never)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.listSnapshots](tek) {
		return { items: await tek.snapshots.list() } as unknown as JsonValue;
	},

	// ── Writes (gated on slice 3 — refused with 503 until the concurrency
	// layer merges; handlers exist so the slice-3 flip drops the gate) ──
	async [RUNTIME_METHOD.write](tek, params) {
		return (await tek.writeMemory(params as never)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.recordNote](tek, params) {
		const content = requiredString(params, "content");
		return (await tek.notes.record({
			content,
			kind: "note",
			...(optionalString(params, "title") === undefined
				? {}
				: { title: optionalString(params, "title") }),
		})) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.updateCore](tek, params) {
		await tek.core.update(requiredString(params, "content"));
		return { ok: true } as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.appendConversation](tek, params) {
		await tek.conversations.append(params as never);
		return { ok: true } as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.upsertNodes](tek, params) {
		return (await tek.graph.upsertNodes(
			params as never,
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.upsertEdges](tek, params) {
		return (await tek.graph.upsertEdges(
			params as never,
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.consolidate](tek, params) {
		return (await tek.consolidate(
			optionalBoolean(params, "apply") === undefined
				? {}
				: { apply: optionalBoolean(params, "apply") },
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.createSnapshot](tek, params) {
		return (await tek.snapshots.create(
			optionalString(params, "label") === undefined
				? {}
				: { label: optionalString(params, "label") },
		)) as unknown as JsonValue;
	},

	async [RUNTIME_METHOD.restoreSnapshot](tek, params) {
		await tek.snapshots.restore(requiredString(params, "id"));
		return { ok: true } as unknown as JsonValue;
	},
};

/**
 * Builds the shared graph list params (`limit`, `cursor`) from the JSON-RPC
 * params object. Used by `listNodes` + `listEdges`.
 */
function buildListParams(params: JsonObject): {
	limit?: number;
	cursor?: string;
} {
	return {
		...(optionalNumber(params, "limit") === undefined
			? {}
			: { limit: optionalNumber(params, "limit") }),
		...(optionalString(params, "cursor") === undefined
			? {}
			: { cursor: optionalString(params, "cursor") }),
	};
}
