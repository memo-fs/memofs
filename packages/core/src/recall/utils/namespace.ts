/**
 * @file Namespace utility functions for the recall package.
 *
 * @remarks
 * Provides utilities for creating and normalizing namespaces used to scope
 * recall documents and operations.
 *
 * @public
 */

import { assertNamespace, assertSafeId } from "../validation/assertions";

/**
 * Creates a namespace string for a project.
 *
 * @remarks
 * The namespace format is: "prefix/tenantId/projectId" or "prefix/projectId"
 * if tenantId is not provided. Default prefix is "project".
 *
 * @param input - Object containing tenantId (optional), projectId, and prefix (optional)
 * @returns A normalized namespace string
 * @throws {RecallValidationError} If projectId, tenantId, or prefix are invalid
 *
 * @public
 */
export function createProjectNamespace(input: {
	tenantId?: string;
	projectId: string;
	prefix?: string;
}): string {
	assertSafeId(input.projectId, "projectId");
	if (input.tenantId !== undefined) assertSafeId(input.tenantId, "tenantId");
	if (input.prefix !== undefined) assertNamespace(input.prefix, "prefix");

	const parts = [input.prefix ?? "project"];
	if (input.tenantId !== undefined) parts.push(input.tenantId);
	parts.push(input.projectId);
	const namespace = parts.join("/");
	assertNamespace(namespace);
	return namespace;
}

/**
 * Normalizes a namespace value, using a fallback if undefined.
 *
 * @remarks
 * If the namespace is undefined, the fallback value is used.
 * The result is validated to ensure it's safe.
 *
 * @param namespace - The namespace value (may be undefined)
 * @param fallback - Fallback value to use if namespace is undefined (defaults to "default")
 * @returns A validated, normalized namespace string
 * @throws {RecallValidationError} If the namespace or fallback is invalid
 *
 * @public
 */
export function normalizeNamespace(
	namespace: string | undefined,
	fallback = "default",
): string {
	const value = namespace ?? fallback;
	assertNamespace(value);
	return value;
}
