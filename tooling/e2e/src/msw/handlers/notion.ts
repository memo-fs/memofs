/**
 * Notion MSW handler — intercepts api.notion.com/v1 and returns sanitized fixtures.
 *
 * - RUN_ID tracing, secret redacted to test-token-***.
 * - Mutable state for dedup tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpResponse, http } from "msw";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturePath = join(__dirname, "..", "fixtures", "notion.json");

type NotionFixtureFile = {
	runId: string;
	sanitized: boolean;
	secretRedacted: string;
	payload: {
		object: string;
		results: unknown[];
		has_more: boolean;
		next_cursor: string | null;
	};
};

function loadOriginal(): NotionFixtureFile {
	try {
		const raw = readFileSync(fixturePath, "utf8");
		return JSON.parse(raw) as NotionFixtureFile;
	} catch {
		return {
			runId: "test-run-e2e-0021-002",
			sanitized: true,
			secretRedacted: "test-token-***",
			payload: {
				object: "list",
				results: [
					{
						object: "page",
						id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
						url: "https://www.notion.so/Test-page",
						created_time: "2024-01-01T00:00:00.000Z",
						last_edited_time: "2024-01-02T00:00:00.000Z",
						created_by: { id: "user-1" },
						properties: {
							Name: {
								type: "title",
								title: [
									{
										plain_text:
											"Test Notion Page [RUN_ID test-run-e2e-0021-002]",
									},
								],
							},
						},
					},
				],
				has_more: false,
				next_cursor: null,
			},
		};
	}
}

const original = loadOriginal();

let currentPayload: NotionFixtureFile["payload"] = structuredClone(
	original.payload,
);

/**
 * Override Notion payload.
 * @param payload - New payload.
 */
export function setNotionPayload(payload: NotionFixtureFile["payload"]): void {
	currentPayload = structuredClone(payload);
}

/**
 * Replace Notion results array (for dedup tests).
 * @param results - New results.
 */
export function setNotionResults(results: unknown[]): void {
	currentPayload = { ...structuredClone(currentPayload), results };
}

/** Reset Notion fixture to original sanitized payload. */
export function resetNotionFixture(): void {
	currentPayload = structuredClone(original.payload);
}

/**
 * Get Notion fixture meta (RUN_ID, redacted).
 * @returns meta
 */
export function getNotionFixtureMeta(): {
	runId: string;
	secretRedacted: string;
	sanitized: boolean;
} {
	return {
		runId: original.runId,
		secretRedacted: original.secretRedacted,
		sanitized: original.sanitized,
	};
}

/** MSW handlers for Notion — returns sanitized fixture with RUN_ID and redacted secret. */
export const notionHandlers = [
	http.post(
		"https://api.notion.com/v1/databases/:databaseId/query",
		async ({ request }) => {
			const auth = request.headers.get("authorization");
			if (!auth) {
				return HttpResponse.json(
					{ message: "Unauthorized — token redacted" },
					{ status: 401 },
				);
			}
			try {
				await request.clone().json();
			} catch {}
			return HttpResponse.json(currentPayload);
		},
	),
	http.post("https://api.notion.com/v1/search", async ({ request }) => {
		const auth = request.headers.get("authorization");
		if (!auth) {
			return HttpResponse.json(
				{ message: "Unauthorized — token redacted" },
				{ status: 401 },
			);
		}
		try {
			await request.clone().json();
		} catch {}
		return HttpResponse.json(currentPayload);
	}),
];
