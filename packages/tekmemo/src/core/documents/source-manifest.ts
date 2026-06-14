/**
 * Utilities for working with memory source references.
 *
 * @remarks
 * Source references identify where memory data originated (document, note,
 * conversation, etc.) and are used to create chunk keys and validate sources.
 *
 * @public
 */

import { assertNonEmptyString } from "@repo/utils";
import { MemoryValidationError } from "../errors/errors";
import type { MemorySourceReference } from "../types/memory-documents";
import { assertJsonSerializable } from "../validation/assertions";

export function assertMemorySourceReference(
	source: MemorySourceReference,
): void {
	if (typeof source !== "object" || source === null || Array.isArray(source)) {
		throw new MemoryValidationError("source must be an object.", {
			actualType: typeof source,
		});
	}

	assertNonEmptyString(source.sourceType, "source.sourceType");
	assertNonEmptyString(source.sourceId, "source.sourceId");

	if (
		!["document", "note", "conversation", "event", "import", "graph"].includes(
			source.sourceType,
		)
	) {
		throw new MemoryValidationError("Unsupported memory source type.", {
			sourceType: source.sourceType,
		});
	}

	if (source.projectId !== undefined) {
		assertNonEmptyString(source.projectId, "source.projectId");
	}

	if (source.tenantId !== undefined) {
		assertNonEmptyString(source.tenantId, "source.tenantId");
	}

	if (source.sourcePath !== undefined) {
		assertNonEmptyString(source.sourcePath, "source.sourcePath");
	}

	assertJsonSerializable(source, "source");
}

/**
 * Creates a unique source key from a source reference.
 *
 * @param source - The source reference to create a key for.
 * @returns A colon-separated source key string.
 */
export function createSourceKey(source: MemorySourceReference): string {
	assertMemorySourceReference(source);
	return [
		source.tenantId ?? "_",
		source.projectId ?? "_",
		source.sourceType,
		source.sourceId,
	]
		.map(encodeSourceKeyPart)
		.join(":");
}

/**
 * Encodes a source key part by URL-encoding and trimming.
 *
 * @param value - The string to encode.
 * @returns The encoded string.
 */
export function encodeSourceKeyPart(value: string): string {
	return encodeURIComponent(value.trim());
}
