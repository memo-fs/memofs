/**
 * Pure REST node → {@link ConnectorRecord} normalization for the Notion
 * connector. Kept separate from `fetch.ts` so it's trivially unit-testable
 * with fixture pages (no network).
 *
 * @internal
 */

import type { JsonObject } from "@tekbreed/tekmemo";
import type { ConnectorRecord } from "../../types";
import type { NotionPage, NotionSourceMapping } from "./types";

/** Cap on body excerpt length in the note content (keeps notes.md scannable). */
export const MAX_BODY_CHARS = 4000;

/**
 * Normalize a single Notion page into a {@link ConnectorRecord}.
 *
 * @internal
 */
export function normalizeNotionPage(page: NotionPage): ConnectorRecord {
	// The external id is the Notion page id — stable across re-ingest.
	const externalId = `notion:${page.id}`;
	const body = truncate(page.body ?? "", MAX_BODY_CHARS);
	const content = formatContent(page.title || "Untitled", body, page.url);
	const properties = page.properties ?? {};
	const metadata: JsonObject = {
		kind: "page",
		...(page.createdAt === undefined ? {} : { createdAt: page.createdAt }),
		...(page.lastEditedAt === undefined
			? {}
			: { lastEditedAt: page.lastEditedAt }),
		...(page.createdBy === undefined ? {} : { createdBy: page.createdBy }),
		...(Object.keys(properties).length === 0 ? {} : { properties }),
	};
	return {
		externalId,
		title: page.title || "Untitled",
		content,
		url: page.url,
		...(page.createdAt === undefined ? {} : { occurredAt: page.createdAt }),
		metadata,
	};
}

/** Title + body excerpt + URL, markdown-formatted. */
function formatContent(title: string, body: string, url: string): string {
	const lines = [`# ${title}`];
	if (body.length > 0) {
		lines.push("", body);
	}
	lines.push("", `Source: ${url}`);
	return lines.join("\n");
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max)}…`;
}

/**
 * Parse `sourceMapping.databaseId`, throwing on a malformed id.
 *
 * @internal
 */
export function parseDatabaseId(
	sourceMapping: NotionSourceMapping | undefined,
): string {
	const raw = sourceMapping?.databaseId;
	if (typeof raw !== "string" || raw.length === 0) {
		throw new Error(
			"Notion connector requires sourceMapping.databaseId (32-char hex, with or without hyphens).",
		);
	}
	// Notion ids are 32 hex chars, optionally hyphenated into 8-4-4-4-12.
	const stripped = raw.replace(/-/g, "");
	if (!/^[0-9a-f]{32}$/i.test(stripped)) {
		throw new Error(
			`Notion connector sourceMapping.databaseId must be 32 hex chars (got "${raw}").`,
		);
	}
	return raw;
}

/**
 * Resolve the query strategy: databaseId query, search query, or error.
 * Returns the kind so the fetch layer knows which endpoint to hit.
 *
 * @internal
 */
export type NotionQueryKind = "database" | "search";

export function resolveQuery(sourceMapping: NotionSourceMapping | undefined): {
	kind: NotionQueryKind;
	databaseId?: string;
	searchQuery?: string;
} {
	const db = sourceMapping?.databaseId;
	const search = sourceMapping?.searchQuery;
	if (typeof db === "string" && db.length > 0) {
		// Validate the id shape so the fetch layer doesn't get a 400.
		parseDatabaseId(sourceMapping);
		return { kind: "database", databaseId: db };
	}
	if (typeof search === "string" && search.length > 0) {
		return { kind: "search", searchQuery: search };
	}
	throw new Error(
		"Notion connector requires either sourceMapping.databaseId or sourceMapping.searchQuery.",
	);
}
