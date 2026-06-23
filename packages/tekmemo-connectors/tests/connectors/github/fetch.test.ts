import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchGitHubNodes,
	GitHubRateLimitError,
} from "../../../src/connectors/github/fetch";
import type { GitHubSourceMapping } from "../../../src/connectors/github/types";

/** A minimal Response stand-in for the mocked fetch. */
function graphqlResponse(
	body: unknown,
	init: { status?: number; headers?: Record<string, string> } = {},
): Response {
	const status = init.status ?? 200;
	const headers = new Map<string, string>();
	if (init.headers) {
		for (const [k, v] of Object.entries(init.headers)) headers.set(k, v);
	}
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers: {
			get: (name: string) => headers.get(name.toLowerCase()) ?? null,
		},
		json: async () => body,
	} as unknown as Response;
}

function issueNode(n: number, title = `Issue ${n}`): unknown {
	return {
		number: n,
		title,
		body: `body-${n}`,
		url: `https://github.com/o/r/issues/${n}`,
		state: "OPEN",
		createdAt: "2026-01-01T00:00:00Z",
		author: { login: "alice" },
		labels: { nodes: [{ name: "bug" }] },
	};
}

function page(
	nodes: unknown[],
	opts: { hasNext?: boolean; endCursor?: string | null } = {},
): unknown {
	return {
		data: {
			repository: {
				issues: {
					pageInfo: {
						hasNextPage: opts.hasNext ?? false,
						endCursor: opts.endCursor ?? null,
					},
					nodes,
				},
			},
		},
	};
}

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
	// Restore the real fetch after each test.
	globalThis.fetch = ORIGINAL_FETCH;
	vi.restoreAllMocks();
});

describe("fetchGitHubNodes", () => {
	it("fetches a single page and normalizes nodes", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(graphqlResponse(page([issueNode(1), issueNode(2)])));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		const nodes = await fetchGitHubNodes("token", sm);

		expect(nodes).toHaveLength(2);
		expect(nodes[0]?.number).toBe(1);
		expect(nodes[0]?.kind).toBe("issues");
		expect(nodes[0]?.author).toBe("alice");
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("follows the pagination cursor across pages", async () => {
		const page1 = page([issueNode(1)], { hasNext: true, endCursor: "Y2Vy" });
		const page2 = page([issueNode(2)], { hasNext: false, endCursor: null });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(graphqlResponse(page1))
			.mockResolvedValueOnce(graphqlResponse(page2));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = {
			repository: "o/r",
			kinds: ["issues"],
			limit: 25,
		};
		const nodes = await fetchGitHubNodes("token", sm);

		expect(nodes).toHaveLength(2);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// The second request should carry the `after` cursor from page 1.
		const secondCallBody = JSON.parse(
			(fetchMock.mock.calls[1]?.[1] as RequestInit)?.body as string,
		);
		expect(secondCallBody.variables.after).toBe("Y2Vy");
	});

	it("respects the limit cap across pages", async () => {
		// limit = 3, page size 25 → single page with 3 nodes requested.
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				graphqlResponse(page([issueNode(1), issueNode(2), issueNode(3)])),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = {
			repository: "o/r",
			kinds: ["issues"],
			limit: 3,
		};
		const nodes = await fetchGitHubNodes("token", sm);

		expect(nodes).toHaveLength(3);
		const body = JSON.parse(
			(fetchMock.mock.calls[0]?.[1] as RequestInit)?.body as string,
		);
		expect(body.variables.first).toBe(3);
	});

	it("surfaces a 403 as GitHubRateLimitError with the reset epoch", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				graphqlResponse(
					{ message: "rate limited" },
					{ status: 403, headers: { "x-ratelimit-reset": "1735689600" } },
				),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		await expect(fetchGitHubNodes("token", sm)).rejects.toBeInstanceOf(
			GitHubRateLimitError,
		);
	});

	it("surfaces a 429 as GitHubRateLimitError", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				graphqlResponse({ message: "rate limited" }, { status: 429 }),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		await expect(fetchGitHubNodes("token", sm)).rejects.toBeInstanceOf(
			GitHubRateLimitError,
		);
	});

	it("throws on a non-ok, non-rate-limit HTTP status", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				graphqlResponse({ message: "server error" }, { status: 500 }),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		await expect(fetchGitHubNodes("token", sm)).rejects.toThrow(/500/);
	});

	it("sends the resolved token as a Bearer header (never in the query body)", async () => {
		const fetchMock = vi.fn().mockResolvedValue(graphqlResponse(page([])));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		await fetchGitHubNodes("ghp_secret_token", sm);

		const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const headers = callInit.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer ghp_secret_token");

		const body = JSON.parse(callInit.body as string);
		expect(JSON.stringify(body)).not.toContain("ghp_secret_token");
	});

	it("treats a discussions field error as an empty result (repo has no discussions)", async () => {
		const body = {
			errors: [{ message: "Field 'discussions' doesn't exist on Repository" }],
		};
		const fetchMock = vi.fn().mockResolvedValue(graphqlResponse(body));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = {
			repository: "o/r",
			kinds: ["discussions"],
		};
		const nodes = await fetchGitHubNodes("token", sm);
		expect(nodes).toEqual([]);
	});

	it("fetches multiple kinds when configured", async () => {
		const issuesPage = {
			data: {
				repository: {
					issues: {
						pageInfo: { hasNextPage: false, endCursor: null },
						nodes: [issueNode(1)],
					},
				},
			},
		};
		const prsPage = {
			data: {
				repository: {
					pullRequests: {
						pageInfo: { hasNextPage: false, endCursor: null },
						nodes: [
							{
								...(issueNode(2) as Record<string, unknown>),
								url: "https://github.com/o/r/pull/2",
							},
						],
					},
				},
			},
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(graphqlResponse(issuesPage))
			.mockResolvedValueOnce(graphqlResponse(prsPage));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: GitHubSourceMapping = {
			repository: "o/r",
			kinds: ["issues", "prs"],
		};
		const nodes = await fetchGitHubNodes("token", sm);

		expect(nodes).toHaveLength(2);
		expect(nodes.map((n) => n.kind)).toEqual(["issues", "prs"]);
	});
});
