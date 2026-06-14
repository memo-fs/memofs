import type { JsonObject } from "./types";

export const SUPPORTED_PROTOCOL_VERSIONS = [
	"2025-11-25",
	"2025-06-18",
	"2025-03-26",
	"2024-11-05",
] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export function negotiateProtocolVersion(clientVersion: unknown): string {
	if (
		typeof clientVersion === "string" &&
		SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion as never)
	)
		return clientVersion;
	return LATEST_PROTOCOL_VERSION;
}

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

export const stringSchema = (
	description?: string,
	maxLength = 8192,
): JsonObject => ({
	type: "string",
	minLength: 1,
	maxLength,
	...(description ? { description } : {}),
});
export const numberSchema = (
	description: string,
	minimum = 0,
	maximum = 1,
): JsonObject => ({ type: "number", minimum, maximum, description });
export const booleanSchema = (description: string): JsonObject => ({
	type: "boolean",
	description,
});

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
