import {
	type JsonPrimitive,
	type JsonValue,
	type RecallFilter,
	type RecallFilterOperator,
	type RecallFilterValue,
	RecallValidationError,
	validateRecallFilter,
} from "@tekbreed/tekmemo";
import { UpstashRecallValidationError } from "../errors/upstash-errors";

/**
 * @file Builds Upstash Vector filter strings from TekMemo filter objects.
 *
 * @remarks
 * Upstash Vector uses a custom filter syntax. This module translates
 * TekMemo's provider-agnostic filter format into Upstash-compatible
 * filter strings with proper escaping and operator mapping.
 *
 * @internal
 */

/**
 * Options for building an Upstash filter string.
 *
 * @public
 */
export interface BuildUpstashFilterOptions {
	/** Optional TekMemo recall filter to convert. */
	filter?: RecallFilter;
	/** If set, adds a required projectId equality filter. */
	requiredProjectId?: string;
	/** If set, adds a required tenantId equality filter. */
	requiredTenantId?: string;
	/** If set, adds required sourceType and sourceId equality filters. */
	requiredSource?: {
		sourceType: string;
		sourceId: string;
	};
}

/**
 * Quotes a JSON value for use in an Upstash filter string.
 *
 * @param value - The value to quote.
 * @returns The string representation suitable for Upstash filters.
 * @throws {UpstashRecallValidationError} If the value is non-finite or an unsupported type.
 *
 * @internal
 */
function quote(value: JsonValue): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new UpstashRecallValidationError("Filter number must be finite.", {
				value,
			});
		return String(value);
	}
	if (typeof value === "boolean") return value ? "true" : "false";
	if (value === null) return "null";
	throw new UpstashRecallValidationError(
		"Upstash filter values must be primitive for direct comparison.",
		{ value },
	);
}

/**
 * Validates and sanitizes a metadata field name for use in Upstash filters.
 *
 * @param name - The field name to validate.
 * @returns The validated field name.
 * @throws {UpstashRecallValidationError} If the field name contains invalid characters.
 *
 * @internal
 */
function field(name: string): string {
	if (!/^[A-Za-z0-9_.:@#/-]{1,256}$/.test(name)) {
		throw new UpstashRecallValidationError("Invalid metadata filter field.", {
			name,
		});
	}
	return name;
}

/**
 * Checks if a filter value is an operator object (contains $-prefixed keys).
 *
 * @param value - The filter value to check.
 * @returns True if the value is an operator object.
 *
 * @internal
 */
function isOperatorObject(
	value: RecallFilterValue,
): value is RecallFilterOperator {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.keys(value).some((key) => key.startsWith("$"))
	);
}

/**
 * Builds an Upstash filter string for $in/$nin operators.
 *
 * @param fieldName - The field name to filter on.
 * @param values - The array of values to match.
 * @param negated - Whether to negate the filter (for $nin).
 * @returns The filter string for the in/nin operation.
 * @throws {UpstashRecallValidationError} If the values array is empty.
 *
 * @internal
 */
function buildIn(
	fieldName: string,
	values: JsonValue[],
	negated: boolean,
): string {
	if (values.length === 0) {
		throw new UpstashRecallValidationError(
			"$in/$nin filters must not be empty.",
		);
	}
	const parts = values.map((value) => `${field(fieldName)} = ${quote(value)}`);
	const joined =
		parts.length === 1 ? (parts[0] as string) : `(${parts.join(" OR ")})`;
	return negated ? `NOT ${joined}` : joined;
}

/**
 * Builds an Upstash filter string for the $contains operator.
 *
 * @param fieldName - The field name to filter on.
 * @param value - The primitive value to check for containment.
 * @returns The filter string for the contains operation.
 *
 * @internal
 */
function buildContains(fieldName: string, value: JsonPrimitive): string {
	return `${field(fieldName)} CONTAINS ${quote(value)}`;
}

/**
 * Builds an Upstash filter string for a single operator object.
 *
 * @param fieldName - The field name to filter on.
 * @param operator - The operator object containing a single $-prefixed operator.
 * @returns The filter string for the operator.
 * @throws {UpstashRecallValidationError} If the operator is invalid or unsupported.
 *
 * @internal
 */
function buildOperator(
	fieldName: string,
	operator: RecallFilterOperator,
): string {
	const entries = Object.entries(operator);
	if (entries.length !== 1) {
		throw new UpstashRecallValidationError(
			"Filter operator object must contain exactly one operator.",
		);
	}

	const [op, raw] = entries[0] as [string, unknown];
	switch (op) {
		case "$eq":
			return `${field(fieldName)} = ${quote(raw as JsonValue)}`;
		case "$ne":
			return `${field(fieldName)} != ${quote(raw as JsonValue)}`;
		case "$in":
			return buildIn(fieldName, raw as JsonValue[], false);
		case "$nin":
			return buildIn(fieldName, raw as JsonValue[], true);
		case "$gt":
			return `${field(fieldName)} > ${quote(raw as number)}`;
		case "$gte":
			return `${field(fieldName)} >= ${quote(raw as number)}`;
		case "$lt":
			return `${field(fieldName)} < ${quote(raw as number)}`;
		case "$lte":
			return `${field(fieldName)} <= ${quote(raw as number)}`;
		case "$exists":
			return raw === true
				? `${field(fieldName)} IS NOT NULL`
				: `${field(fieldName)} IS NULL`;
		case "$contains":
			return buildContains(fieldName, raw as JsonPrimitive);
		default:
			throw new UpstashRecallValidationError(
				"Unsupported Upstash filter operator.",
				{ operator: op },
			);
	}
}

/**
 * Builds a filter string for a single field-value pair.
 *
 * @param fieldName - The field name to filter on.
 * @param value - The filter value (can be a primitive, array, or operator object).
 * @returns The filter string for this field.
 *
 * @internal
 */
function buildFilterPart(fieldName: string, value: RecallFilterValue): string {
	if (isOperatorObject(value)) return buildOperator(fieldName, value);
	if (Array.isArray(value)) {
		return buildIn(fieldName, value, false);
	}
	return `${field(fieldName)} = ${quote(value)}`;
}

/**
 * Builds an Upstash Vector filter string from TekMemo filter options.
 *
 * @remarks
 * This function combines required isolation filters (tenant/project/source)
 * with any user-provided filter, producing a single Upstash-compatible
 * filter string.
 *
 * @param options - The filter building options.
 * @returns The Upstash filter string, or undefined if no filters are needed.
 * @throws {UpstashRecallValidationError} If the filter is invalid.
 *
 * @public
 */
export function buildUpstashFilter(
	options: BuildUpstashFilterOptions,
): string | undefined {
	const parts: string[] = [];

	if (options.requiredTenantId !== undefined) {
		parts.push(`tenantId = ${quote(options.requiredTenantId)}`);
	}
	if (options.requiredProjectId !== undefined) {
		parts.push(`projectId = ${quote(options.requiredProjectId)}`);
	}
	if (options.requiredSource !== undefined) {
		parts.push(`sourceType = ${quote(options.requiredSource.sourceType)}`);
		parts.push(`sourceId = ${quote(options.requiredSource.sourceId)}`);
	}

	if (options.filter !== undefined) {
		let filter: RecallFilter;
		try {
			filter = validateRecallFilter(options.filter) as RecallFilter;
		} catch (error) {
			if (error instanceof RecallValidationError) {
				throw new UpstashRecallValidationError(error.message, error.details);
			}
			throw error;
		}
		for (const [key, value] of Object.entries(filter)) {
			// Required filters win for isolation-sensitive keys.
			if (key === "projectId" && options.requiredProjectId !== undefined)
				continue;
			if (key === "tenantId" && options.requiredTenantId !== undefined)
				continue;
			if (key === "sourceType" && options.requiredSource !== undefined)
				continue;
			if (key === "sourceId" && options.requiredSource !== undefined) continue;
			parts.push(buildFilterPart(key, value));
		}
	}

	if (parts.length === 0) return undefined;
	return parts.join(" AND ");
}
