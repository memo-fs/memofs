/**
 * Type definitions for the Notion connector — REST API node shapes and the
 * `sourceMapping` contract.
 *
 * @internal
 */

/**
 * The `sourceMapping` object on a Notion connector config row.
 *
 * Carried verbatim from `.tekmemo/connectors.json` (typed here for the
 * connector's own use; the framework treats `sourceMapping` as opaque).
 *
 * @internal
 */
export interface NotionSourceMapping {
	/**
	 * The Notion database id (32-char hex, possibly with hyphens) to query.
	 * Either `databaseId` or `searchQuery` is required.
	 */
	databaseId?: string;
	/**
	 * A free-text search query (the Notion `POST /v1/search` endpoint). Used
	 * when no specific database is targeted — finds pages across the workspace.
	 */
	searchQuery?: string;
	/**
	 * Max pages to ingest (cost control). Defaults to 50.
	 */
	limit?: number;
}

/**
 * A normalized Notion page ready for {@link normalizeNotionPage}. The fetch
 * layer maps raw REST responses into this shape.
 *
 * @internal
 */
export interface NotionPage {
	/** Stable Notion page id (32-char hex, hyphenated). */
	readonly id: string;
	/** Page title (extracted from the title property; may be empty). */
	readonly title: string;
	/** Plain-text body excerpt (first N chars of concatenated text blocks). */
	readonly body?: string;
	/** The workspace-relative URL (`notion.so/<id-with-dashes>`). */
	readonly url: string;
	/** ISO timestamp of creation. */
	readonly createdAt?: string;
	/** ISO timestamp of last edit. */
	readonly lastEditedAt?: string;
	/** Author (created-by) user id, if available. */
	readonly createdBy?: string;
	/** Property values flattened to a string-keyed record, for metadata. */
	readonly properties?: Readonly<Record<string, string>>;
}
