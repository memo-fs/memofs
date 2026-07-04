import type { JsonObject } from "../types";

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

export function normalizeLimit(
	limit: number | undefined,
	defaultLimit: number,
	maxLimit: number,
): number {
	if (limit === undefined) return defaultLimit;
	if (!Number.isFinite(limit) || limit < 1) return defaultLimit;
	return Math.min(Math.floor(limit), maxLimit);
}

export function encodeCursor(offset: number, namespace?: string): string {
	const payload: JsonObject = { v: 1, offset };
	if (namespace !== undefined) payload.namespace = namespace;
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string, namespace?: string): number {
	if (cursor === undefined) return 0;
	try {
		const decoded = JSON.parse(
			Buffer.from(cursor, "base64url").toString("utf8"),
		) as { v?: number; offset?: number; namespace?: string };
		if (decoded.namespace !== undefined && namespace !== undefined) {
			if (decoded.namespace !== namespace) return 0;
		}
		return typeof decoded.offset === "number" ? decoded.offset : 0;
	} catch {
		return 0;
	}
}

export function paginateArray<T>(
	items: T[],
	options: PaginationOptions,
	namespace?: string,
): { items: T[]; nextCursor?: string } {
	const limit = normalizeLimit(
		options.limit,
		options.defaultLimit,
		options.maxLimit,
	);
	const offset = decodeCursor(options.cursor, namespace);
	const slice = items.slice(offset, offset + limit);
	const nextOffset = offset + slice.length;
	const hasMore = nextOffset < items.length;
	return {
		items: slice,
		...(hasMore ? { nextCursor: encodeCursor(nextOffset, namespace) } : {}),
	};
}
