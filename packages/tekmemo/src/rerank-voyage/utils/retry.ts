/**
 * @file Retry utilities for Voyage AI rerank requests.
 *
 * @remarks
 * This module provides retry logic specifically tailored for Voyage AI API requests.
 * It determines which errors are retryable and delegates the actual retry mechanism
 * to the shared utility from @repo/utils.
 *
 * @internal
 */

import { computeBackoffDelay, withRetry as withSharedRetry } from "@repo/utils";
import {
	VoyageRerankApiError,
	VoyageRerankNetworkError,
	VoyageRerankTimeoutError,
} from "../errors/voyage-rerank-errors";
import type { VoyageRerankRetryOptions } from "../types";

/** Default HTTP status codes that are considered retryable. */
const DEFAULT_RETRYABLE_STATUSES = [
	408, 409, 425, 429, 500, 502, 503, 504,
] as const;

/**
 * Determines if an error should trigger a retry for Voyage AI requests.
 *
 * @internal
 * @param error - The error to check.
 * @param retryableStatuses - List of HTTP status codes that should be retried. Defaults to common retryable statuses.
 * @returns True if the error is retryable (network error, timeout, or API error with retryable status).
 */
export function isRetryableVoyageRerankError(
	error: unknown,
	retryableStatuses: readonly number[] = DEFAULT_RETRYABLE_STATUSES,
): boolean {
	if (error instanceof VoyageRerankApiError) {
		return retryableStatuses.includes(error.status);
	}

	return (
		error instanceof VoyageRerankNetworkError ||
		error instanceof VoyageRerankTimeoutError
	);
}

/**
 * Computes the backoff delay for a retry attempt.
 *
 * @internal
 * @remarks
 * Re-exported from @repo/utils for convenience.
 */
export { computeBackoffDelay };

/**
 * Wraps an operation with retry logic for Voyage AI requests.
 *
 * @internal
 * @param operation - The async operation to execute with retry support.
 * @param options - Retry configuration options.
 * @returns A promise that resolves to the operation result.
 * @throws The last error if all retry attempts are exhausted.
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options?: VoyageRerankRetryOptions,
): Promise<T> {
	const retryableStatuses =
		options?.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES;
	return withSharedRetry(operation, {
		...options,
		isRetryable: (error) =>
			isRetryableVoyageRerankError(error, retryableStatuses),
	});
}
