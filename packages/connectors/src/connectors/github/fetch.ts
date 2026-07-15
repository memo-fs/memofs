/**
 * GitHub GraphQL fetch layer.
 *
 * Hits `https://api.github.com/graphql` with the resolved token (fine-grained
 * PAT or OAuth token). Fetches issues / PRs / discussions for a repository,
 * maps raw responses into {@link GitHubNode}s. Pagination via the GraphQL
 * cursor protocol. Rate-limit errors are surfaced as thrown errors for the
 * runner to record.
 *
 * No SDK — uses the runtime `fetch` (Node 22) + the GraphQL API.
 *
 * @internal
 */

import {
	isAbortError,
	REQUEST_TIMEOUT_MS,
	withRequestTimeout,
} from "../shared/http";
import { PAGE_SIZE, resolveLimit } from "../shared/normalize";
import { parseRepository, resolveKinds } from "./normalize";
import type { GitHubNode, GitHubSourceMapping } from "./types";

/** GraphQL endpoint. */
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Fetch GitHub nodes (issues / PRs / discussions) for a repository.
 *
 * @internal
 * @param token resolved GitHub token (in-memory only)
 * @param sourceMapping the connector's `sourceMapping`
 * @param signal optional abort signal (caller cancellation); combined with a
 * per-request timeout so a stalled endpoint can't hang the run.
 * @returns the normalized nodes, in source order
 */
export async function fetchGitHubNodes(
	token: string,
	sourceMapping: GitHubSourceMapping | undefined,
	signal?: AbortSignal,
): Promise<GitHubNode[]> {
	const { owner, repo } = parseRepository(sourceMapping);
	const kinds = resolveKinds(sourceMapping);
	const limit = resolveLimit(sourceMapping?.limit);

	const nodes: GitHubNode[] = [];
	for (const kind of kinds) {
		if (signal?.aborted) throw new Error("GitHub ingest aborted.");
		const kindNodes = await fetchKind(token, owner, repo, kind, limit, signal);
		for (const node of kindNodes) {
			nodes.push(node);
		}
	}
	return nodes;
}

/** Fetch one kind up to `limit`, following the cursor. */
async function fetchKind(
	token: string,
	owner: string,
	repo: string,
	kind: "issues" | "prs" | "discussions",
	limit: number,
	signal?: AbortSignal,
): Promise<GitHubNode[]> {
	const collected: GitHubNode[] = [];
	let cursor: string | null = null;
	let remaining = limit;

	while (remaining > 0) {
		if (signal?.aborted) throw new Error("GitHub ingest aborted.");
		const first = Math.min(PAGE_SIZE, remaining);
		const page = await fetchPage(
			token,
			owner,
			repo,
			kind,
			first,
			cursor,
			signal,
		);
		for (const node of page.nodes) {
			collected.push(node);
		}
		remaining -= page.nodes.length;
		cursor = page.endCursor;
		if (!page.hasNextPage || page.nodes.length === 0) break;
	}
	return collected;
}

interface GitHubPage {
	readonly nodes: readonly GitHubNode[];
	readonly hasNextPage: boolean;
	readonly endCursor: string | null;
}

/** One GraphQL page for one kind. */
async function fetchPage(
	token: string,
	owner: string,
	repo: string,
	kind: "issues" | "prs" | "discussions",
	first: number,
	cursor: string | null,
	signal?: AbortSignal,
): Promise<GitHubPage> {
	const query = buildQuery(kind);
	// The cursor is passed raw; the whole body is JSON-encoded below.
	const variables = { owner, name: repo, first, after: cursor };

	const { signal: requestSignal, clearTimeout } = withRequestTimeout(signal);
	try {
		const response = await fetch(GITHUB_GRAPHQL_URL, {
			method: "POST",
			headers: graphqlHeaders(token),
			body: JSON.stringify({ query, variables }),
			signal: requestSignal,
		});

		if (response.status === 403 || response.status === 429) {
			const reset = response.headers.get("x-ratelimit-reset");
			throw new GitHubRateLimitError(
				`GitHub API rate limited (reset: ${reset ?? "unknown"}).`,
				reset ?? undefined,
			);
		}
		if (response.status === 401) {
			throw new Error(
				"GitHub auth error: 401. The token is missing or invalid. Never logged.",
			);
		}
		if (!response.ok) {
			throw new Error(
				`GitHub GraphQL request failed: ${response.status} ${response.statusText}`,
			);
		}

		const body = (await response.json()) as GraphQLResponse;
		if (body.errors && body.errors.length > 0) {
			// Discussions require the discussions field to exist on the repo; if the
			// repo has none, GitHub returns a field error. Treat that as empty rather
			// than a hard failure.
			const fatal = body.errors.filter(
				(e) => !e.message.toLowerCase().includes("discussions"),
			);
			if (fatal.length > 0) {
				throw new Error(
					`GitHub GraphQL errors: ${fatal.map((e) => e.message).join("; ")}`,
				);
			}
			return { nodes: [], hasNextPage: false, endCursor: null };
		}

		return extractPage(body.data, kind);
	} catch (error) {
		if (isAbortError(error)) {
			throw signal?.aborted
				? new Error("GitHub ingest aborted.")
				: new Error(`GitHub request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
		}
		throw error;
	} finally {
		clearTimeout();
	}
}

/** Build the GraphQL query string for a kind. */
function buildQuery(kind: "issues" | "prs" | "discussions"): string {
	const connection =
		kind === "issues"
			? "issues"
			: kind === "prs"
				? "pullRequests"
				: "discussions";
	// Field selection is the same shape across all three; GitHub accepts these
	// fields on Issue / PullRequest / Discussion nodes.
	const fields = `
		number
		title
		body
		url
		state
		createdAt
		author { login }
		labels(first: 20) { nodes { name } }
	`;
	return `
		query($owner: String!, $name: String!, $first: Int!, $after: String) {
			repository(owner: $owner, name: $name) {
				${connection}(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
					pageInfo { hasNextPage endCursor }
					nodes { ${fields} }
				}
			}
		}`;
}

/** Extract a normalized page from the GraphQL `data` payload. */
function extractPage(
	data: GraphQLResponse["data"],
	kind: "issues" | "prs" | "discussions",
): GitHubPage {
	const repo = data?.repository;
	if (!repo) return { nodes: [], hasNextPage: false, endCursor: null };
	const connection =
		kind === "issues"
			? repo.issues
			: kind === "prs"
				? repo.pullRequests
				: repo.discussions;
	if (!connection) return { nodes: [], hasNextPage: false, endCursor: null };

	const nodes: GitHubNode[] = (connection.nodes ?? [])
		.filter((n) => n !== null)
		.map((n) => mapNode(n, kind));

	return {
		nodes,
		hasNextPage: connection.pageInfo?.hasNextPage === true,
		endCursor: connection.pageInfo?.endCursor ?? null,
	};
}

/** Map a raw GraphQL node into a {@link GitHubNode}. */
function mapNode(raw: RawGraphQLNode, kind: GitHubNode["kind"]): GitHubNode {
	const labels = raw.labels?.nodes
		?.map((n) => n?.name)
		.filter((n): n is string => typeof n === "string");
	return {
		kind,
		number: raw.number,
		title: raw.title ?? "(untitled)",
		...(raw.body === null || raw.body === undefined ? {} : { body: raw.body }),
		url: raw.url,
		...(raw.state === null || raw.state === undefined
			? {}
			: { state: raw.state }),
		...(raw.createdAt === undefined ? {} : { createdAt: raw.createdAt }),
		...(raw.author?.login === undefined ? {} : { author: raw.author.login }),
		...(labels === undefined ? {} : { labels }),
	};
}

function graphqlHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
		Accept: "application/vnd.github+json",
		// GraphQL previews are deprecated but the header is harmless and keeps
		// older responses stable.
		"GraphQL-Features": "discussions_api",
	};
}

/** Thrown when GitHub returns a 403/429. Carries the reset timestamp. */
export class GitHubRateLimitError extends Error {
	readonly resetEpoch?: number;

	constructor(message: string, reset?: string) {
		super(message);
		this.name = "GitHubRateLimitError";
		if (reset !== undefined) {
			const epoch = Number.parseInt(reset, 10);
			if (Number.isFinite(epoch)) this.resetEpoch = epoch;
		}
	}
}

// --- raw GraphQL response shapes (subset) ---

interface GraphQLResponse {
	readonly data?: {
		readonly repository?: {
			readonly issues?: GraphQLConnection;
			readonly pullRequests?: GraphQLConnection;
			readonly discussions?: GraphQLConnection;
		};
	};
	readonly errors?: readonly { readonly message: string }[];
}

interface GraphQLConnection {
	readonly pageInfo?: {
		readonly hasNextPage?: boolean;
		readonly endCursor?: string | null;
	};
	readonly nodes?: readonly (RawGraphQLNode | null)[] | null;
}

interface RawGraphQLNode {
	readonly number: number;
	readonly title?: string;
	readonly body?: string | null;
	readonly url: string;
	readonly state?: string | null;
	readonly createdAt?: string;
	readonly author?: { readonly login?: string } | null;
	readonly labels?: {
		readonly nodes?: readonly ({ readonly name?: string } | null)[] | null;
	} | null;
}
