/**
 * Determines if an error represents a "not found" condition.
 *
 * @remarks
 * Re-exported from `core/internal/is-not-found-error` — the single source of
 * truth shared by the agentfs (remote) and fs (Node) zones. The canonical
 * classifier checks `code`, `status`, `statusCode`, `name`, and `message`
 * for not-found indicators (`ENOENT`, `404`, `NOT_FOUND`).
 *
 * @param error - The error to check.
 * @returns `true` if the error indicates a not-found condition.
 *
 * @public
 */
export { isNotFoundError } from "../../core/internal/is-not-found-error";
