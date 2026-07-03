/**
 * @file Test fixtures for the @tekmemo/core/recall package.
 *
 * @remarks
 * Provides factory functions to create test documents with sensible defaults.
 * Useful for unit tests and contract tests.
 *
 * @internal
 */

import type { RecallDocument } from "../types";

/**
 * Creates a single RecallDocument with sensible defaults.
 *
 * @remarks
 * Default values: id="doc_1", text about TekMemo, embedding [1, 0, 0],
 * projectId="proj_1", sourceType="document", sourceId="core", memoryType="core".
 * Any property can be overridden via the overrides parameter.
 *
 * @param overrides - Partial document properties to override defaults
 * @returns A RecallDocument with defaults merged with overrides
 *
 * @internal
 */
export function createRecallDocument(
	overrides: Partial<RecallDocument> = {},
): RecallDocument {
	const metadata = {
		projectId: "proj_1",
		sourceType: "document",
		sourceId: "core",
		memoryType: "core",
		sectionName: "Overview",
		...(overrides.metadata ?? {}),
	};

	return {
		id: overrides.id ?? "doc_1",
		text:
			overrides.text ??
			"TekMemo stores developer-owned memory in local .tekmemo files.",
		embedding: overrides.embedding ?? [1, 0, 0],
		metadata,
		...(overrides.namespace === undefined
			? {}
			: { namespace: overrides.namespace }),
	};
}

/**
 * Creates an array of sample RecallDocuments for testing.
 *
 * @remarks
 * Returns three documents with different embeddings and metadata:
 * - doc_a: TypeScript memory (tag="typescript", scoreValue=10)
 * - doc_b: Python memory (tag="python", scoreValue=5)
 * - doc_c: React memory (tag="react", scoreValue=8)
 *
 * @returns Array of test documents
 *
 * @internal
 */
export function createRecallDocuments(): RecallDocument[] {
	return [
		createRecallDocument({
			id: "doc_a",
			text: "TypeScript memory package",
			embedding: [1, 0, 0],
			metadata: {
				projectId: "proj_1",
				sourceType: "note",
				sourceId: "a",
				memoryType: "notes",
				tag: "typescript",
				scoreValue: 10,
			},
		}),
		createRecallDocument({
			id: "doc_b",
			text: "Python memory package",
			embedding: [0, 1, 0],
			metadata: {
				projectId: "proj_1",
				sourceType: "note",
				sourceId: "b",
				memoryType: "notes",
				tag: "python",
				scoreValue: 5,
			},
		}),
		createRecallDocument({
			id: "doc_c",
			text: "React agent memory",
			embedding: [0.9, 0.1, 0],
			metadata: {
				projectId: "proj_2",
				sourceType: "note",
				sourceId: "c",
				memoryType: "notes",
				tag: "react",
				scoreValue: 8,
			},
		}),
	];
}
