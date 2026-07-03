import { computeBackoffDelay, withRetry as withSharedRetry } from "@repo/utils";
import {
	OpenAIAPIError,
	OpenAINetworkError,
	OpenAITimeoutError,
} from "../errors/openai-errors";
import type { OpenAIRetryOptions } from "../types";

const DEFAULT_RETRYABLE_STATUSES = [
	408, 409, 425, 429, 500, 502, 503, 504,
] as const;

export function isRetryableError(
	error: unknown,
	retryableStatuses: readonly number[] = DEFAULT_RETRYABLE_STATUSES,
): boolean {
	if (error instanceof OpenAIAPIError) {
		return retryableStatuses.includes(error.status);
	}

	if (
		error instanceof OpenAINetworkError ||
		error instanceof OpenAITimeoutError
	) {
		return true;
	}

	return false;
}

export { computeBackoffDelay };

export async function withRetry<T>(
	operation: () => Promise<T>,
	options?: OpenAIRetryOptions,
): Promise<T> {
	const retryableStatuses =
		options?.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES;
	return withSharedRetry(operation, {
		...options,
		isRetryable: (error) => isRetryableError(error, retryableStatuses),
	});
}
