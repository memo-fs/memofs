/**
 * Shared "is this a not-found error?" classifier.
 *
 * @remarks
 * Single source of truth for detecting ENOENT / 404 / NOT_FOUND conditions
 * across both Node filesystem errors and remote/AgentFS protocol errors.
 * The broad classifier lives here so both `fs/` (Node) and `agentfs/`
 * (remote) consume one definition instead of re-declaring it with subtly
 * different behavior.
 *
 * @internal
 */

/**
 * Determines if an error represents a "not found" condition.
 *
 * @remarks
 * Checks common error properties (`code`, `status`, `statusCode`, `name`,
 * `message`) for not-found indicators such as `ENOENT`, `404`, or
 * `NOT_FOUND`. This covers Node filesystem errors (`code === "ENOENT"`),
 * HTTP responses (`status === 404`), and remote client protocol errors.
 *
 * @param error - The error to check.
 * @returns `true` if the error indicates a not-found condition.
 *
 * @internal
 */
export function isNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}

	const candidate = error as {
		code?: unknown;
		status?: unknown;
		statusCode?: unknown;
		name?: unknown;
		message?: unknown;
	};

	const code = String(candidate.code ?? "").toUpperCase();
	const name = String(candidate.name ?? "").toUpperCase();
	const message = String(candidate.message ?? "").toUpperCase();
	const status = Number(candidate.status ?? candidate.statusCode ?? 0);

	return (
		status === 404 ||
		code === "ENOENT" ||
		code === "NOT_FOUND" ||
		code === "404" ||
		name.includes("NOTFOUND") ||
		message.includes("NOT FOUND") ||
		message.includes("ENOENT")
	);
}
