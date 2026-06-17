import {
	cloneRecord,
	type JsonValue,
	type RecallDocument,
	type RecallMetadata,
	RecallValidationError,
	validateMetadata,
} from "@tekbreed/tekmemo";
import { UpstashRecallValidationError } from "../errors/upstash-errors";

/**
 * @file Metadata normalization for Upstash Vector.
 *
 * @remarks
 * Upstash Vector metadata must be a flat JSON object. This module
 * normalizes TekMemo recall documents into Upstash-compatible metadata
 * and handles result metadata parsing.
 *
 * @internal
 */

/**
 * Represents Upstash-compatible metadata as a flat record of JSON values.
 *
 * @public
 */
export type UpstashMetadata = Record<string, JsonValue | undefined>;

const RESERVED_METADATA_KEYS = new Set([
	"__proto__",
	"prototype",
	"constructor",
]);

/**
 * Normalizes a TekMemo recall document into Upstash-compatible metadata.
 *
 * @param document - The recall document to normalize.
 * @returns The normalized metadata object for Upstash.
 * @throws {UpstashRecallValidationError} If the metadata contains reserved keys or is invalid.
 *
 * @public
 */
export function normalizeUpstashMetadata(
	document: RecallDocument,
): UpstashMetadata {
	let metadata: RecallMetadata;
	try {
		metadata = validateMetadata(document.metadata);
	} catch (error) {
		if (error instanceof RecallValidationError) {
			throw new UpstashRecallValidationError(error.message, error.details);
		}
		throw error;
	}
	const output = cloneRecord(metadata) as UpstashMetadata;

	output.projectId = metadata.projectId;
	output.sourceType = metadata.sourceType;
	output.sourceId = metadata.sourceId;
	output.memoryType = metadata.memoryType;

	if (document.namespace !== undefined) output.namespace = document.namespace;

	for (const key of Object.keys(output)) {
		if (RESERVED_METADATA_KEYS.has(key)) {
			throw new UpstashRecallValidationError(
				"Metadata contains a reserved key.",
				{ key },
			);
		}
	}

	return output;
}

/**
 * Normalizes metadata from an Upstash query result.
 *
 * @remarks
 * Upstash results may contain provider-specific metadata. This function
 * attempts to validate and clone the metadata, falling back to a safe
 * clone if TekMemo validation fails.
 *
 * @param value - The raw metadata value from Upstash.
 * @returns The normalized metadata record, or undefined if the value is null/undefined.
 *
 * @public
 */
export function normalizeResultMetadata(
	value: unknown,
): Record<string, JsonValue | undefined> | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "object" || Array.isArray(value)) return undefined;

	const candidate = value as Record<string, unknown>;
	try {
		validateMetadata(candidate as unknown as RecallMetadata);
	} catch {
		// Upstash results can contain provider/system metadata. Preserve JSON-safe
		// records instead of requiring every result payload to be TekMemo metadata.
	}

	return cloneRecord(candidate as Record<string, JsonValue | undefined>);
}
