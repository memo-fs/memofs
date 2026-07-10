/**
 * @file Validation and assertion utilities for the recall package.
 *
 * @remarks
 * Provides functions to validate and assert types for embeddings, documents,
 * queries, filters, and other recall-related data structures.
 *
 * @internal
 */

import {
	assertFiniteNumber as baseAssertFiniteNumber,
	assertNonEmptyString as baseAssertNonEmptyString,
	assertPositiveInteger as baseAssertPositiveInteger,
} from "@repo/utils";
import { RecallDimensionError, RecallValidationError } from "../errors/errors";
import type { RecallDocument, RecallMetadata, RecallQuery } from "../types";
import {
	assertJsonValue,
	assertSafeObjectKey,
	isPlainObject,
} from "../utils/json";

const ID_PATTERN = /^[A-Za-z0-9._:@#-]{1,256}$/;
const NAMESPACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const FILTER_KEY_PATTERN = /^[A-Za-z0-9_.:@#/-]{1,256}$/;

/**
 * Asserts that a value is a non-empty string.
 *
 * @param value - The value to check
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the value is not a non-empty string or contains null bytes
 *
 * @internal
 */
export function assertNonEmptyString(
	value: unknown,
	name: string,
): asserts value is string {
	baseAssertNonEmptyString(value, name, RecallValidationError);
}

/**
 * Asserts that a value is a safe ID string.
 *
 * @remarks
 * IDs must match the pattern /^[A-Za-z0-9._:@#-]{1,256}$/ and must not
 * contain path traversal sequences (..) or path separators (/, \).
 *
 * @param value - The value to check
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the value is not a valid safe ID
 *
 * @internal
 */
export function assertSafeId(
	value: unknown,
	name: string,
): asserts value is string {
	assertNonEmptyString(value, name);
	if (value.includes("..") || value.includes("/") || value.includes("\\")) {
		throw new RecallValidationError(
			`${name} must not contain path traversal or path separators.`,
			{ name, value },
		);
	}
	if (!ID_PATTERN.test(value)) {
		throw new RecallValidationError(
			`${name} contains unsupported characters.`,
			{ name, value },
		);
	}
}

/**
 * Asserts that a value is a safe namespace string.
 *
 * @remarks
 * Namespaces must match /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/ and must not
 * contain path traversal, start/end with "/", or use backslashes.
 *
 * @param value - The value to check
 * @param name - Name to use in error messages (defaults to "namespace")
 * @throws {RecallValidationError} If the value is not a valid namespace
 *
 * @internal
 */
export function assertNamespace(
	value: unknown,
	name = "namespace",
): asserts value is string {
	assertNonEmptyString(value, name);
	if (
		value.includes("..") ||
		value.includes("\\") ||
		value.startsWith("/") ||
		value.endsWith("/")
	) {
		throw new RecallValidationError(`${name} is unsafe.`, { name, value });
	}
	if (!NAMESPACE_PATTERN.test(value)) {
		throw new RecallValidationError(
			`${name} contains unsupported characters.`,
			{ name, value },
		);
	}
}

/**
 * Asserts that a value is a positive integer.
 *
 * @param value - The value to check
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the value is not a positive integer
 *
 * @internal
 */
export function assertPositiveInteger(
	value: unknown,
	name: string,
): asserts value is number {
	baseAssertPositiveInteger(value, name, RecallValidationError);
}

/**
 * Asserts that a value is a finite number.
 *
 * @param value - The value to check
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the value is not a finite number
 *
 * @internal
 */
export function assertFiniteNumber(
	value: unknown,
	name: string,
): asserts value is number {
	baseAssertFiniteNumber(value, name, RecallValidationError);
}

/**
 * Validates and returns an embedding array.
 *
 * @remarks
 * Ensures the value is an array of finite numbers. Optionally validates
 * that the dimension matches the expected dimension.
 *
 * @param value - The value to validate
 * @param name - Name to use in error messages (defaults to "embedding")
 * @param expectedDimension - Optional expected embedding dimension
 * @returns The validated embedding array
 * @throws {RecallValidationError} If the value is not a valid embedding
 * @throws {RecallDimensionError} If dimension doesn't match expected
 *
 * @public
 */
export function validateEmbedding(
	value: unknown,
	name = "embedding",
	expectedDimension?: number,
): number[] {
	if (!Array.isArray(value)) {
		throw new RecallValidationError(`${name} must be an array of numbers.`, {
			name,
		});
	}
	if (value.length === 0) {
		throw new RecallDimensionError(`${name} must not be empty.`, { name });
	}
	if (expectedDimension !== undefined && value.length !== expectedDimension) {
		throw new RecallDimensionError(`${name} dimension mismatch.`, {
			name,
			expectedDimension,
			actualDimension: value.length,
		});
	}
	return value.map((item, index) => {
		assertFiniteNumber(item, `${name}[${index}]`);
		return item;
	});
}

/**
 * Validates an optional namespace value.
 *
 * @param value - The value to validate (may be undefined)
 * @returns The validated namespace string, or undefined
 * @throws {RecallValidationError} If the value is not a valid namespace
 *
 * @internal
 */
export function validateOptionalNamespace(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	assertNamespace(value);
	return value;
}

/**
 * Validates and returns a RecallMetadata object.
 *
 * @remarks
 * Validates required fields (projectId, sourceType, sourceId, memoryType)
 * and ensures all values are JSON-serializable.
 *
 * @param value - The value to validate
 * @param name - Name to use in error messages (defaults to "metadata")
 * @returns The validated metadata object
 * @throws {RecallValidationError} If the value is not valid metadata
 *
 * @public
 */
export function validateMetadata(
	value: unknown,
	name = "metadata",
): RecallMetadata {
	if (!isPlainObject(value)) {
		throw new RecallValidationError(`${name} must be an object.`, { name });
	}

	assertSafeId(value.projectId, `${name}.projectId`);
	assertSafeId(value.sourceType, `${name}.sourceType`);
	assertSafeId(value.sourceId, `${name}.sourceId`);
	assertNonEmptyString(value.memoryType, `${name}.memoryType`);

	if (value.tenantId !== undefined)
		assertSafeId(value.tenantId, `${name}.tenantId`);
	if (value.sectionName !== undefined)
		assertNonEmptyString(value.sectionName, `${name}.sectionName`);
	if (value.sourcePath !== undefined)
		assertNonEmptyString(value.sourcePath, `${name}.sourcePath`);

	for (const [key, item] of Object.entries(value)) {
		assertSafeObjectKey(key, `${name}.${key}`);
		if (item !== undefined) assertJsonValue(item, `${name}.${key}`);
	}

	return value as unknown as RecallMetadata;
}

/**
 * Validates and returns a RecallDocument.
 *
 * @remarks
 * Validates all document fields including id, text, embedding, and metadata.
 *
 * @param value - The value to validate
 * @param expectedDimension - Optional expected embedding dimension
 * @returns The validated document
 * @throws {RecallValidationError} If the value is not a valid document
 * @throws {RecallDimensionError} If embedding dimension doesn't match
 *
 * @public
 */
export function validateRecallDocument(
	value: unknown,
	expectedDimension?: number,
): RecallDocument {
	if (!isPlainObject(value)) {
		throw new RecallValidationError("Recall document must be an object.");
	}

	assertSafeId(value.id, "document.id");
	assertNonEmptyString(value.text, "document.text");
	const embedding = validateEmbedding(
		value.embedding,
		"document.embedding",
		expectedDimension,
	);
	const metadata = validateMetadata(value.metadata, "document.metadata");
	const namespace = validateOptionalNamespace(value.namespace);

	return {
		id: value.id,
		text: value.text,
		embedding,
		metadata,
		...(namespace === undefined ? {} : { namespace }),
	};
}

/**
 * Validates and returns an array of RecallDocuments.
 *
 * @param documents - The value to validate (should be an array)
 * @param expectedDimension - Optional expected embedding dimension
 * @returns Array of validated documents
 * @throws {RecallValidationError} If the input is not a valid array of documents
 * @throws {RecallDimensionError} If any embedding dimension doesn't match
 *
 * @public
 */
export function validateRecallDocuments(
	documents: unknown,
	expectedDimension?: number,
): RecallDocument[] {
	if (!Array.isArray(documents)) {
		throw new RecallValidationError("documents must be an array.");
	}
	return documents.map((document, index) =>
		validateRecallDocumentWithName(
			document,
			`documents[${index}]`,
			expectedDimension,
		),
	);
}

/**
 * Validates a RecallDocument with a custom name for error messages.
 *
 * @param value - The value to validate
 * @param name - Name to use in error messages
 * @param expectedDimension - Optional expected embedding dimension
 * @returns The validated document
 * @throws {RecallValidationError} If the value is not a valid document
 *
 * @internal
 */
function validateRecallDocumentWithName(
	value: unknown,
	name: string,
	expectedDimension?: number,
): RecallDocument {
	try {
		return validateRecallDocument(value, expectedDimension);
	} catch (error) {
		if (error instanceof RecallDimensionError) {
			throw error;
		}
		if (error instanceof RecallValidationError) {
			throw new RecallValidationError(
				`${name}: ${error.message}`,
				error.details,
			);
		}
		throw error;
	}
}

/**
 * Validates and returns a RecallQuery.
 *
 * @remarks
 * Validates the embedding, topK, and optional filter, namespace, and flags.
 *
 * @param value - The value to validate
 * @param expectedDimension - Optional expected embedding dimension
 * @returns The validated query
 * @throws {RecallValidationError} If the value is not a valid query
 * @throws {RecallDimensionError} If embedding dimension doesn't match
 *
 * @public
 */
export function validateRecallQuery(
	value: unknown,
	expectedDimension?: number,
): RecallQuery {
	if (!isPlainObject(value)) {
		throw new RecallValidationError("Recall query must be an object.");
	}
	const embedding = validateEmbedding(
		value.embedding,
		"query.embedding",
		expectedDimension,
	);
	assertPositiveInteger(value.topK, "query.topK");
	const namespace = validateOptionalNamespace(value.namespace);

	const query: RecallQuery = {
		embedding,
		topK: value.topK,
	};
	if (value.filter !== undefined)
		query.filter = validateRecallFilter(value.filter) as never;
	if (namespace !== undefined) query.namespace = namespace;
	if (value.includeText !== undefined)
		query.includeText = Boolean(value.includeText);
	if (value.includeMetadata !== undefined)
		query.includeMetadata = Boolean(value.includeMetadata);
	return query;
}

/**
 * Validates and returns a normalized recall filter.
 *
 * @remarks
 * Validates that all filter keys and values are safe and valid.
 * Operator objects must contain exactly one operator.
 *
 * @param value - The value to validate (should be an object)
 * @returns A normalized filter object with validated keys and values
 * @throws {RecallValidationError} If the value is not a valid filter
 *
 * @public
 */
export function validateRecallFilter(value: unknown): Record<string, unknown> {
	if (!isPlainObject(value)) {
		throw new RecallValidationError("filter must be an object.");
	}
	const output: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		assertSafeObjectKey(key, `filter.${key}`);
		if (!FILTER_KEY_PATTERN.test(key)) {
			throw new RecallValidationError(
				"filter key contains unsupported characters.",
				{ key },
			);
		}
		validateFilterValue(item, `filter.${key}`);
		output[key] = item;
	}
	return output;
}

/**
 * Validates a filter value (either a plain value or an operator object).
 *
 * @param value - The filter value to validate
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the value is not a valid filter value or uses an unsupported operator
 *
 * @internal
 */
function validateFilterValue(value: unknown, name: string): void {
	if (
		isPlainObject(value) &&
		Object.keys(value).some((key) => key.startsWith("$"))
	) {
		const entries = Object.entries(value);
		if (entries.length !== 1) {
			throw new RecallValidationError(
				`${name} operator object must contain exactly one operator.`,
				{ name },
			);
		}
		const [operator, operand] = entries[0] as [string, unknown];
		switch (operator) {
			case "$eq":
			case "$ne":
				assertJsonValue(operand, `${name}.${operator}`);
				return;
			case "$in":
			case "$nin":
				if (!Array.isArray(operand)) {
					throw new RecallValidationError(
						`${name}.${operator} must be an array.`,
					);
				}
				for (const [index, item] of operand.entries())
					assertJsonValue(item, `${name}.${operator}[${index}]`);
				return;
			case "$gt":
			case "$gte":
			case "$lt":
			case "$lte":
				assertFiniteNumber(operand, `${name}.${operator}`);
				return;
			case "$exists":
				if (typeof operand !== "boolean") {
					throw new RecallValidationError(
						`${name}.${operator} must be a boolean.`,
					);
				}
				return;
			case "$contains":
				if (
					!["string", "number", "boolean"].includes(typeof operand) &&
					operand !== null
				) {
					throw new RecallValidationError(
						`${name}.${operator} must be a JSON primitive.`,
					);
				}
				return;
			default:
				throw new RecallValidationError(
					`${name} uses unsupported filter operator.`,
					{ operator },
				);
		}
	}

	assertJsonValue(value, name);
}
