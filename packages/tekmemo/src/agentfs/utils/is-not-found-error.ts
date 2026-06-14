/**
 * Determines if an error represents a "not found" condition.
 *
 * @remarks
 * Checks various error properties (`code`, `status`, `statusCode`, `name`, `message`)
 * for common not-found indicators like `ENOENT`, `404`, or `"NOT FOUND"`.
 *
 * @param error - The error to check.
 * @returns `true` if the error indicates a not-found condition, `false` otherwise.
 *
 * @public
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
