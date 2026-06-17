import {
	assertNamespace,
	normalizeNamespace,
	RecallValidationError,
} from "@tekbreed/tekmemo";
import { UpstashRecallValidationError } from "../errors/upstash-errors";

/**
 * @file Namespace resolution and validation for Upstash Vector.
 *
 * @remarks
 * Upstash does not natively support namespaces, so this module provides
 * a convention-based approach using hyphen-delimited namespace strings.
 *
 * @internal
 */

/**
 * Configuration for resolving the Upstash namespace.
 *
 * @public
 */
export interface UpstashNamespaceConfig {
	/** Explicit namespace string. If provided, takes precedence over other options. */
	namespace?: string;
	/** Prefix for the namespace (default: "tekmemo"). */
	namespacePrefix?: string;
	/** Environment segment (default: "default"). */
	environment?: string;
	/** Optional tenant ID to include in the namespace. */
	tenantId?: string;
	/** Optional project ID to include in the namespace. */
	projectId?: string;
}

/**
 * Validates and sanitizes a single namespace segment.
 *
 * @param value - The segment value to validate.
 * @param name - The name of the segment (for error reporting).
 * @returns The trimmed, validated segment.
 * @throws {UpstashRecallValidationError} If the segment is empty, unsafe, or has invalid characters.
 *
 * @internal
 */
function safeSegment(value: string, name: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new UpstashRecallValidationError(`${name} must not be empty.`, {
			name,
		});
	}
	if (
		trimmed.includes("..") ||
		trimmed.includes("\\") ||
		trimmed.startsWith("/") ||
		trimmed.endsWith("/")
	) {
		throw new UpstashRecallValidationError(`${name} is unsafe.`, {
			name,
			value,
		});
	}
	if (!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/.test(trimmed)) {
		throw new UpstashRecallValidationError(
			`${name} contains unsupported characters.`,
			{ name, value },
		);
	}
	return trimmed;
}

/**
 * Resolves the Upstash namespace from configuration.
 *
 * @remarks
 * If an explicit namespace is provided, it is used directly.
 * Otherwise, a namespace is constructed from prefix, environment,
 * tenant ID, and project ID segments.
 *
 * @param config - The namespace configuration.
 * @returns The resolved namespace string.
 * @throws {UpstashRecallValidationError} If the namespace is invalid.
 *
 * @public
 */
export function resolveUpstashNamespace(
	config: UpstashNamespaceConfig = {},
): string {
	if (config.namespace !== undefined) {
		assertUpstashNamespace(config.namespace);
		return normalizeNamespace(config.namespace);
	}

	const prefix = safeSegment(
		config.namespacePrefix ?? "tekmemo",
		"namespacePrefix",
	);
	const env = safeSegment(config.environment ?? "default", "environment");
	const parts = [prefix, env];

	if (config.tenantId !== undefined)
		parts.push(safeSegment(config.tenantId, "tenantId"));
	if (config.projectId !== undefined)
		parts.push(safeSegment(config.projectId, "projectId"));

	const namespace = parts.join("-");
	assertUpstashNamespace(namespace);
	return namespace;
}

/**
 * Resolves a namespace for a single request, using an explicit value if
 * provided, or falling back to the store's default namespace.
 *
 * @param input - Object containing the explicit namespace (optional) and fallback.
 * @returns The resolved namespace string.
 * @throws {UpstashRecallValidationError} If the explicit namespace is invalid.
 *
 * @public
 */
export function resolveRequestNamespace(input: {
	explicit?: string;
	fallback: string;
}): string {
	if (input.explicit === undefined) return input.fallback;
	assertUpstashNamespace(input.explicit);
	return normalizeNamespace(input.explicit);
}

/**
 * Asserts that a value is a valid Upstash namespace.
 *
 * @param value - The namespace string to validate.
 * @throws {UpstashRecallValidationError} If the namespace is invalid.
 *
 * @internal
 */
function assertUpstashNamespace(value: string): void {
	try {
		assertNamespace(value, "namespace");
	} catch (error) {
		if (error instanceof RecallValidationError) {
			throw new UpstashRecallValidationError(error.message, error.details);
		}
		throw error;
	}
}
