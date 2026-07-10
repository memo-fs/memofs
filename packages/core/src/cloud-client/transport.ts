import {
	parseJsonPayload,
	unwrapErrorBody,
	unwrapSuccessPayload,
} from "./envelope";
import {
	createHttpError,
	MemoFSCloudNetworkError,
	MemoFSCloudTimeoutError,
	MemoFsCloudAuthError,
	redactSecrets,
} from "./errors";
import {
	getRetryDelayMs,
	normalizeRetryOptions,
	parseRetryAfter,
	shouldRetry,
	sleep,
} from "./retry";
import type {
	MemoFSCloudRequestOptions,
	MemoFSCloudRetryOptions,
	MemoFsCloudClientOptions,
	MemoFsCloudFetch,
} from "./types";
import { normalizeApiKey, normalizeBaseUrl } from "./validation";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface MemoFsCloudTransportOptions extends MemoFsCloudClientOptions {}

export class MemoFsCloudTransport {
	readonly baseUrl: string;
	private readonly apiKey?: string;
	private readonly fetchImpl: MemoFsCloudFetch;
	private readonly timeoutMs: number;
	private readonly retryOptions: Required<MemoFSCloudRetryOptions> | false;
	private readonly headers: Record<string, string>;
	private readonly requireApiKey: boolean;

	constructor(options: MemoFsCloudTransportOptions) {
		this.baseUrl = normalizeBaseUrl(options.baseUrl);
		this.apiKey = normalizeApiKey(options.apiKey);
		this.fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
		if (typeof this.fetchImpl !== "function") {
			throw new MemoFSCloudNetworkError({
				code: "fetch_unavailable",
				message:
					"No fetch implementation is available. Pass a fetch implementation in client options.",
			});
		}
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.retryOptions = normalizeRetryOptions(options.retry);
		this.headers = normalizeHeaders(options.headers, options.userAgent);
		this.requireApiKey = options.requireApiKey ?? true;
	}

	async request<T>(options: MemoFSCloudRequestOptions): Promise<T> {
		if ((options.requireApiKey ?? this.requireApiKey) && !this.apiKey) {
			throw new MemoFsCloudAuthError({
				code: "api_key_required",
				message:
					"MemoFS Cloud API key is required. Set MEMOFS_API_KEY or pass apiKey.",
			});
		}

		const retry = this.retryOptions;
		const attempts = retry === false ? 1 : retry.retries + 1;
		let lastError: unknown;

		for (let attempt = 0; attempt < attempts; attempt += 1) {
			try {
				return await this.requestOnce<T>(options);
			} catch (error) {
				lastError = error;
				if (!shouldRetry(error, attempt, attempts, retry)) throw error;
				await sleep(getRetryDelayMs(error, attempt, retry));
			}
		}

		throw lastError;
	}

	private async requestOnce<T>(options: MemoFSCloudRequestOptions): Promise<T> {
		const timeoutController = new AbortController();
		const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs);
		const signal = mergeAbortSignals(options.signal, timeoutController.signal);

		try {
			const url = buildUrl(this.baseUrl, options.path, options.query);
			const response = await this.fetchImpl(url, {
				method: options.method,
				headers: this.createHeaders(options.body !== undefined),
				body:
					options.body === undefined ? undefined : JSON.stringify(options.body),
				signal,
			});

			const headerRequestId =
				getHeader(response.headers, "x-request-id") ?? undefined;
			const retryAfterMs = parseRetryAfter(
				getHeader(response.headers, "retry-after"),
			);
			const payload = await parseJsonPayload(response);

			if (!response.ok) {
				const errorBody = unwrapErrorBody(payload, headerRequestId);
				throw createHttpError({
					code: errorBody.code || httpStatusCode(response.status),
					message: redactSecrets(
						errorBody.message ||
							`MemoFS Cloud request failed with HTTP ${response.status}.`,
						[this.apiKey],
					),
					status: response.status,
					requestId: errorBody.requestId ?? headerRequestId,
					retryAfterMs,
					details: errorBody.details as never,
				});
			}

			const unwrapped = unwrapSuccessPayload<T>(payload, headerRequestId);
			return unwrapped;
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				throw new MemoFSCloudTimeoutError({
					code: "request_timeout",
					message: `MemoFS Cloud request timed out after ${this.timeoutMs}ms.`,
					cause: error,
				});
			}
			if (error instanceof TypeError) {
				throw new MemoFSCloudNetworkError({
					code: "network_error",
					message: redactSecrets(error.message, [this.apiKey]),
					cause: error,
				});
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	private createHeaders(hasBody: boolean): HeadersInit {
		const headers: Record<string, string> = {
			Accept: "application/json",
			...this.headers,
		};
		if (hasBody) headers["Content-Type"] = "application/json";
		if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
		return headers;
	}
}

function normalizeHeaders(
	headers: Record<string, string> | undefined,
	userAgent: string | undefined,
): Record<string, string> {
	const output: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers ?? {})) {
		if (/^authorization$/i.test(key)) continue;
		if (value !== undefined && value !== null) output[key] = value;
	}
	if (
		userAgent &&
		!Object.keys(output).some((key) => key.toLowerCase() === "user-agent")
	) {
		output["User-Agent"] = userAgent;
	}
	return output;
}

function buildUrl(
	baseUrl: string,
	path: string,
	query:
		| Record<string, string | number | boolean | null | undefined>
		| undefined,
): URL {
	if (!path.startsWith("/")) {
		throw new MemoFSCloudNetworkError({
			code: "invalid_path",
			message: "request path must start with /.",
		});
	}
	const url = new URL(`${baseUrl}${path}`);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined && value !== null && value !== "")
			url.searchParams.set(key, String(value));
	}
	return url;
}

function getHeader(headers: Headers, name: string): string | null {
	return headers.get(name) ?? headers.get(name.toLowerCase());
}

function httpStatusCode(status: number): string {
	if (status === 400) return "bad_request";
	if (status === 401) return "unauthorized";
	if (status === 403) return "forbidden";
	if (status === 404) return "not_found";
	if (status === 409) return "conflict";
	if (status === 422) return "validation_error";
	if (status === 429) return "rate_limited";
	if (status >= 500) return "server_error";
	return `http_${status}`;
}

function mergeAbortSignals(
	first: AbortSignal | undefined,
	second: AbortSignal,
): AbortSignal {
	if (!first) return second;
	if (first.aborted) return first;
	if (second.aborted) return second;

	const controller = new AbortController();
	const abort = () => controller.abort();
	first.addEventListener("abort", abort, { once: true });
	second.addEventListener("abort", abort, { once: true });
	return controller.signal;
}
