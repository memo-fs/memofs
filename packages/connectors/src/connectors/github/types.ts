/**
 * Type definitions for the GitHub connector — GraphQL node shapes and the
 * `sourceMapping` contract.
 *
 * @internal
 */

/**
 * The `sourceMapping` object on a GitHub connector config row.
 *
 * Carried verbatim from `.memofs/connectors.json` (typed here for the
 * connector's own use; the framework treats `sourceMapping` as opaque).
 *
 * @internal
 */
export interface GitHubSourceMapping {
	/** `"owner/repo"` — required. */
	repository?: string;
	/** Which node kinds to ingest. Defaults to all three. */
	kinds?: readonly ("issues" | "prs" | "discussions")[];
	/** Max items per kind (per-page cost control). Defaults to 50. */
	limit?: number;
}

/**
 * A normalized GitHub node ready for {@link normalizeGitHubNode}. The fetch
 * layer maps raw GraphQL responses into this shape.
 *
 * @internal
 */
export interface GitHubNode {
	/** Which kind of GitHub object this is. */
	readonly kind: "issues" | "prs" | "discussions";
	/** GitHub number (the same number shown in the URL). */
	readonly number: number;
	/** Title. */
	readonly title: string;
	/** Markdown body (may be empty). */
	readonly body?: string;
	/** HTML URL. */
	readonly url: string;
	/** State: OPEN / CLOSED / MERGED / null. */
	readonly state?: string | null;
	/** Author login, if available. */
	readonly author?: string;
	/** Label names, if available. */
	readonly labels?: readonly string[];
	/** ISO timestamp of creation. */
	readonly createdAt?: string;
}
