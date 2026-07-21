/**
 * Shared HTTP helpers for the built-in connectors (GitHub GraphQL, Notion REST).
 *
 * Built-in connectors that talk to a remote endpoint share two concerns:
 * per-request timeout composition (a stalled endpoint must never hang the run)
 * and abort-error detection. Centralizing them here keeps the two fetch layers
 * in lockstep and gives the constants a single source of truth.
 *
 * @internal
 */

/** Per-request timeout (ms) — a stalled endpoint must not hang the whole run. */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Combine an optional caller signal with a per-request timeout so a stalled
 * endpoint can't hang the run. Returns the composite signal and a cleanup fn
 * the caller MUST invoke in its `finally`.
 *
 * @internal
 * @param signal optional caller abort signal
 * @returns the composite signal and a cleanup function that clears the timeout
 */
export function withRequestTimeout(signal?: AbortSignal): {
	signal: AbortSignal;
	clearTimeout: () => void;
} {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	if (signal !== undefined) {
		if (signal.aborted) controller.abort();
		else
			signal.addEventListener("abort", () => controller.abort(), {
				once: true,
			});
	}
	return {
		signal: controller.signal,
		clearTimeout: () => clearTimeout(timer),
	};
}

/**
 * Whether an error is an abort — `fetch` throws `DOMException "AbortError"`
 * on cancellation. Covers both the name (`AbortError`) and the Node code
 * (`ABORT_ERR`) that the polyfilled/Node fetch emits.
 *
 * @internal
 * @param error the thrown value to test
 * @returns `true` if the error is an abort
 */
export function isAbortError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.name === "AbortError" ||
			(error as NodeJS.ErrnoException)?.code === "ABORT_ERR")
	);
}
