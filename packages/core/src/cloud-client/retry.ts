/**
 * Retry policy for the cloud transport.
 *
 * @remarks
 * Extracted from `transport.ts` to isolate the retry decision logic
 * (should-retry, backoff delay, `Retry-After` header parsing) from the HTTP
 * request mechanics. The transport class delegates retry decisions here.
 *
 * @internal
 */

import { MemoFSCloudNetworkError, MemoFSCloudTimeoutError } from "./errors";
import type { MemoFSCloudRetryOptions } from "./types";

export const DEFAULT_RETRY_OPTIONS: Required<MemoFSCloudRetryOptions> =
	Object.freeze({
		retries: 2,
		baseDelayMs: 250,
		maxDelayMs: 2_500,
		statuses: [408, 409, 425, 429, 500, 502, 503, 504],
	});

/**
 * Normalizes retry options, filling defaults or returning `false` to disable.
 */
export function normalizeRetryOptions(
	retry: MemoFSCloudRetryOptions | false | undefined,
): Required<MemoFSCloudRetryOptions> | false {
	if (retry === false) return false;
	return {
		retries: retry?.retries ?? DEFAULT_RETRY_OPTIONS.retries,
		baseDelayMs: retry?.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs,
		maxDelayMs: retry?.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs,
		statuses: retry?.statuses ?? DEFAULT_RETRY_OPTIONS.statuses,
	};
}

/**
 * Parses the `Retry-After` header (seconds or HTTP-date) into milliseconds.
 */
export function parseRetryAfter(value: string | null): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	const dateMs = Date.parse(value);
	if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
	return undefined;
}

/**
 * Decides whether a failed attempt should be retried.
 */
export function shouldRetry(
	error: unknown,
	attempt: number,
	attempts: number,
	retry: Required<MemoFSCloudRetryOptions> | false,
): boolean {
	if (retry === false || attempt >= attempts - 1) return false;
	const status =
		typeof error === "object" && error !== null && "status" in error
			? (error as { status?: unknown }).status
			: undefined;
	if (typeof status === "number") return retry.statuses.includes(status);
	return (
		error instanceof MemoFSCloudNetworkError ||
		error instanceof MemoFSCloudTimeoutError
	);
}

/**
 * Computes the delay before the next retry attempt (exponential backoff +
 * jitter, honoring `Retry-After` when present).
 */
export function getRetryDelayMs(
	error: unknown,
	attempt: number,
	retry: Required<MemoFSCloudRetryOptions> | false,
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

/**
 * Promise-based sleep helper.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
