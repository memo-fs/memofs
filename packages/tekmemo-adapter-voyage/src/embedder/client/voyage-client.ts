import {
	VoyageApiError,
	VoyageNetworkError,
	VoyageResponseError,
	VoyageTimeoutError,
} from "../errors/voyage-errors";
import { VOYAGE_EMBEDDINGS_PATH } from "../models/models";
import type {
	VoyageClient,
	VoyageClientConfig,
	VoyageEmbeddingsRequest,
	VoyageEmbeddingsResponse,
} from "../types";
import { withRetry } from "../utils/retry";
import { assertValidApiKey, normalizeBaseUrl } from "../utils/validation";

export class VoyageRestClient implements VoyageClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly fetchImpl: NonNullable<VoyageClientConfig["fetch"]>;
	private readonly timeoutMs: number;
	private readonly retry: VoyageClientConfig["retry"];
	private readonly userAgent?: string;

	constructor(config: VoyageClientConfig) {
		assertValidApiKey(config.apiKey);

		this.apiKey = config.apiKey;
		this.baseUrl = normalizeBaseUrl(config.baseUrl);
		this.fetchImpl = config.fetch ?? fetch;
		this.timeoutMs = config.timeoutMs ?? 30_000;
		this.retry = config.retry;
		this.userAgent = config.userAgent;
	}

	async createEmbeddings(
		request: VoyageEmbeddingsRequest,
	): Promise<VoyageEmbeddingsResponse> {
		return withRetry(() => this.createEmbeddingsOnce(request), this.retry);
	}

	private async createEmbeddingsOnce(
		request: VoyageEmbeddingsRequest,
	): Promise<VoyageEmbeddingsResponse> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await this.fetchImpl(
				`${this.baseUrl}${VOYAGE_EMBEDDINGS_PATH}`,
				{
					method: "POST",
					headers: this.headers(),
					body: JSON.stringify(request),
					signal: controller.signal,
				},
			);

			const payload = await parseJsonSafely(response);

			if (!response.ok) {
				const provider = extractProviderError(payload);
				throw new VoyageApiError(
					provider.message ??
						`Voyage API request failed with status ${response.status}.`,
					{
						status: response.status,
						providerCode: provider.code,
						providerBody: payload,
					},
				);
			}

			if (typeof payload !== "object" || payload === null) {
				throw new VoyageResponseError(
					"Voyage API returned a non-object JSON response.",
				);
			}

			return payload as VoyageEmbeddingsResponse;
		} catch (error) {
			if (isAbortError(error)) {
				throw new VoyageTimeoutError(
					`Voyage request timed out after ${this.timeoutMs}ms.`,
					{ cause: error },
				);
			}

			if (
				error instanceof VoyageApiError ||
				error instanceof VoyageResponseError ||
				error instanceof VoyageTimeoutError
			) {
				throw error;
			}

			throw new VoyageNetworkError(
				"Voyage request failed before receiving a valid response.",
				{ cause: error },
			);
		} finally {
			clearTimeout(timeout);
		}
	}

	private headers(): HeadersInit {
		const headers: Record<string, string> = {
			authorization: `Bearer ${this.apiKey}`,
			"content-type": "application/json",
			accept: "application/json",
		};

		if (this.userAgent) {
			headers["user-agent"] = this.userAgent;
		}

		return headers;
	}
}

export function createVoyageClient(config: VoyageClientConfig): VoyageClient {
	return new VoyageRestClient(config);
}

async function parseJsonSafely(response: Response): Promise<unknown> {
	const text = await response.text();

	if (text.trim().length === 0) {
		return null;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch (error) {
		throw new VoyageResponseError("Voyage API returned invalid JSON.", {
			cause: error,
		});
	}
}

function extractProviderError(payload: unknown): {
	code?: string;
	message?: string;
} {
	if (typeof payload !== "object" || payload === null) {
		return {};
	}

	const record = payload as Record<string, unknown>;

	if (typeof record.error === "object" && record.error !== null) {
		const error = record.error as Record<string, unknown>;
		return {
			code: typeof error.code === "string" ? error.code : undefined,
			message: typeof error.message === "string" ? error.message : undefined,
		};
	}

	return {
		code: typeof record.code === "string" ? record.code : undefined,
		message: typeof record.message === "string" ? record.message : undefined,
	};
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
