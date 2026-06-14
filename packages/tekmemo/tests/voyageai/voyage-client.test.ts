import { describe, expect, it, vi } from "vitest";
import {
	VoyageApiError,
	VoyageConfigError,
	type VoyageFetchLike,
	VoyageResponseError,
	VoyageRestClient,
} from "../../src";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("VoyageRestClient", () => {
	it("posts to /v1/embeddings with bearer auth", async () => {
		const fetchMock = vi.fn<VoyageFetchLike>(async () =>
			jsonResponse({
				data: [{ embedding: [0.1, 0.2] }],
			}),
		);

		const client = new VoyageRestClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await client.createEmbeddings({
			input: ["hello"],
			model: "voyage-4-lite",
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const firstCall = fetchMock.mock.calls[0];
		if (!firstCall) throw new Error("Expected fetch to be called.");
		const [url, init] = firstCall;
		expect(url).toBe("https://api.test.local/v1/embeddings");
		expect((init as RequestInit).method).toBe("POST");
		expect((init as RequestInit).headers).toMatchObject({
			authorization: "Bearer test-key",
			"content-type": "application/json",
			accept: "application/json",
		});
	});

	it("rejects invalid baseUrl", () => {
		expect(
			() =>
				new VoyageRestClient({ apiKey: "key", baseUrl: "http://example.com" }),
		).toThrow(VoyageConfigError);
	});

	it("wraps API errors", async () => {
		const fetchMock = vi.fn<VoyageFetchLike>(async () =>
			jsonResponse(
				{
					error: { code: "bad_request", message: "Bad request" },
				},
				400,
			),
		);

		const client = new VoyageRestClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await expect(
			client.createEmbeddings({ input: ["hello"], model: "voyage-4-lite" }),
		).rejects.toThrow(VoyageApiError);
	});

	it("wraps invalid JSON", async () => {
		const fetchMock = vi.fn<VoyageFetchLike>(
			async () => new Response("{", { status: 200 }),
		);

		const client = new VoyageRestClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 0 },
		});

		await expect(
			client.createEmbeddings({ input: ["hello"], model: "voyage-4-lite" }),
		).rejects.toThrow(VoyageResponseError);
	});

	it("retries retryable status codes", async () => {
		const fetchMock = vi
			.fn<VoyageFetchLike>()
			.mockResolvedValueOnce(
				jsonResponse({ error: { message: "rate limited" } }, 429),
			)
			.mockResolvedValueOnce(jsonResponse({ data: [{ embedding: [1, 2] }] }));

		const client = new VoyageRestClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			fetch: fetchMock,
			retry: { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 1, jitter: false },
		});

		const result = await client.createEmbeddings({
			input: ["hello"],
			model: "voyage-4-lite",
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result.data[0]?.embedding).toEqual([1, 2]);
	});
});
