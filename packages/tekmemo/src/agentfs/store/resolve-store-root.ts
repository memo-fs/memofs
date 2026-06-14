import { AgentfsConfigError } from "../errors/agentfs-error";
import type {
	AgentfsMemoryScope,
	AgentfsMemoryStoreConfig,
	NormalizedAgentfsMemoryStoreConfig,
} from "../types/config";
import { normalizeRootPrefix } from "../utils/normalize-root-prefix";
import { validateSafeSegment } from "../utils/validate-safe-segment";

/**
 * Resolves the scope and ID from the store config based on the configured scope type.
 *
 * @param config - The store configuration.
 * @returns An object containing the resolved scope and ID.
 * @throws {@link AgentfsConfigError} If the scope is unsupported or the required ID is missing/invalid.
 *
 * @internal
 */
function resolveScopeSegment(config: AgentfsMemoryStoreConfig): {
	scope: AgentfsMemoryScope;
	id: string;
} {
	switch (config.scope) {
		case "project":
			return {
				scope: "project",
				id: validateSafeSegment(config.projectId, "projectId"),
			};
		case "user":
			return {
				scope: "user",
				id: validateSafeSegment(config.userId, "userId"),
			};
		case "session":
			return {
				scope: "session",
				id: validateSafeSegment(config.sessionId, "sessionId"),
			};
		default:
			throw new AgentfsConfigError("Unsupported AgentFS memory scope.", {
				scope: (config as { scope?: unknown }).scope ?? "unknown",
				supported: ["project", "user", "session"],
			});
	}
}

/**
 * Resolves the root path string from a store configuration.
 *
 * @param config - The store configuration.
 * @returns The resolved root path string.
 *
 * @public
 */
export function resolveStoreRoot(config: AgentfsMemoryStoreConfig): string {
	const normalized = normalizeAgentfsMemoryStoreConfig(config);
	return normalized.root;
}

/**
 * Normalizes an {@link AgentfsMemoryStoreConfig} into a fully-resolved
 * {@link NormalizedAgentfsMemoryStoreConfig}.
 *
 * @param config - The store configuration to normalize.
 * @returns The normalized configuration with all defaults applied.
 * @throws {@link AgentfsConfigError} If the config is invalid or missing required fields.
 *
 * @public
 */
export function normalizeAgentfsMemoryStoreConfig(
	config: AgentfsMemoryStoreConfig,
): NormalizedAgentfsMemoryStoreConfig {
	if (!config || typeof config !== "object") {
		throw new AgentfsConfigError(
			"AgentFS memory store config must be an object.",
		);
	}

	const rootPrefix = normalizeRootPrefix(config.rootPrefix);
	const { scope, id } = resolveScopeSegment(config);
	const root =
		rootPrefix === "/" ? `/${scope}/${id}` : `${rootPrefix}/${scope}/${id}`;

	const missingFileBehavior = config.missingFileBehavior ?? "throw";
	if (missingFileBehavior !== "throw" && missingFileBehavior !== "empty") {
		throw new AgentfsConfigError("Unsupported missingFileBehavior.", {
			missingFileBehavior,
			supported: ["throw", "empty"],
		});
	}

	return {
		scope,
		root,
		missingFileBehavior,
		allowReadWriteAppendFallback: config.allowReadWriteAppendFallback ?? true,
		preferNativeAppend: config.preferNativeAppend ?? true,
	};
}
