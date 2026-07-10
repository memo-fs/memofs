import { MemoryValidationError } from "../../core/errors/errors";
import type { JsonObject, Page } from "../types";

export function truncateUtf8(text: string, maxBytes: number): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return `${text.slice(0, low).trimEnd()}\n\n[Output truncated to ${maxBytes} bytes]`;
}

export interface PaginationOptions {
	cursor?: string;
	limit?: number;
	defaultLimit: number;
	maxLimit: number;
}

/**
 * Normalizes and validates a pagination `limit` parameter.
 *
 * @param limit - The raw limit value (omitted when the caller didn't supply one).
 * @param defaultLimit - Fallback when `limit` is `undefined`.
 * @param maxLimit - Maximum allowed value.
 * @returns The validated limit.
 * @throws {MemoryValidationError} If `limit` is not a positive integer ≤ `maxLimit`.
 */
export function normalizeLimit(
	limit: number | undefined,
	defaultLimit: number,
	maxLimit: number,
): number {
	if (limit === undefined) return defaultLimit;
	if (typeof limit !== "number" || !Number.isInteger(limit))
		throw new MemoryValidationError("limit must be an integer.");
	if (limit < 1) throw new MemoryValidationError("limit must be at least 1.");
	if (limit > maxLimit)
		throw new MemoryValidationError(`limit must not exceed ${maxLimit}.`);
	return limit;
}

/**
 * Encodes a numeric offset (and optional namespace) into an opaque
 * base64url cursor string.
 *
 * Uses web-standard `btoa`/`TextEncoder` (no Node `Buffer`) so the
 * function is safe in both Node and Worker runtimes.
 *
 * @param offset - The zero-based array index.
 * @param namespace - Optional namespace tag validated during decoding.
 * @returns A base64url cursor string.
 * @throws {MemoryValidationError} If `offset` is not a non-negative integer.
 */
export function encodeCursor(offset: number, namespace?: string): string {
	if (!Number.isInteger(offset) || offset < 0)
		throw new MemoryValidationError("cursor offset is invalid.");
	const payload: JsonObject = { v: 1, offset };
	if (namespace !== undefined) payload.namespace = namespace;
	return encodeBase64Url(JSON.stringify(payload));
}

/**
 * Decodes an opaque base64url cursor string back into a numeric offset.
 *
 * @param cursor - The cursor from a previous page (or `undefined`/`""` for the first page).
 * @param namespace - Optional namespace to validate against the cursor's embedded tag.
 * @returns The decoded zero-based offset.
 * @throws {MemoryValidationError} If the cursor is malformed, expired, or namespace-mismatched.
 */
export function decodeCursor(cursor?: string, namespace?: string): number {
	if (cursor === undefined || cursor === "") return 0;
	if (cursor.length > 512)
		throw new MemoryValidationError("cursor is too long.");
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
			(data.namespace !== undefined &&
				namespace !== undefined &&
				data.namespace !== namespace) ||
			typeof data.offset !== "number" ||
			!Number.isInteger(data.offset) ||
			data.offset < 0
		)
			throw new Error("bad cursor");
		return data.offset;
	} catch {
		throw new MemoryValidationError("cursor is invalid or expired.");
	}
}

/**
 * Slices a flat array into a paginated {@link Page} structure.
 *
 * @template T - Element type.
 * @param items - The full collection.
 * @param options - Pagination config (cursor, limit, defaults, max).
 * @param namespace - Optional namespace tag for cursor validation.
 * @returns A page with items and an optional `nextCursor`.
 */
export function paginateArray<T>(
	items: readonly T[],
	options: PaginationOptions,
	namespace?: string,
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

function encodeBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
	const base64 = value
		.replaceAll("-", "+")
		.replaceAll("_", "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(base64);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}
