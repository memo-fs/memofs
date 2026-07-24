/**
 * GitHub MSW handler — intercepts api.github.com/graphql and returns sanitized fixtures.
 *
 * @remarks
 * - Includes RUN_ID in fixture titles/bodies for tracing.
 * - Secret redacted to test-token-***.
 * - Supports mutable state for e2e connector dedup tests (changed record re-ingested).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { http, HttpResponse } from "msw";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturePath = join(__dirname, "..", "fixtures", "github.json");

type GitHubFixtureFile = {
	runId: string;
	sanitized: boolean;
	secretRedacted: string;
	payload: {
		data: {
			repository: {
				issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: unknown[] };
				pullRequests: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: unknown[] };
				discussions: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: unknown[] };
			};
		};
	};
};

function loadOriginal(): GitHubFixtureFile {
	try {
		const raw = readFileSync(fixturePath, "utf8");
		return JSON.parse(raw) as GitHubFixtureFile;
	} catch {
		// fallback inline if file missing (for safety)
		return {
			runId: "test-run-e2e-0021-001",
			sanitized: true,
			secretRedacted: "test-token-***",
			payload: {
				data: {
					repository: {
						issues: {
							pageInfo: { hasNextPage: false, endCursor: null },
							nodes: [
								{
									number: 1,
									title: "Fix bug A [RUN_ID test-run-e2e-0021-001]",
									body: "Issue 1 body RUN_ID test-run-e2e-0021-001 token test-token-***",
									url: "https://github.com/example/repo/issues/1",
									state: "OPEN",
									createdAt: "2024-01-01T00:00:00Z",
									author: { login: "alice" },
									labels: { nodes: [{ name: "bug" }] },
								},
							],
						},
						pullRequests: {
							pageInfo: { hasNextPage: false, endCursor: null },
							nodes: [],
						},
						discussions: {
							pageInfo: { hasNextPage: false, endCursor: null },
							nodes: [],
						},
					},
				},
			},
		};
	}
}

const original = loadOriginal();

/**
 * Mutable state — copied from fixture payload.
 * Tests may mutate via setGitHubFixture / resetGitHubFixture to prove changed-record re-ingested.
 */
let currentPayload: GitHubFixtureFile["payload"] = structuredClone(original.payload);

/**
 * Override the whole payload (for advanced scenarios).
 * @param payload - The new GitHub GraphQL payload to use.
 */
export function setGitHubPayload(payload: GitHubFixtureFile["payload"]): void {
	currentPayload = structuredClone(payload);
}

/**
 * Replace issue/PR nodes directly (convenient for changed-record test).
 * @param opts - Nodes to replace.
 */
export function setGitHubNodes(opts: {
	issues?: unknown[];
	pullRequests?: unknown[];
	discussions?: unknown[];
}): void {
	if (opts.issues !== undefined) {
		currentPayload.data.repository.issues.nodes = opts.issues;
	}
	if (opts.pullRequests !== undefined) {
		currentPayload.data.repository.pullRequests.nodes = opts.pullRequests;
	}
	if (opts.discussions !== undefined) {
		currentPayload.data.repository.discussions.nodes = opts.discussions;
	}
}

/** Reset to original fixture (sanitized). */
export function resetGitHubFixture(): void {
	currentPayload = structuredClone(original.payload);
}

/**
 * Current fixture meta for assertions (RUN_ID, redacted).
 * @returns meta with runId, secretRedacted, sanitized flag.
 */
export function getGitHubFixtureMeta(): { runId: string; secretRedacted: string; sanitized: boolean } {
	return {
		runId: original.runId,
		secretRedacted: original.secretRedacted,
		sanitized: original.sanitized,
	};
}

/** MSW handlers for GitHub GraphQL — returns sanitized fixture with RUN_ID and redacted secret. */
export const githubHandlers = [
	http.post("https://api.github.com/graphql", async ({ request }) => {
		// Never log Authorization; redact in any error path — we just ensure header exists for real code path proof.
		// The real connector sends Bearer <token>; we accept anything but don't echo it.
		const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
		if (!auth) {
			return HttpResponse.json(
				{ errors: [{ message: "Unauthorized — missing token (redacted)" }] },
				{ status: 401 },
			);
		}

		// Consume body to ensure we handle any shape; ignore errors.
		try {
			await request.clone().json();
		} catch {
			// ignore — still return fixture
		}

		// Return sanitized payload — no secrets inside.
		return HttpResponse.json(currentPayload);
	}),
];
