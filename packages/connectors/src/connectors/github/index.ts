/**
 * GitHub connector — the reference {@link Connector} implementation.
 *
 * Ingests a repository's issues / PRs / discussions into `.memofs/` as
 * connector notes. The runner handles the Q3 write discipline; this connector
 * only fetches + normalizes.
 *
 * @public
 */

import type { JsonObject } from "@memofs/core";
import type {
	Connector,
	ConnectorIngestContext,
	ConnectorRecord,
} from "../../types";
import { fetchGitHubNodes } from "./fetch";
import { normalizeGitHubNode } from "./normalize";
import type { GitHubSourceMapping } from "./types";

/**
 * GitHub connector. `type: "github"`. Reads `sourceMapping.repository`
 * (`"owner/repo"`) and optional `sourceMapping.kinds` / `sourceMapping.limit`
 * from the connector config row.
 *
 * @public
 */
export class GitHubConnector implements Connector {
	readonly type = "github";
	readonly displayName = "GitHub";

	async ingest(
		ctx: ConnectorIngestContext,
	): Promise<readonly ConnectorRecord[]> {
		const sourceMapping = asGitHubSourceMapping(ctx.config.sourceMapping);
		// fetchGitHubNodes throws on rate-limit / network / GraphQL errors; the
		// runner catches and records them so a single connector failure doesn't
		// abort the whole run.
		const nodes = await fetchGitHubNodes(ctx.token, sourceMapping, ctx.signal);
		const { repository } = parseRepoSafe(sourceMapping);
		return nodes.map((node) => normalizeGitHubNode(node, repository));
	}
}

/** Narrow the opaque `sourceMapping` JsonObject into the GitHub shape. */
function asGitHubSourceMapping(
	sourceMapping: JsonObject | undefined,
): GitHubSourceMapping {
	if (sourceMapping === undefined) return {};
	return sourceMapping as GitHubSourceMapping;
}

/** Best-effort repository label for metadata (validation happens in fetch). */
function parseRepoSafe(sourceMapping: GitHubSourceMapping): {
	repository: string;
} {
	const raw = sourceMapping.repository;
	return { repository: typeof raw === "string" ? raw : "(unknown)" };
}
