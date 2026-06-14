import { MemoryStoreError } from "@tekbreed/tekmemo";

/**
 * Error class for filesystem memory store errors.
 *
 * @remarks
 * Extends {@link MemoryStoreError} to add Node.js-specific error handling.
 *
 * @public
 */
export class FsMemoryStoreError extends MemoryStoreError {
	/**
	 * Creates a new FsMemoryStoreError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details.
	 * @param cause - Optional original error.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super(message, details, cause);
		this.name = "FsMemoryStoreError";
	}
}

/**
 * Checks if an error is a Node.js ErrnoException.
 *
 * @param error - The error to check.
 * @returns `true` if the error has a `code` property, `false` otherwise.
 */
export function isNodeErrnoException(
	error: unknown,
): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}

/**
 * Checks if an error is a "not found" (ENOENT) error.
 *
 * @param error - The error to check.
 * @returns `true` if the error is an ENOENT error, `false` otherwise.
 */
export function isNotFoundError(error: unknown): boolean {
	return isNodeErrnoException(error) && error.code === "ENOENT";
}

/**
 * Checks if an error is an "already exists" (EEXIST) error.
 *
 * @param error - The error to check.
 * @returns `true` if the error is an EEXIST error, `false` otherwise.
 */
export function isAlreadyExistsError(error: unknown): boolean {
	return isNodeErrnoException(error) && error.code === "EEXIST";
}

export function wrapFsError(
	message: string,
	details: Record<string, unknown>,
	cause: unknown,
): FsMemoryStoreError {
	return new FsMemoryStoreError(message, details, cause);
}
