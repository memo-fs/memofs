import { GraphValidationError } from "../errors/graph-errors";
import type {
	GraphEdge,
	GraphEdgeIdentityMode,
	GraphFactStatus,
	GraphNode,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { uniqueStrings } from "./clone";
import { assertDedupeKey, assertGraphId, stableEdgeId } from "./ids";
import { cloneAndValidateMetadata, mergeMetadata } from "./metadata";
import {
	cloneAndValidateSourceRefs,
	mergeSourceRefs,
	sourceRefsIdentity,
} from "./source-refs";
import { assertIsoDate, nowIso, toDate } from "./time";

const VALID_STATUSES: ReadonlySet<GraphFactStatus> = new Set([
	"active",
	"deprecated",
	"conflicted",
	"deleted",
]);
const VALID_EDGE_IDENTITY_MODES: ReadonlySet<GraphEdgeIdentityMode> = new Set([
	"canonical",
	"source-aware",
	"event-aware",
]);
const MAX_LABEL_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 16_384;
const MAX_TYPE_LENGTH = 96;
const MAX_ALIASES = 64;

export function normalizeNode(
	input: GraphNode,
	existing?: StoredGraphNode,
): StoredGraphNode {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw new GraphValidationError("node must be a plain object.");
	}

	assertGraphId(input.id, "node.id");
	const type = normalizeType(input.type, "node.type");
	const label = normalizeRequiredText(
		input.label,
		"node.label",
		MAX_LABEL_LENGTH,
	);
	const now = nowIso();
	const createdAt = input.createdAt ?? existing?.createdAt ?? now;
	const updatedAt = input.updatedAt ?? now;

	assertIsoDate(createdAt, "node.createdAt");
	assertIsoDate(updatedAt, "node.updatedAt");
	assertTemporalFields(
		input.validFrom,
		input.validUntil,
		input.expiresAt,
		"node",
	);

	const status = normalizeStatus(input.status ?? existing?.status ?? "active");
	const aliases = uniqueStrings([
		...(existing?.aliases ?? []),
		...normalizeAliases(input.aliases, "node.aliases"),
	])
		.filter((alias: string) => alias.toLowerCase() !== label.toLowerCase())
		.slice(0, MAX_ALIASES);

	const summary =
		input.summary === undefined
			? existing?.summary
			: normalizeOptionalText(
					input.summary,
					"node.summary",
					MAX_SUMMARY_LENGTH,
				);

	return {
		...input,
		id: input.id,
		type,
		label,
		aliases,
		summary,
		confidence: normalizeUnit(
			input.confidence ?? existing?.confidence ?? 1,
			"node.confidence",
		),
		importance: normalizeUnit(
			input.importance ?? existing?.importance ?? 0.5,
			"node.importance",
		),
		status,
		validFrom: input.validFrom ?? existing?.validFrom,
		validUntil: input.validUntil ?? existing?.validUntil,
		expiresAt: input.expiresAt ?? existing?.expiresAt,
		sourceRefs: mergeSourceRefs(
			existing?.sourceRefs,
			cloneAndValidateSourceRefs(input.sourceRefs),
		),
		metadata: mergeMetadata(
			existing?.metadata,
			cloneAndValidateMetadata(input.metadata),
		),
		createdAt,
		updatedAt,
	};
}

export function normalizeEdge(
	input: GraphEdge,
	options?: {
		existing?: StoredGraphEdge;
		allowSelfEdges?: boolean;
		edgeIdentityMode?: GraphEdgeIdentityMode;
	},
): StoredGraphEdge {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw new GraphValidationError("edge must be a plain object.");
	}

	assertGraphId(input.from, "edge.from");
	assertGraphId(input.to, "edge.to");
	if (input.from === input.to && !options?.allowSelfEdges) {
		throw new GraphValidationError(
			"self edges are disabled for this graph store.",
		);
	}

	const type = normalizeType(input.type, "edge.type");
	const directed = input.directed ?? options?.existing?.directed ?? true;
	const identityMode = normalizeEdgeIdentityMode(
		options?.edgeIdentityMode ?? "canonical",
	);
	assertDedupeKey(input.dedupeKey, "edge.dedupeKey");
	const normalizedDedupeKey = input.dedupeKey?.trim();
	const id =
		input.id ??
		options?.existing?.id ??
		stableEdgeId({
			from: input.from,
			type,
			to: input.to,
			directed,
			dedupeKey: buildEdgeIdentitySalt(input, identityMode),
		});
	assertGraphId(id, "edge.id");

	const now = nowIso();
	const createdAt = input.createdAt ?? options?.existing?.createdAt ?? now;
	const updatedAt = input.updatedAt ?? now;

	assertIsoDate(createdAt, "edge.createdAt");
	assertIsoDate(updatedAt, "edge.updatedAt");
	assertTemporalFields(
		input.validFrom,
		input.validUntil,
		input.expiresAt,
		"edge",
	);

	return {
		...input,
		id,
		from: input.from,
		to: input.to,
		type,
		directed,
		dedupeKey: normalizedDedupeKey ?? options?.existing?.dedupeKey,
		weight: normalizeUnit(
			input.weight ?? options?.existing?.weight ?? 1,
			"edge.weight",
		),
		confidence: normalizeUnit(
			input.confidence ?? options?.existing?.confidence ?? 1,
			"edge.confidence",
		),
		status: normalizeStatus(
			input.status ?? options?.existing?.status ?? "active",
		),
		validFrom: input.validFrom ?? options?.existing?.validFrom,
		validUntil: input.validUntil ?? options?.existing?.validUntil,
		expiresAt: input.expiresAt ?? options?.existing?.expiresAt,
		sourceRefs: mergeSourceRefs(
			options?.existing?.sourceRefs,
			cloneAndValidateSourceRefs(input.sourceRefs),
		),
		metadata: mergeMetadata(
			options?.existing?.metadata,
			cloneAndValidateMetadata(input.metadata),
		),
		createdAt,
		updatedAt,
	};
}

export function edgeIdentitySalt(
	input: GraphEdge,
	mode: GraphEdgeIdentityMode,
): string | undefined {
	return buildEdgeIdentitySalt(input, mode);
}

export function resolveEdgeId(
	edge: GraphEdge,
	options: {
		allowSelfEdges: boolean;
		edgeIdentityMode: GraphEdgeIdentityMode;
	},
): string {
	if (edge.id) return edge.id;
	const preview = normalizeEdge(edge, options);
	return (
		preview.id ??
		stableEdgeId({
			from: preview.from,
			type: preview.type,
			to: preview.to,
			directed: preview.directed,
			dedupeKey: edgeIdentitySalt(preview, options.edgeIdentityMode),
		})
	);
}

export function normalizeEdgeIdentityMode(
	value: unknown,
): GraphEdgeIdentityMode {
	if (
		typeof value !== "string" ||
		!VALID_EDGE_IDENTITY_MODES.has(value as GraphEdgeIdentityMode)
	) {
		throw new GraphValidationError(
			"edgeIdentityMode must be canonical, source-aware, or event-aware.",
		);
	}
	return value as GraphEdgeIdentityMode;
}

export function validateLimit(
	limit: number | undefined,
	defaultLimit: number,
	maxLimit = 1000,
): number {
	if (limit === undefined) return defaultLimit;
	if (!Number.isInteger(limit) || limit <= 0 || limit > maxLimit) {
		throw new GraphValidationError(
			`limit must be an integer between 1 and ${maxLimit}.`,
		);
	}
	return limit;
}

export function validateDepth(
	depth: number | undefined,
	defaultDepth: number,
	maxDepth = 6,
): number {
	if (depth === undefined) return defaultDepth;
	if (!Number.isInteger(depth) || depth < 0 || depth > maxDepth) {
		throw new GraphValidationError(
			`depth must be an integer between 0 and ${maxDepth}.`,
		);
	}
	return depth;
}

export function validateUnitNumber(value: number, fieldName: string): void {
	normalizeUnit(value, fieldName);
}

export function normalizeUnit(value: unknown, fieldName: string): number {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		throw new GraphValidationError(
			`${fieldName} must be a finite number between 0 and 1.`,
		);
	}
	return value;
}

export function normalizeStatus(value: unknown): GraphFactStatus {
	if (
		typeof value !== "string" ||
		!VALID_STATUSES.has(value as GraphFactStatus)
	) {
		throw new GraphValidationError(
			"status must be active, deprecated, conflicted, or deleted.",
		);
	}
	return value as GraphFactStatus;
}

function normalizeAliases(value: unknown, fieldName: string): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new GraphValidationError(`${fieldName} must be an array of strings.`);
	}
	if (value.length > MAX_ALIASES) {
		throw new GraphValidationError(
			`${fieldName} can contain at most ${MAX_ALIASES} entries.`,
		);
	}
	return value.map((item, index) => {
		if (typeof item !== "string") {
			throw new GraphValidationError(
				`${fieldName}[${index}] must be a string.`,
			);
		}
		const trimmed = item.trim();
		if (!trimmed) {
			throw new GraphValidationError(`${fieldName}[${index}] cannot be empty.`);
		}
		if (trimmed.length > MAX_LABEL_LENGTH) {
			throw new GraphValidationError(`${fieldName}[${index}] is too long.`);
		}
		return trimmed;
	});
}

function normalizeType(value: unknown, fieldName: string): string {
	if (typeof value !== "string")
		throw new GraphValidationError(`${fieldName} must be a string.`);
	const trimmed = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_:-]+/g, "_");
	if (!trimmed || trimmed.length > MAX_TYPE_LENGTH)
		throw new GraphValidationError(`${fieldName} is invalid.`);
	return trimmed;
}

function normalizeRequiredText(
	value: unknown,
	fieldName: string,
	maxLength: number,
): string {
	if (typeof value !== "string")
		throw new GraphValidationError(`${fieldName} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new GraphValidationError(`${fieldName} is required.`);
	if (trimmed.length > maxLength)
		throw new GraphValidationError(`${fieldName} is too long.`);
	return trimmed;
}

function normalizeOptionalText(
	value: unknown,
	fieldName: string,
	maxLength: number,
): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string")
		throw new GraphValidationError(`${fieldName} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (trimmed.length > maxLength)
		throw new GraphValidationError(`${fieldName} is too long.`);
	return trimmed;
}

function assertTemporalFields(
	validFrom: string | undefined,
	validUntil: string | undefined,
	expiresAt: string | undefined,
	prefix: string,
): void {
	if (validFrom !== undefined) assertIsoDate(validFrom, `${prefix}.validFrom`);
	if (validUntil !== undefined)
		assertIsoDate(validUntil, `${prefix}.validUntil`);
	if (expiresAt !== undefined) assertIsoDate(expiresAt, `${prefix}.expiresAt`);
	const from = toDate(validFrom, `${prefix}.validFrom`);
	const until = toDate(validUntil, `${prefix}.validUntil`);
	if (from && until && from >= until) {
		throw new GraphValidationError(
			`${prefix}.validFrom must be before ${prefix}.validUntil.`,
		);
	}
}

function buildEdgeIdentitySalt(
	input: GraphEdge,
	mode: GraphEdgeIdentityMode,
): string | undefined {
	const explicit = input.dedupeKey?.trim();
	if (mode === "canonical") return explicit;

	const sourceIdentity = sourceRefsIdentity(input.sourceRefs);
	if (mode === "source-aware") return explicit ?? sourceIdentity;

	return (
		[
			explicit,
			sourceIdentity,
			input.createdAt,
			input.validFrom,
			input.validUntil,
			input.expiresAt,
		]
			.filter(
				(item): item is string => typeof item === "string" && item.length > 0,
			)
			.join("\u001f") || undefined
	);
}
