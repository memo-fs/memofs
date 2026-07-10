/**
 * Minimal JSON value types for JSON-RPC 2.0 protocol structures.
 *
 * @remarks
 * Defined locally so this package stays dependency-free — JSON-RPC is a pure
 * spec layer with no coupling to any product's domain types. Mirrors the
 * ubiquitous `JsonValue`/`JsonObject` shapes used across the workspace.
 *
 * @public
 */

/** A primitive JSON scalar. */
export type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value (recursive). */
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/** A plain JSON object. */
export type JsonObject = Record<string, unknown>;
