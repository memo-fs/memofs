/**
 * Internal utility functions for the MemoFS monorepo.
 *
 * @remarks
 * This package provides shared utilities including retry logic, error classes,
 * object manipulation, path locking, and validation helpers.
 * Used by all MemoFS packages (both OSS and internal).
 *
 * @internal
 */

export { chunkArray } from "./batching";
export type { ErrorCode, RetryableStatus } from "./errors";
export { BaseError, DEFAULT_RETRYABLE_STATUSES, ErrorCodes } from "./errors";
export {
	assertSafeObjectKey,
	cloneJsonValue,
	cloneRecord,
	isPlainObject,
} from "./objects";
export { PathLock } from "./paths";
export {
	computeBackoffDelay,
	isRetryableError,
	sleep,
	withRetry,
} from "./retry";
export {
	assertFiniteNumber,
	assertNonEmptyString,
	assertPositiveInteger,
	assertString,
	assertValidApiKey,
	isNotFoundError,
	normalizeBaseUrl,
	normalizeBatchSize,
	validateModel,
	validateTexts,
	validateVector,
} from "./validation";
