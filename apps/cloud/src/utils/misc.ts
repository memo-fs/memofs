import { StatusCodes } from "http-status-codes";
import { env } from "./env.server";
/**
 * Formats duration taking seconds to human readable form
 */
export function formatDuration(totalSeconds: number): string {
	const ONE_MINUTE = 60;
	const ONE_HOUR_IN_SECONDS = 3600;
	if (totalSeconds < ONE_MINUTE) return `${totalSeconds}s`;
	if (totalSeconds < ONE_HOUR_IN_SECONDS)
		return `${Math.round(totalSeconds / ONE_MINUTE)}m`;
	return `${(totalSeconds / ONE_MINUTE).toFixed(1)}h`;
}

/**
 * Formats file size to human readable string
 */
export function formatFileSize(bytes: number): string {
	const ONE_MB = 1024;
	if (bytes < ONE_MB) return `${bytes} B`;
	if (bytes < ONE_MB * ONE_MB) return `${(bytes / ONE_MB).toFixed(1)} KB`;
	return `${(bytes / (ONE_MB * ONE_MB)).toFixed(1)} MB`;
}

/**
 * Extracts a readable error message from various error types.
 * Handles string errors, Error objects, and unknown error types.
 *
 * @param error - The error to extract message from
 * @returns A string containing the error message
 * @throws Will log to console if error type is unknown
 *
 * @example
 * ```ts
 * const error = new Error("Something went wrong");
 * const message = getErrorMessage(error); // "Something went wrong"
 *
 * const stringError = "Invalid input";
 * const message2 = getErrorMessage(stringError); // "Invalid input"
 * ```
 */
export function getErrorMessage(error: unknown) {
	if (typeof error === "string") return error;
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}
	console.error("Unable to get error message for error", error);
	return "Unknown Error";
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
	// biome-ignore lint/suspicious/noExplicitAny: allow any
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
	// biome-ignore lint/suspicious/noExplicitAny: allow any
	condition: any,
	message: string | (() => string),
): asserts condition {
	if (!condition) {
		throw new Error(typeof message === "function" ? message() : message);
	}
}

/**
 * Combines multiple Headers objects into a single Headers instance.
 * Useful for merging headers from different sources.
 *
 * @param headers - Array of Headers objects to combine
 * @returns Combined Headers object
 *
 * @example
 * ```ts
 * const headers = combineHeaders(
 *   new Headers({ 'Content-Type': 'application/json' }),
 *   new Headers({ 'Authorization': 'Bearer token' })
 * );
 * ```
 */
export function combineHeaders(
	...headers: Array<ResponseInit["headers"] | null>
) {
	const combined = new Headers();
	for (const header of headers) {
		if (!header) continue;
		for (const [key, value] of new Headers(header).entries()) {
			combined.append(key, value);
		}
	}
	return combined;
}

/**
 * Combines multiple ResponseInit objects into a single configuration.
 * Merges headers and other response options.
 *
 * @param responseInits - Array of ResponseInit objects to combine
 * @returns Combined ResponseInit object
 *
 * @example
 * ```ts
 * const responseInit = combineResponseInits(
 *   { status: 200 },
 *   { headers: { 'Content-Type': 'application/json' } }
 * );
 * ```
 */
export function combineResponseInits(
	...responseInits: Array<ResponseInit | undefined>
) {
	let combined: ResponseInit = {};
	for (const responseInit of responseInits) {
		combined = {
			...responseInit,
			headers: combineHeaders(combined.headers, responseInit?.headers),
		};
	}
	return combined;
}

/**
 * Extracts the domain URL from a Request object.
 * Handles both development and production environments.
 * Returns a fallback URL during prerendering when headers are unavailable.
 *
 * @param request - Request object to extract domain from
 * @returns Full domain URL including protocol
 *
 * @example
 * ```ts
 * const domainUrl = getDomainUrl(request);
 * // Returns "https://example.com" or "http://localhost:3000"
 * ```
 */
export function getDomainUrl(request: Request) {
	const host =
		request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

	// During prerendering at build time, headers may not be available
	// Return a sensible default that won't break the build
	if (!host) {
		// Check if we're in production build
		const MODE = env.NODE_ENV;
		return MODE === "production"
			? "https://tekbreed.com"
			: "http://localhost:5173";
	}

	const protocol =
		host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
	return `${protocol}://${host}`;
}

/**
 * Extracts the referrer route from a Request object.
 * Returns the path portion of the referrer URL if it matches the current domain.
 *
 * @param request - Request object to extract referrer from
 * @returns Referrer route path or "/" if referrer is from different domain
 *
 * @example
 * ```ts
 * const referrerRoute = getReferrerRoute(request);
 * // Returns "/dashboard" or "/" if referrer is from different domain
 * ```
 */
export function getReferrerRoute(request: Request) {
	// spelling errors and whatever makes this annoyingly inconsistent
	// in my own testing, `referer` returned the right value, but 🤷‍♂️
	const referrer =
		request.headers.get("referer") ??
		request.headers.get("referrer") ??
		request.referrer;
	const domain = getDomainUrl(request);
	if (referrer?.startsWith(domain)) {
		return referrer.slice(domain.length);
	} else {
		return "/";
	}
}

const DEFAULT_REDIRECT = "/";

/**
 * Safe redirect function that allows cross-domain redirects to TekBreed subdomains.
 * Validates that the redirect URL is either a relative path or a TekBreed domain.
 *
 * @param to - The URL to redirect to
 * @param defaultRedirect - Fallback URL if redirect is invalid
 * @returns Safe redirect URL
 *
 * @example
 * ```ts
 * // Same-origin relative redirect
 * safeRedirectSSO("/dashboard") // => "/dashboard"
 *
 * // Cross-origin TekBreed subdomain (allowed)
 * safeRedirectSSO("https://lms.tekbreed.com/courses") // => "https://lms.tekbreed.com/courses"
 *
 * // External domain (blocked)
 * safeRedirectSSO("https://evil.com") // => "/"
 *
 * // Localhost in development (allowed)
 * safeRedirectSSO("http://localhost:5174/dashboard") // => "http://localhost:5174/dashboard"
 * ```
 */
export function safeRedirectSSO(
	to: FormDataEntryValue | string | null | undefined,
	defaultRedirect: string = DEFAULT_REDIRECT,
): string {
	if (!to || typeof to !== "string") {
		return defaultRedirect;
	}

	// Handle relative paths (same domain)
	if (to.startsWith("/") && !to.startsWith("//")) {
		return to;
	}

	try {
		const url = new URL(to);

		// Allow localhost for development
		if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
			return to;
		}

		// Allow *.tekbreed.com domains
		if (
			url.hostname.endsWith(".tekbreed.com") ||
			url.hostname === "tekbreed.com"
		) {
			return to;
		}

		// Block all other external domains
		return defaultRedirect;
	} catch {
		// Invalid URL, use default
		return defaultRedirect;
	}
}

/**
 * Generates initials from a person's name.
 * Handles various name formats and edge cases.
 *
 * @param name - The full name to generate initials from
 * @returns A string containing the initials (e.g., "JD" for "John Doe")
 *
 * @example
 * ```ts
 * const initials = getInitials("John Doe"); // "JD"
 * const singleName = getInitials("John"); // "JOHN"
 * const withMiddle = getInitials("John A. Doe"); // "JD"
 * ```
 */
export function getInitials(name: string): string {
	if (!name) return "";

	const parts = name
		.trim()
		.split(/\s+/)
		.filter((word) => !(word.length === 2 && word.endsWith(".")));

	if (!parts.length) return "";

	if (parts.length === 1) {
		return parts[0]?.toUpperCase() ?? "";
	}

	const first = parts[0]?.[0];
	const last = parts[parts.length - 1]?.[0];

	return (first?.toUpperCase() ?? "") + (last?.toUpperCase() ?? "");
}

/**
 * Capitalizes each word in a name string.
 * Handles multiple spaces and preserves existing capitalization patterns.
 *
 * @param name - The name string to capitalize
 * @returns The capitalized name string
 *
 * @example
 * ```ts
 * const name = capitalizeName("john doe"); // "John Doe"
 * const complex = capitalizeName("mary-jane O'connor"); // "Mary-Jane O'Connor"
 * const invalid = capitalizeName({}); // ""
 * ```
 */
export function capitalizeName(name: string): string {
	if (!name || typeof name !== "string") return "";

	const trimmed = name.trim();
	if (!trimmed) return "";

	return trimmed.replace(
		/\b(\w)(\w*)/g,
		(_, first, rest) => first.toUpperCase() + rest.toLowerCase(),
	);
}

/**
 * Generates an array of random alphabetic keys for React skeleton loaders.
 * Avoids Biome's noArrayIndexKey rule while providing stable, unique keys.
 *
 * @param count - Number of skeleton keys to generate
 * @param length - Length of each key string (default: 8)
 * @returns Array of random alphabetic strings
 *
 * @example
 * ```tsx
 * // Generate 6 skeleton keys
 * const keys = generateSkeletonKeys(6);
 * {keys.map((key) => <Skeleton key={key} />)}
 * ```
 */
export function generateSkeletonKeys(count: number, length = 8): string[] {
	return Array.from(
		{ length: count },
		(_, i) =>
			Array.from({ length }, () =>
				String.fromCharCode(97 + Math.floor(Math.random() * 26)),
			).join("") + i,
	);
}
