import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchNotionPages,
	NotionAuthError,
	NotionRateLimitError,
} from "../../../src/connectors/notion/fetch";
import type { NotionSourceMapping } from "../../../src/connectors/notion/types";

/** A minimal Response stand-in for the mocked fetch. */
function restResponse(
	body: unknown,
	init: { status?: number; headers?: Record<string, string> } = {},
): Response {
	const status = init.status ?? 200;
	const headers = new Map<string, string>();
	if (init.headers) {
		for (const [k, v] of Object.entries(init.headers))
			headers.set(k, v.toLowerCase());
	}
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
	} as unknown as Response;
}

function notionPage(id: string, title: string): unknown {
	return {
		object: "page",
		id,
		url: `https://www.notion.so/${id}`,
		created_time: "2026-01-15T10:00:00.000Z",
		last_edited_time: "2026-01-20T10:00:00.000Z",
		created_by: { id: "user-1" },
		properties: {
			Name: {
				type: "title",
				title: [{ plain_text: title }],
			},
			Status: {
				type: "select",
				select: { name: "In Progress" },
			},
		},
	};
}

function pageResponse(
	pages: unknown[],
	opts: { hasMore?: boolean; nextCursor?: string | null } = {},
): unknown {
	return {
		results: pages,
		has_more: opts.hasMore ?? false,
		next_cursor: opts.nextCursor ?? null,
	};
}

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
	vi.restoreAllMocks();
});

describe("fetchNotionPages", () => {
	it("queries a database endpoint when databaseId is set", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(pageResponse([notionPage("a".repeat(32), "P1")])),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		const pages = await fetchNotionPages("token", sm);

		expect(pages).toHaveLength(1);
		expect(pages[0]?.title).toBe("P1");
		expect(fetchMock).toHaveBeenCalledOnce();

		const url = fetchMock.mock.calls[0]?.[0] as string;
		expect(url).toContain("/databases/");
		expect(url).toContain("/query");
	});

	it("queries the search endpoint when only searchQuery is set", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(pageResponse([notionPage("b".repeat(32), "Found")])),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = { searchQuery: "roadmap" };
		const pages = await fetchNotionPages("token", sm);

		expect(pages).toHaveLength(1);
		expect(pages[0]?.title).toBe("Found");
		const url = fetchMock.mock.calls[0]?.[0] as string;
		expect(url).toContain("/search");

		const body = JSON.parse(
			(fetchMock.mock.calls[0]?.[1] as RequestInit)?.body as string,
		);
		expect(body.query).toBe("roadmap");
		expect(body.filter).toEqual({ value: "page", property: "object" });
	});

	it("follows the pagination cursor across pages", async () => {
		const page1 = pageResponse([notionPage("a".repeat(32), "P1")], {
			hasMore: true,
			nextCursor: "cursor-xyz",
		});
		const page2 = pageResponse([notionPage("b".repeat(32), "P2")], {
			hasMore: false,
			nextCursor: null,
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(restResponse(page1))
			.mockResolvedValueOnce(restResponse(page2));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
			limit: 25,
		};
		const pages = await fetchNotionPages("token", sm);

		expect(pages).toHaveLength(2);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const secondBody = JSON.parse(
			(fetchMock.mock.calls[1]?.[1] as RequestInit)?.body as string,
		);
		expect(secondBody.start_cursor).toBe("cursor-xyz");
	});

	it("respects the limit cap", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(
					pageResponse([
						notionPage("1".repeat(32), "1"),
						notionPage("2".repeat(32), "2"),
						notionPage("3".repeat(32), "3"),
					]),
				),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
			limit: 3,
		};
		const pages = await fetchNotionPages("token", sm);

		expect(pages).toHaveLength(3);
		const body = JSON.parse(
			(fetchMock.mock.calls[0]?.[1] as RequestInit)?.body as string,
		);
		expect(body.page_size).toBe(3);
	});

	it("surfaces a 401/403 as NotionAuthError (not a rate-limit)", async () => {
		// 401/403 is an authorization/permission failure, NOT throttling. A
		// caller that retries on rate-limit must not loop here.
		for (const status of [401, 403]) {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					restResponse({ message: "forbidden" }, { status }),
				);
			globalThis.fetch = fetchMock as unknown as typeof fetch;

			const sm: NotionSourceMapping = {
				databaseId: "0123456789abcdef0123456789abcdef",
			};
			const error = await fetchNotionPages("token", sm).catch((e) => e);
			expect(error).toBeInstanceOf(NotionAuthError);
		}
	});

	it("surfaces a 429 as NotionRateLimitError with retry-after seconds", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(
					{ message: "rate limited" },
					{ status: 429, headers: { "retry-after": "5" } },
				),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		try {
			await fetchNotionPages("token", sm);
			throw new Error("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(NotionRateLimitError);
			expect((error as NotionRateLimitError).retryAfterSeconds).toBe(5);
		}
	});

	it("throws on a non-ok, non-rate-limit HTTP status", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse({ message: "bad request" }, { status: 400 }),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		await expect(fetchNotionPages("token", sm)).rejects.toThrow(/400/);
	});

	it("sends the resolved token as a Bearer header (never in the body)", async () => {
		const fetchMock = vi.fn().mockResolvedValue(restResponse(pageResponse([])));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		await fetchNotionPages("secret_token", sm);

		const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const headers = callInit.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer secret_token");
		expect(headers["Notion-Version"]).toBe("2022-06-28");

		const body = JSON.parse(callInit.body as string);
		expect(JSON.stringify(body)).not.toContain("secret_token");
	});

	it("skips non-page objects in the results", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(
					pageResponse([
						{ object: "database", id: "x".repeat(32) },
						notionPage("a".repeat(32), "Real Page"),
					]),
				),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		const pages = await fetchNotionPages("token", sm);

		expect(pages).toHaveLength(1);
		expect(pages[0]?.title).toBe("Real Page");
	});

	it("extracts flattened scalar properties into metadata", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				restResponse(pageResponse([notionPage("a".repeat(32), "P1")])),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
		};
		const pages = await fetchNotionPages("token", sm);

		// The title-typed property is promoted to `page.title` (not duplicated
		// into properties); only the non-title scalar values are flattened.
		expect(pages[0]?.title).toBe("P1");
		expect(pages[0]?.properties).toMatchObject({
			Status: "In Progress",
		});
		expect(pages[0]?.properties).not.toHaveProperty("Name");
	});
});
