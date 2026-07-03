import {
	createHttpError,
	redactSecrets,
	TekMemoCloudAuthError,
	TekMemoCloudNetworkError,
	TekMemoCloudResponseParseError,
	TekMemoCloudTimeoutError,
} from "./errors";
import type {
	TekMemoCloudClientOptions,
	TekMemoCloudErrorEnvelope,
	TekMemoCloudFetch,
	TekMemoCloudRequestOptions,
	TekMemoCloudRetryOptions,
	TekMemoCloudSuccessEnvelope,
} from "./types";
import { normalizeApiKey, normalizeBaseUrl } from "./validation";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_OPTIONS: Required<TekMemoCloudRetryOptions> = Object.freeze(
	{
		retries: 2,
		baseDelayMs: 250,
		maxDelayMs: 2_500,
		statuses: [408, 409, 425, 429, 500, 502, 503, 504],
	},
);

export interface TekMemoCloudTransportOptions
	extends TekMemoCloudClientOptions {}

export class TekMemoCloudTransport {
	readonly baseUrl: string;
	private readonly apiKey?: string;
	private readonly fetchImpl: TekMemoCloudFetch;
	private readonly timeoutMs: number;
	private readonly retryOptions: Required<TekMemoCloudRetryOptions> | false;
	private readonly headers: Record<string, string>;
	private readonly requireApiKey: boolean;

	constructor(options: TekMemoCloudTransportOptions) {
		this.baseUrl = normalizeBaseUrl(options.baseUrl);
		this.apiKey = normalizeApiKey(options.apiKey);
		this.fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
		if (typeof this.fetchImpl !== "function") {
			throw new TekMemoCloudNetworkError({
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

	async request<T>(options: TekMemoCloudRequestOptions): Promise<T> {
		if ((options.requireApiKey ?? this.requireApiKey) && !this.apiKey) {
			throw new TekMemoCloudAuthError({
				code: "api_key_required",
				message:
					"TekMemo Cloud API key is required. Set TEKMEMO_API_KEY or pass apiKey.",
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

	private async requestOnce<T>(
		options: TekMemoCloudRequestOptions,
	): Promise<T> {
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
			const retryAfterMs = parseRetryAfter(response.headers);
			const payload = await parseJsonPayload(response);

			if (!response.ok) {
				const errorBody = unwrapErrorBody(payload, headerRequestId);
				throw createHttpError({
					code: errorBody.code || httpStatusCode(response.status),
					message: redactSecrets(
						errorBody.message ||
							`TekMemo Cloud request failed with HTTP ${response.status}.`,
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
				throw new TekMemoCloudTimeoutError({
					code: "request_timeout",
					message: `TekMemo Cloud request timed out after ${this.timeoutMs}ms.`,
					cause: error,
				});
			}
			if (error instanceof TypeError) {
				throw new TekMemoCloudNetworkError({
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

function normalizeRetryOptions(
	retry: TekMemoCloudRetryOptions | false | undefined,
): Required<TekMemoCloudRetryOptions> | false {
	if (retry === false) return false;
	return {
		retries: retry?.retries ?? DEFAULT_RETRY_OPTIONS.retries,
		baseDelayMs: retry?.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs,
		maxDelayMs: retry?.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs,
		statuses: retry?.statuses ?? DEFAULT_RETRY_OPTIONS.statuses,
	};
}

function buildUrl(
	baseUrl: string,
	path: string,
	query:
		| Record<string, string | number | boolean | null | undefined>
		| undefined,
): URL {
	if (!path.startsWith("/")) {
		throw new TekMemoCloudNetworkError({
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

async function parseJsonPayload(response: {
	text(): Promise<string>;
	status: number;
}): Promise<unknown> {
	const text = await response.text();
	if (!text.trim()) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch (cause) {
		throw new TekMemoCloudResponseParseError({
			code: "invalid_json_response",
			message: "TekMemo Cloud response was not valid JSON.",
			status: response.status,
			cause,
		});
	}
}

function unwrapSuccessPayload<T>(
	payload: unknown,
	headerRequestId: string | undefined,
): T {
	if (isSuccessEnvelope<T>(payload)) return payload.data;
	if (isErrorEnvelope(payload)) {
		throw createHttpError({
			code: payload.error.code,
			message: payload.error.message,
			requestId: payload.meta?.requestId ?? headerRequestId,
			details: payload.error.details,
		});
	}

	throw new TekMemoCloudResponseParseError({
		code: "invalid_response_envelope",
		message:
			"TekMemo Cloud response must use { data, meta } or { error, meta } envelope.",
		requestId: headerRequestId,
	});
}

function unwrapErrorBody(
	payload: unknown,
	headerRequestId: string | undefined,
): { code?: string; message?: string; details?: unknown; requestId?: string } {
	if (isErrorEnvelope(payload)) {
		return {
			code: payload.error.code,
			message: payload.error.message,
			details: payload.error.details,
			requestId: payload.meta?.requestId ?? headerRequestId,
		};
	}

	if (typeof payload === "object" && payload !== null && "message" in payload) {
		return {
			message: String((payload as { message: unknown }).message),
			requestId: headerRequestId,
		};
	}
	return { requestId: headerRequestId };
}

function isSuccessEnvelope<T>(
	payload: unknown,
): payload is TekMemoCloudSuccessEnvelope<T> {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"data" in payload &&
		!("error" in payload)
	);
}

function isErrorEnvelope(
	payload: unknown,
): payload is TekMemoCloudErrorEnvelope {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"error" in payload &&
		typeof (payload as { error?: unknown }).error === "object" &&
		(payload as { error?: unknown }).error !== null
	);
}

function getHeader(headers: Headers, name: string): string | null {
	return headers.get(name) ?? headers.get(name.toLowerCase());
}

function parseRetryAfter(headers: Headers): number | undefined {
	const value = getHeader(headers, "retry-after");
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	const dateMs = Date.parse(value);
	if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
	return undefined;
}

function shouldRetry(
	error: unknown,
	attempt: number,
	attempts: number,
	retry: Required<TekMemoCloudRetryOptions> | false,
): boolean {
	if (retry === false || attempt >= attempts - 1) return false;
	const status =
		typeof error === "object" && error !== null && "status" in error
			? (error as { status?: unknown }).status
			: undefined;
	if (typeof status === "number") return retry.statuses.includes(status);
	return (
		error instanceof TekMemoCloudNetworkError ||
		error instanceof TekMemoCloudTimeoutError
	);
}

function getRetryDelayMs(
	error: unknown,
	attempt: number,
	retry: Required<TekMemoCloudRetryOptions> | false,
): number {
	if (retry === false) return 0;
	const retryAfterMs =
		typeof error === "object" && error !== null && "retryAfterMs" in error
			? (error as { retryAfterMs?: unknown }).retryAfterMs
			: undefined;
	if (typeof retryAfterMs === "number")
		return Math.min(retryAfterMs, retry.maxDelayMs);
	const exponential = retry.baseDelayMs * 2 ** attempt;
	const jitter = Math.floor(Math.random() * Math.min(100, retry.baseDelayMs));
	return Math.min(exponential + jitter, retry.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
