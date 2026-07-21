/**
 * Shared normalization primitives for the built-in connectors (GitHub, Notion).
 *
 * Every connector maps records into the same `ConnectorRecord` shape — the
 * title/body/URL formatting, body truncation cap, and `limit` parsing logic
 * are identical across connectors. Pulling them here is the per-DRY & SSOT
 * rule in `AGENTS.md`: one shape, one place.
 *
 * @internal
 */

/** Cap on body length in the note content (keeps notes.md scannable). */
export const MAX_BODY_CHARS = 4000;

/** Per-page page size for paginated fetchers (cost control). */
export const PAGE_SIZE = 25;

/** Default `sourceMapping.limit` — max items per kind/page. */
export const DEFAULT_LIMIT = 50;

/**
 * Truncate a string to `max` characters, appending an ellipsis if it was cut.
 *
 * @internal
 * @param value the string to truncate
 * @param max the maximum number of characters to keep
 * @returns the (possibly truncated) string
 */
export function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max)}…`;
}

/**
 * Title + body + URL, markdown-formatted. Both connectors format their note
 * content identically, so the shape lives once here.
 *
 * @internal
 * @param title the one-line title of the note
 * @param body the (possibly truncated) body
 * @param url the source URL for external provenance
 * @returns the Formatted markdown body
 */
export function formatContent(
	title: string,
	body: string,
	url: string,
): string {
	const lines = [`# ${title}`];
	if (body.length > 0) {
		lines.push("", body);
	}
	lines.push("", `Source: ${url}`);
	return lines.join("\n");
}

/**
 * Parse a `sourceMapping.limit`, defaulting to {@link DEFAULT_LIMIT} when
 * missing or invalid. Both connectors share the same `{ limit?: number }`
 * contract.
 *
 * @internal
 * @param raw the raw `sourceMapping.limit` value
 * @returns a positive integer limit
 */
export function resolveLimit(raw: number | undefined): number {
	if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
		return DEFAULT_LIMIT;
	}
	return Math.floor(raw);
}
