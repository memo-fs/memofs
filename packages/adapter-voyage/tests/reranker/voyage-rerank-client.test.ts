import { describe, expect, it, vi } from "vitest";
import {
	VoyageRerankApiError,
	VoyageRerankConfigError,
	type VoyageRerankFetchLike,
	VoyageRerankResponseError,
	VoyageRerankRestClient,
} from "../../src";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("VoyageRerankRestClient", () => {
	it("posts to /v1/rerank with bearer auth", async () => {
		const fetchMock = vi.fn<VoyageRerankFetchLike>(async () =>
			jsonResponse({ data: [{ index: 0, relevance_score: 1 }] }),
		);

		const client = new VoyageRerankRestClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await client.rerank({
			query: "q",
			documents: ["doc"],
			model: "rerank-2.5-lite",
		});

		const firstCall = fetchMock.mock.calls[0];
		if (!firstCall) throw new Error("Expected fetch to be called.");
		const [url, init] = firstCall;
		expect(url).toBe("https://api.test.local/v1/rerank");
		expect((init as RequestInit).headers).toMatchObject({
			authorization: "Bearer test-key",
			"content-type": "application/json",
			accept: "application/json",
		});
	});

	it("rejects insecure base URL outside localhost", () => {
		expect(
			() =>
				new VoyageRerankRestClient({
					apiKey: "key",
					baseUrl: "http://example.com",
				}),
		).toThrow(VoyageRerankConfigError);
	});

	it("wraps API errors", async () => {
		const fetchMock = vi.fn<VoyageRerankFetchLike>(async () =>
			jsonResponse({ error: { message: "bad" } }, 400),
		);
		const client = new VoyageRerankRestClient({
			apiKey: "key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await expect(
			client.rerank({ query: "q", documents: ["d"], model: "rerank-2.5-lite" }),
		).rejects.toThrow(VoyageRerankApiError);
	});

	it("wraps invalid JSON", async () => {
		const fetchMock = vi.fn<VoyageRerankFetchLike>(
			async () => new Response("{", { status: 200 }),
		);
		const client = new VoyageRerankRestClient({
			apiKey: "key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await expect(
			client.rerank({ query: "q", documents: ["d"], model: "rerank-2.5-lite" }),
		).rejects.toThrow(VoyageRerankResponseError);
	});

	it("retries retryable failures", async () => {
		const fetchMock = vi
			.fn<VoyageRerankFetchLike>()
			.mockResolvedValueOnce(jsonResponse({ error: { message: "rate" } }, 429))
			.mockResolvedValueOnce(
				jsonResponse({ data: [{ index: 0, relevance_score: 1 }] }),
			);

		const client = new VoyageRerankRestClient({
			apiKey: "key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 1, jitter: false },
		});

		await client.rerank({
			query: "q",
			documents: ["d"],
			model: "rerank-2.5-lite",
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
