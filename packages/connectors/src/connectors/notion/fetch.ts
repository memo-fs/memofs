/**
 * Notion REST API fetch layer.
 *
 * Hits the Notion v1 API (`https://api.notion.com/v1`) with the resolved
 * integration token. Queries a database (`POST /v1/databases/:id/query`) or
 * the workspace search (`POST /v1/search`), paginating via `start_cursor`.
 * Maps raw responses into {@link NotionPage}s. Rate-limit errors are surfaced
 * as thrown errors for the runner to record.
 *
 * No SDK — uses the runtime `fetch` (Node 22) + the REST API. The Notion API
 * requires the `Notion-Version: 2022-06-28` header.
 *
 * @internal
 */

import { resolveQuery } from "./normalize";
import type { NotionPage, NotionSourceMapping } from "./types";

/** Notion API version header value (locked by Notion). */
const NOTION_VERSION = "2022-06-28";

/** Notion API base URL. */
const NOTION_API_BASE = "https://api.notion.com/v1";

/** Per-request page size (Notion caps at 100). */
const PAGE_SIZE = 25;

/** Default `sourceMapping.limit` — max pages to ingest. */
const DEFAULT_LIMIT = 50;

/** Per-request timeout (ms). A stalled endpoint must not hang the whole run. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Fetch Notion pages per the connector's `sourceMapping`.
 *
 * @internal
 * @param token resolved Notion integration token (in-memory only)
 * @param sourceMapping the connector's `sourceMapping`
 * @param signal optional abort signal (caller cancellation); combined with a
 *   per-request timeout so a stalled endpoint can't hang the run.
 * @returns the normalized pages, in source order
 */
export async function fetchNotionPages(
	token: string,
	sourceMapping: NotionSourceMapping | undefined,
	signal?: AbortSignal,
): Promise<NotionPage[]> {
	const query = resolveQuery(sourceMapping);
	const limit = resolveLimit(sourceMapping);

	const pages: NotionPage[] = [];
	let cursor: string | null = null;
	let remaining = limit;

	while (remaining > 0) {
		if (signal?.aborted) throw new Error("Notion ingest aborted.");
		const first = Math.min(PAGE_SIZE, remaining);
		const page = await fetchPage(token, query, first, cursor, signal);
		for (const p of page.results) {
			pages.push(p);
		}
		remaining -= page.results.length;
		cursor = page.nextCursor;
		if (!page.hasMore || page.results.length === 0) break;
	}
	return pages;
}

interface NotionPageResponse {
	readonly results: readonly NotionPage[];
	readonly hasMore: boolean;
	readonly nextCursor: string | null;
}

/** One REST page for the configured query. */
async function fetchPage(
	token: string,
	query: ReturnType<typeof resolveQuery>,
	pageSize: number,
	cursor: string | null,
	signal?: AbortSignal,
): Promise<NotionPageResponse> {
	const url =
		query.kind === "database"
			? `${NOTION_API_BASE}/databases/${query.databaseId}/query`
			: `${NOTION_API_BASE}/search`;
	const body: Record<string, unknown> = {
		page_size: pageSize,
		...(cursor === null ? {} : { start_cursor: cursor }),
	};
	if (query.kind === "search") {
		body.query = query.searchQuery;
		body.filter = { value: "page", property: "object" };
	}

	const { signal: requestSignal, clearTimeout } = withRequestTimeout(signal);
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: notionHeaders(token),
			body: JSON.stringify(body),
			signal: requestSignal,
		});

		if (response.status === 429) {
			const retryAfter = response.headers.get("retry-after");
			throw new NotionRateLimitError(
				`Notion API rate limited (retry-after: ${retryAfter ?? "unknown"}).`,
				retryAfter ?? undefined,
			);
		}
		if (response.status === 401 || response.status === 403) {
			// 401/403 is an authorization/permission failure (bad/expired/revoked
			// token, or an un-shared resource) — NOT throttling. A caller that
			// retries on rate-limit must not loop here.
			throw new NotionAuthError(
				`Notion authorization failed (${response.status}). Check the integration token and that the page/database is shared with it.`,
			);
		}
		if (!response.ok) {
			// Do NOT inline the response body into the message — an API echoing
			// request bytes back would leak material into the surfaced error.
			throw new Error(
				`Notion API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const payload = (await response.json()) as NotionQueryResponse;
		return {
			results: (payload.results ?? [])
				.filter((r): r is RawNotionPage => r !== null && r.object === "page")
				.map(mapPage),
			hasMore: payload.has_more === true,
			nextCursor: payload.next_cursor ?? null,
		};
	} catch (error) {
		if (isAbortError(error)) {
			throw signal?.aborted
				? new Error("Notion ingest aborted.")
				: new Error(`Notion request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
		}
		throw error;
	} finally {
		clearTimeout();
	}
}

/** Map a raw REST page object into a {@link NotionPage}. */
function mapPage(raw: RawNotionPage): NotionPage {
	const title = extractTitle(raw);
	const body = extractBody(raw);
	const properties = extractProperties(raw);
	const id = raw.id;
	// Notion URLs are derived from the id (hyphenated form). The API may include
	// a `url` field; fall back to the canonical notion.so URL.
	const url = raw.url ?? `https://www.notion.so/${id.replace(/-/g, "")}`;
	return {
		id,
		title,
		...(body === "" ? {} : { body }),
		url,
		...(raw.created_time === undefined ? {} : { createdAt: raw.created_time }),
		...(raw.last_edited_time === undefined
			? {}
			: { lastEditedAt: raw.last_edited_time }),
		...(raw.created_by?.id === undefined
			? {}
			: { createdBy: raw.created_by.id }),
		...(Object.keys(properties).length === 0 ? {} : { properties }),
	};
}

/** Pull the title from the page's title-typed property. */
function extractTitle(raw: RawNotionPage): string {
	const props = raw.properties;
	if (!props) return "";
	for (const value of Object.values(props)) {
		if (value && typeof value === "object" && value.type === "title") {
			const parts = (value.title ?? []) as readonly { plain_text?: string }[];
			return parts.map((p) => p.plain_text ?? "").join("");
		}
	}
	return "";
}

/**
 * Concatenate the first N text blocks' plain text as a body excerpt. Notion's
 * `/query` and `/search` responses do not include block content, so this is
 * empty unless the fetch layer enriched the page (left as a hook for a future
 * block-fetch follow-up).
 */
function extractBody(raw: RawNotionPage): string {
	// Notion's query/search endpoints return page objects without block content.
	// A future enhancement can fetch blocks via GET /v1/blocks/:id/children and
	// populate this; for v1 the body is intentionally empty.
	void raw;
	return "";
}

/** Flatten scalar property values into a string-keyed record for metadata. */
function extractProperties(raw: RawNotionPage): Record<string, string> {
	const props = raw.properties;
	const out: Record<string, string> = {};
	if (!props) return out;
	for (const [key, value] of Object.entries(props)) {
		if (!value || typeof value !== "object") continue;
		const text = propertyToText(value as NotionPropertyValue);
		if (text.length > 0) out[key] = text;
	}
	return out;
}

/** Best-effort flattening of a Notion property value to a string. */
function propertyToText(value: NotionPropertyValue): string {
	switch (value.type) {
		case "select":
			return value.select?.name ?? "";
		case "multi_select":
			return (value.multi_select ?? []).map((s) => s.name).join(", ");
		case "status":
			return value.status?.name ?? "";
		case "people":
			return (value.people ?? []).map((p) => p.name ?? "").join(", ");
		case "rich_text":
			return (value.rich_text ?? []).map((t) => t.plain_text ?? "").join("");
		case "url":
			return value.url ?? "";
		case "email":
			return value.email ?? "";
		case "phone_number":
			return value.phone_number ?? "";
		case "checkbox":
			return value.checkbox ? "true" : "false";
		case "number":
			return value.number === null ? "" : String(value.number);
		default:
			return "";
	}
}

function resolveLimit(sourceMapping: NotionSourceMapping | undefined): number {
	const raw = sourceMapping?.limit;
	if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
		return DEFAULT_LIMIT;
	}
	return Math.floor(raw);
}

function notionHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		"Notion-Version": NOTION_VERSION,
		"Content-Type": "application/json",
	};
}

/** Thrown when Notion returns a 429. Carries the retry-after value. */
export class NotionRateLimitError extends Error {
	readonly retryAfterSeconds?: number;

	constructor(message: string, retryAfter?: string) {
		super(message);
		this.name = "NotionRateLimitError";
		if (retryAfter !== undefined) {
			const seconds = Number.parseInt(retryAfter, 10);
			if (Number.isFinite(seconds)) this.retryAfterSeconds = seconds;
		}
	}
}

/**
 * Thrown when Notion returns 401/403 (bad/expired/revoked token, or an
 * un-shared page/database). Distinct from {@link NotionRateLimitError} so a
 * caller retrying on rate-limit does not loop forever on a permanently invalid
 * token. The token value is never included in the message.
 */
export class NotionAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotionAuthError";
	}
}

// --- request timeout + abort helpers (shared with the github connector) ---

/**
 * Combine an optional caller signal with a per-request timeout so a stalled
 * endpoint can't hang the run. Returns the composite signal and a cleanup fn
 * the caller MUST invoke in its `finally`.
 */
function withRequestTimeout(signal?: AbortSignal): {
	signal: AbortSignal;
	clearTimeout: () => void;
} {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	if (signal !== undefined) {
		if (signal.aborted) controller.abort();
		else
			signal.addEventListener("abort", () => controller.abort(), {
				once: true,
			});
	}
	return {
		signal: controller.signal,
		clearTimeout: () => clearTimeout(timer),
	};
}

/** Whether an error is an abort (fetch throws DOMException "AbortError"). */
function isAbortError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.name === "AbortError" ||
			(error as NodeJS.ErrnoException)?.code === "ABORT_ERR")
	);
}

// --- raw REST response shapes (subset) ---

interface NotionQueryResponse {
	readonly results?: readonly (RawNotionPage | null)[];
	readonly has_more?: boolean;
	readonly next_cursor?: string | null;
}

interface RawNotionPage {
	readonly object: "page";
	readonly id: string;
	readonly url?: string;
	readonly created_time?: string;
	readonly last_edited_time?: string;
	readonly created_by?: { readonly id?: string };
	readonly properties?: Readonly<Record<string, NotionPropertyValue>>;
}

interface NotionPropertyValue {
	readonly type: string;
	readonly select?: { readonly name?: string };
	readonly multi_select?: readonly { readonly name?: string }[];
	readonly status?: { readonly name?: string };
	readonly people?: readonly { readonly name?: string }[];
	readonly rich_text?: readonly { readonly plain_text?: string }[];
	readonly title?: readonly { readonly plain_text?: string }[];
	readonly url?: string | null;
	readonly email?: string | null;
	readonly phone_number?: string | null;
	readonly checkbox?: boolean;
	readonly number?: number | null;
}
