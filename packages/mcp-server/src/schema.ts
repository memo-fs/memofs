/**
 * MCP Protocol schema definitions, version negotiation, and parameter constraints.
 *
 * @module schema
 */

import type { JsonObject } from "./types";

/**
 * List of MCP protocol versions supported by the server, ordered descending.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
	"2025-11-25",
	"2025-06-18",
	"2025-03-26",
	"2024-11-05",
] as const;

/**
 * The latest/default protocol version supported by the server.
 */
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

/**
 * Negotiates the protocol version to use based on client version.
 * Returns the client version if supported, otherwise defaults to the latest supported version.
 *
 * @param clientVersion - The version requested by the client.
 * @returns The negotiated protocol version.
 */
export function negotiateProtocolVersion(clientVersion: unknown): string {
	if (
		typeof clientVersion === "string" &&
		SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion as never)
	)
		return clientVersion;
	return LATEST_PROTOCOL_VERSION;
}

/**
 * Generates an MCP JSON Schema object type configuration.
 *
 * @param properties - Inner properties schema mappings.
 * @param required - Array of required property keys.
 * @param extra - Optional extra schema mappings.
 * @returns The formatted JSON schema object.
 */
export function objectSchema(
	properties: JsonObject,
	required: string[] = [],
	extra: JsonObject = {},
): JsonObject {
	return {
		type: "object",
		additionalProperties: false,
		properties,
		required,
		...extra,
	};
}

/**
 * Helper to generate a JSON Schema string property configuration.
 *
 * @param description - Human-readable description of the field.
 * @param maxLength - Maximum allowed string length.
 * @returns The JSON Schema string property object.
 */
export const stringSchema = (
	description?: string,
	maxLength = 8192,
): JsonObject => ({
	type: "string",
	minLength: 1,
	maxLength,
	...(description ? { description } : {}),
});

/**
 * Helper to generate a JSON Schema number property configuration.
 *
 * @param description - Human-readable description.
 * @param minimum - Minimum numeric constraint.
 * @param maximum - Maximum numeric constraint.
 * @returns The JSON Schema number property object.
 */
export const numberSchema = (
	description: string,
	minimum = 0,
	maximum = 1,
): JsonObject => ({ type: "number", minimum, maximum, description });

/**
 * Helper to generate a JSON Schema boolean property configuration.
 *
 * @param description - Human-readable description.
 * @returns The JSON Schema boolean property object.
 */
export const booleanSchema = (description: string): JsonObject => ({
	type: "boolean",
	description,
});

/**
 * JSON Schema definition representing a single SourceRef.
 */
export const sourceRefSchema: JsonObject = objectSchema(
	{
		sourceType: stringSchema(
			"Source type, e.g. document, conversation, connector, manual.",
			128,
		),
		sourceId: stringSchema("Stable source identifier.", 256),
		path: stringSchema("Workspace-relative source path.", 2048),
		title: stringSchema("Human-readable source title.", 512),
		url: stringSchema("HTTP(S) URL for external provenance.", 2048),
		metadata: { type: "object", description: "JSON metadata." },
	},
	["sourceType"],
);

/**
 * JSON Schema definition representing a single GraphNode.
 */
export const graphNodeSchema: JsonObject = objectSchema(
	{
		id: stringSchema("Stable graph node id.", 256),
		type: stringSchema("Node type.", 128),
		label: stringSchema("Human-readable node label.", 512),
		aliases: { type: "array", items: stringSchema("Alias", 256), maxItems: 50 },
		summary: stringSchema("Short node summary.", 4096),
		confidence: numberSchema("Confidence score.", 0, 1),
		importance: numberSchema("Importance score.", 0, 1),
		status: stringSchema("Fact status.", 64),
		sourceRefs: { type: "array", items: sourceRefSchema, maxItems: 100 },
		metadata: { type: "object", description: "JSON metadata." },
	},
	["id", "type", "label"],
);

/**
 * JSON Schema definition representing a single GraphEdge.
 */
export const graphEdgeSchema: JsonObject = objectSchema(
	{
		id: stringSchema("Stable graph edge id.", 256),
		from: stringSchema("Source node id.", 256),
		to: stringSchema("Target node id.", 256),
		type: stringSchema("Relationship type.", 128),
		directed: booleanSchema("Whether this edge is directed."),
		dedupeKey: stringSchema("Optional key for preserving parallel facts.", 256),
		weight: numberSchema("Relationship strength.", 0, 1),
		confidence: numberSchema("Confidence score.", 0, 1),
		status: stringSchema("Fact status.", 64),
		sourceRefs: { type: "array", items: sourceRefSchema, maxItems: 100 },
		metadata: { type: "object", description: "JSON metadata." },
	},
	["from", "to", "type"],
);
