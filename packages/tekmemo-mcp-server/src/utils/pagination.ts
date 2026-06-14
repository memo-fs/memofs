import { McpValidationError } from "../errors";
import type { Page } from "../types";

export interface PaginationOptions {
	cursor?: string | undefined;
	limit?: number | undefined;
	defaultLimit: number;
	maxLimit: number;
}

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

export function encodeCursor(offset: number, namespace = "page"): string {
	if (!Number.isInteger(offset) || offset < 0)
		throw new McpValidationError("cursor offset is invalid.");
	return Buffer.from(
		JSON.stringify({ v: 1, namespace, offset }),
		"utf8",
	).toString("base64url");
}

export function decodeCursor(
	cursor: string | undefined,
	namespace = "page",
): number {
	if (cursor === undefined || cursor === "") return 0;
	if (cursor.length > 512) throw new McpValidationError("cursor is too long.");
	try {
		const decoded = JSON.parse(
			Buffer.from(cursor, "base64url").toString("utf8"),
		) as unknown;
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
