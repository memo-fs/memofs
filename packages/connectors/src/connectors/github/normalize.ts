/**
 * Pure GraphQL node → {@link ConnectorRecord} normalization for the GitHub
 * connector. Kept separate from `fetch.ts` so it's trivially unit-testable
 * with fixture nodes (no network).
 *
 * @internal
 */

import type { JsonObject } from "@memofs/core";
import type { ConnectorRecord } from "../../types";
import { formatContent, MAX_BODY_CHARS, truncate } from "../shared/normalize";
import type { GitHubNode, GitHubSourceMapping } from "./types";

/** Default `sourceMapping.kinds` when omitted: issues + PRs + discussions. */
export const DEFAULT_GITHUB_KINDS = ["issues", "prs", "discussions"] as const;

/** Re-exported for tests/consumers — see {@link MAX_BODY_CHARS} in `../shared/normalize`. */
export { MAX_BODY_CHARS };

/** `externalId` prefix per node kind — stable across re-ingest. */
function externalIdFor(kind: GitHubNode["kind"], number: number): string {
	return `${kind}:${number}`;
}

/**
 * Normalize a single GraphQL node into a {@link ConnectorRecord}.
 *
 * @internal
 */
export function normalizeGitHubNode(
	node: GitHubNode,
	repository: string,
): ConnectorRecord {
	const externalId = externalIdFor(node.kind, node.number);
	const body = truncate(node.body ?? "", MAX_BODY_CHARS);
	const content = formatContent(node.title, body, node.url);
	const metadata: JsonObject = {
		repository,
		number: node.number,
		state: node.state ?? null,
		...(node.author === undefined ? {} : { author: node.author }),
		// `node.labels` is readonly; spread into a mutable array for JsonValue.
		...(node.labels === undefined ? {} : { labels: [...node.labels] }),
		kind: node.kind,
	};
	return {
		externalId,
		title: node.title,
		content,
		url: node.url,
		...(node.createdAt === undefined ? {} : { occurredAt: node.createdAt }),
		metadata,
	};
}

/**
 * Parse the `sourceMapping.kinds` array, defaulting to the full set and
 * rejecting unknown kinds.
 *
 * @internal
 */
export function resolveKinds(
	sourceMapping: GitHubSourceMapping | undefined,
): readonly GitHubNode["kind"][] {
	if (!sourceMapping || sourceMapping.kinds === undefined) {
		return DEFAULT_GITHUB_KINDS;
	}
	const kinds = sourceMapping.kinds;
	const valid = new Set<GitHubNode["kind"]>(["issues", "prs", "discussions"]);
	const resolved: GitHubNode["kind"][] = [];
	for (const k of kinds) {
		if (!valid.has(k as GitHubNode["kind"])) {
			throw new Error(
				`Unknown GitHub connector kind "${k}". Valid: issues, prs, discussions.`,
			);
		}
		resolved.push(k as GitHubNode["kind"]);
	}
	return resolved;
}

/**
 * Parse `sourceMapping.repository` (`"owner/repo"`), throwing on malformed input.
 *
 * @internal
 */
export function parseRepository(
	sourceMapping: GitHubSourceMapping | undefined,
): { owner: string; repo: string; repository: string } {
	const raw = sourceMapping?.repository;
	if (typeof raw !== "string" || raw.length === 0) {
		throw new Error(
			'GitHub connector requires sourceMapping.repository as "owner/repo".',
		);
	}
	const match = /^(?<owner>[^/]+)\/(?<repo>[^/]+)$/.exec(raw);
	const groups = match?.groups;
	if (
		!match ||
		!groups ||
		groups.owner === undefined ||
		groups.repo === undefined
	) {
		throw new Error(
			`GitHub connector sourceMapping.repository must be "owner/repo" (got "${raw}").`,
		);
	}
	return {
		owner: groups.owner,
		repo: groups.repo,
		repository: raw,
	};
}
