/**
 * Notion connector.
 *
 * Ingests Notion pages from a database (`POST /v1/databases/:id/query`) or a
 * workspace search (`POST /v1/search`) into `.memofs/` as connector notes.
 * The runner handles the Q3 write discipline; this connector only fetches +
 * normalizes.
 *
 * @public
 */

import type {
	Connector,
	ConnectorIngestContext,
	ConnectorRecord,
} from "../../types";
import { fetchNotionPages } from "./fetch";
import { normalizeNotionPage } from "./normalize";
import type { NotionSourceMapping } from "./types";

/**
 * Notion connector. `type: "notion"`. Reads `sourceMapping.databaseId` (a
 * 32-char hex id, hyphenated or not) OR `sourceMapping.searchQuery` (free-text
 * workspace search), plus an optional `sourceMapping.limit`, from the
 * connector config row.
 *
 * @public
 */
export class NotionConnector implements Connector {
	readonly type = "notion";
	readonly displayName = "Notion";

	async ingest(
		ctx: ConnectorIngestContext,
	): Promise<readonly ConnectorRecord[]> {
		const sourceMapping = asNotionSourceMapping(ctx.config.sourceMapping);
		// fetchNotionPages throws on rate-limit / network / REST errors; the
		// runner catches and records them so a single connector failure doesn't
		// abort the whole run.
		const pages = await fetchNotionPages(ctx.token, sourceMapping, ctx.signal);
		return pages.map((page) => normalizeNotionPage(page));
	}
}

/** Narrow the opaque `sourceMapping` into the Notion shape. */
function asNotionSourceMapping(sourceMapping: unknown): NotionSourceMapping {
	if (sourceMapping === undefined || sourceMapping === null) return {};
	if (typeof sourceMapping !== "object") return {};
	return sourceMapping as NotionSourceMapping;
}
