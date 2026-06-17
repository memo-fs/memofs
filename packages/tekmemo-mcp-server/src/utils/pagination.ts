/**
 * Pagination encoding, decoding, and slicing utilities for MCP collections.
 *
 * @module pagination
 */

import { McpValidationError } from "../errors";
import type { Page } from "../types";

/**
 * Options configuration for array/collection pagination.
 */
export interface PaginationOptions {
	/**
	 * An opaque base64url cursor string returned from a previous paginated call.
	 */
	cursor?: string | undefined;
	/**
	 * Number of items to retrieve in this page.
	 */
	limit?: number | undefined;
	/**
	 * Default fallback limit if none is specified.
	 */
	defaultLimit: number;
	/**
	 * Maximum limit ceiling to prevent performance degradation.
	 */
	maxLimit: number;
}

/**
 * Normalizes and validates the limit value.
 *
 * @param limit - The input limit value.
 * @param defaultLimit - Fallback limit.
 * @param maxLimit - Max allowed limit.
 * @returns The validated limit number.
 * @throws {McpValidationError} If the limit is not a positive integer or exceeds max limit.
 */
export function normalizeLimit(
	limit: unknown,
	defaultLimit: number,
	maxLimit: number,
): number {
	if (limit === undefined) return defaultLimit;
	if (typeof limit !== "number" || !Number.isInteger(limit))
		throw new McpValidationError("limit must be an integer.");
	if (limit < 1) throw new McpValidationError("limit must be at least 1.");
	if (limit > maxLimit)
		throw new McpValidationError(`limit must not exceed ${maxLimit}.`);
	return limit;
}

/**
 * Encodes a numeric offset and namespace into an opaque base64url cursor string.
 *
 * @param offset - The array index/offset.
 * @param namespace - The context namespace to validate during decoding.
 * @returns The base64url cursor string.
 * @throws {McpValidationError} If offset is not a non-negative integer.
 */
export function encodeCursor(offset: number, namespace = "page"): string {
	if (!Number.isInteger(offset) || offset < 0)
		throw new McpValidationError("cursor offset is invalid.");
	return encodeBase64Url(JSON.stringify({ v: 1, namespace, offset }));
}

/**
 * Decodes an opaque base64url cursor string back into a numeric offset.
 *
 * @param cursor - The base64url cursor.
 * @param namespace - The expected namespace.
 * @returns The decoded offset index.
 * @throws {McpValidationError} If the cursor is invalid, has a mismatching version/namespace, or is expired.
 */
export function decodeCursor(
	cursor: string | undefined,
	namespace = "page",
): number {
	if (cursor === undefined || cursor === "") return 0;
	if (cursor.length > 512) throw new McpValidationError("cursor is too long.");
	try {
		const decoded = JSON.parse(decodeBase64Url(cursor)) as unknown;
		if (typeof decoded !== "object" || decoded === null)
			throw new Error("bad cursor");
		const data = decoded as {
			v?: unknown;
			namespace?: unknown;
			offset?: unknown;
		};
		if (
			data.v !== 1 ||
			data.namespace !== namespace ||
			typeof data.offset !== "number" ||
			!Number.isInteger(data.offset) ||
			data.offset < 0
		)
			throw new Error("bad cursor");
		return data.offset;
	} catch {
		throw new McpValidationError("cursor is invalid or expired.");
	}
}

/**
 * Encodes UTF-8 text as base64url without requiring Node.js Buffer.
 *
 * @param value - Plain UTF-8 string to encode.
 * @returns Base64url-encoded string.
 */
function encodeBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

/**
 * Decodes base64url text without requiring Node.js Buffer.
 *
 * @param value - Base64url string to decode.
 * @returns Decoded UTF-8 string.
 */
function decodeBase64Url(value: string): string {
	const base64 = value
		.replaceAll("-", "+")
		.replaceAll("_", "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(base64);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/**
 * Slices a flat array of items into a paginated Page structure.
 *
 * @template T - The element type of the array.
 * @param items - The input collection array.
 * @param options - Config options including cursor and limits.
 * @param namespace - Namespace label for decoding/encoding cursors.
 * @returns A paginated page containing items and optionally the next cursor.
 */
export function paginateArray<T>(
	items: readonly T[],
	options: PaginationOptions,
	namespace = "page",
): Page<T> {
	const limit = normalizeLimit(
		options.limit,
		options.defaultLimit,
		options.maxLimit,
	);
	const offset = decodeCursor(options.cursor, namespace);
	const pageItems = items.slice(offset, offset + limit);
	const nextOffset = offset + pageItems.length;
	return {
		items: pageItems,
		...(nextOffset < items.length
			? { nextCursor: encodeCursor(nextOffset, namespace) }
			: {}),
	};
}
