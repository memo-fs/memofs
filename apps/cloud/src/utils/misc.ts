import { StatusCodes } from "http-status-codes";

/**
 * Formats a byte count as a human-readable string with binary-ish thresholds.
 * Uses 1024-based units (B → KB → MB → GB) with one decimal place (two for GB).
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
	return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Formats an ISO timestamp as a localized short date ("Jun 22, 2026").
 * Returns an empty-ish fallback for invalid input rather than throwing.
 */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Formats an ISO timestamp as a relative time ("just now", "5m ago", "3d ago").
 * Clamps negative deltas (future dates from clock skew) to "just now".
 */
export function formatRelative(iso: string): string {
	const diff = Math.max(0, Date.now() - new Date(iso).getTime());
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Returns uppercase initials from a display name (first letter of each word).
 * Empty/whitespace input yields an empty string rather than crashing.
 */
export function userInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

/**
 * Throws a Response with 400 status if condition is false.
 * Useful for validating request parameters and throwing HTTP errors.
 *
 * @param condition - The condition to check
 * @param message - Error message or function returning message
 * @param responseInit - Additional response options
 * @throws {Response} 400 status response if condition is false
 *
 * @example
 * ```ts
 * invariantResponse(
 *   typeof id === 'string',
 *   'ID must be a string',
 *   { headers: { 'Content-Type': 'application/json' } }
 * );
 * ```
 */
export function invariantResponse(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	condition: any,
	message?: string | (() => string),
	responseInit?: ResponseInit,
): asserts condition {
	if (!condition) {
		throw new Response(
			typeof message === "function"
				? message()
				: message ||
						"An invariant failed, please provide a message to explain why.",
			{ status: StatusCodes.BAD_REQUEST, ...responseInit },
		);
	}
}

/**
 * Throws an Error if condition is false.
 * Similar to invariantResponse but throws Error instead of Response.
 *
 * @param condition - The condition to check
 * @param message - Error message or function returning message
 * @throws {Error} If condition is false
 *
 * @example
 * ```ts
 * invariant(
 *   typeof value === 'string',
 *   'Value must be a string'
 * );
 * ```
 */
export function invariant(
	// biome-ignore lint/suspicious/noExplicitAny: ignore
	condition: any,
	message: string | (() => string),
): asserts condition {
	if (!condition) {
		throw new Error(typeof message === "function" ? message() : message);
	}
}
