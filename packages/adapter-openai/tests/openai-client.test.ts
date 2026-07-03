import { describe, expect, it, vi } from "vitest";
import {
	OpenAIAPIError,
	OpenAIConfigError,
	OpenAINetworkError,
	OpenAIResponseError,
	type OpenAISdkClientConfig,
	OpenAISdkEmbeddingsClient,
} from "../src";

function sdkClient(options: { response?: unknown; error?: Error }): NonNullable<
	OpenAISdkClientConfig["sdkClient"]
> & {
	embeddings: { create: ReturnType<typeof vi.fn> };
} {
	return {
		embeddings: {
			create: vi.fn(async () => {
				if (options.error) throw options.error;
				return options.response;
			}),
		},
	};
}

describe("OpenAISdkEmbeddingsClient", () => {
	it("delegates embeddings requests to the official SDK client", async () => {
		const sdk = sdkClient({
			response: {
				data: [{ object: "embedding", index: 0, embedding: [0.1, 0.2] }],
				model: "text-embedding-3-small",
			},
		});
		const client = new OpenAISdkEmbeddingsClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			organization: "org_123",
			project: "proj_123",
			sdkClient: sdk,
		});

		const request = {
			input: ["hello"],
			model: "text-embedding-3-small",
		} as const satisfies Parameters<
			OpenAISdkEmbeddingsClient["createEmbeddings"]
		>[0];
		await client.createEmbeddings(request);

		expect(sdk.embeddings.create).toHaveBeenCalledWith(request);
	});

	it("rejects invalid baseUrl", () => {
		expect(
			() =>
				new OpenAISdkEmbeddingsClient({
					apiKey: "key",
					baseUrl: "http://example.com",
				}),
		).toThrow(OpenAIConfigError);
	});

	it("wraps SDK API errors without leaking API keys", async () => {
		const error = Object.assign(new Error("Bad request sk-secret123"), {
			status: 400,
			code: "bad_request",
			type: "invalid_request_error",
		});
		const client = new OpenAISdkEmbeddingsClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			sdkClient: sdkClient({ error }),
		});

		await expect(
			client.createEmbeddings({
				input: ["hello"],
				model: "text-embedding-3-small",
			}),
		).rejects.toThrow(OpenAIAPIError);
		await expect(
			client.createEmbeddings({
				input: ["hello"],
				model: "text-embedding-3-small",
			}),
		).rejects.not.toThrow(/sk-secret123/);
	});

	it("wraps non-object SDK responses", async () => {
		const client = new OpenAISdkEmbeddingsClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			sdkClient: sdkClient({ response: null }),
		});

		await expect(
			client.createEmbeddings({
				input: ["hello"],
				model: "text-embedding-3-small",
			}),
		).rejects.toThrow(OpenAIResponseError);
	});

	it("wraps SDK network errors", async () => {
		const client = new OpenAISdkEmbeddingsClient({
			apiKey: "test-key",
			baseUrl: "https://api.test.local",
			sdkClient: sdkClient({ error: new Error("network down") }),
		});

		await expect(
			client.createEmbeddings({
				input: ["hello"],
				model: "text-embedding-3-small",
			}),
		).rejects.toThrow(OpenAINetworkError);
	});
});
