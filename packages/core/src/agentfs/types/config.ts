/**
 * Supported memory scope levels for AgentFS memory stores.
 *
 * @public
 */
export type AgentfsMemoryScope = "project" | "user" | "session";

import type { MissingFileBehavior } from "../../core/types/config";

/**
 * Configuration for creating an {@link AgentfsMemoryStore}.
 *
 * @public
 */
export interface AgentfsMemoryStoreConfig {
	/**
	 * The memory scope that determines the storage isolation level.
	 */
	scope: AgentfsMemoryScope;

	/**
	 * Project identifier. Required when scope is `"project"`.
	 */
	projectId?: string | undefined;

	/**
	 * User identifier. Required when scope is `"user"`.
	 */
	userId?: string | undefined;

	/**
	 * Session identifier. Required when scope is `"session"`.
	 */
	sessionId?: string | undefined;

	/**
	 * Remote root prefix. Defaults to `/stores`.
	 */
	rootPrefix?: string | undefined;

	/**
	 * `throw` matches the production MemoFS core store behavior.
	 * `empty` keeps older relaxed behavior for adapters/experiments.
	 */
	missingFileBehavior?: MissingFileBehavior | undefined;

	/**
	 * If true and client.appendText is unavailable, append falls back to read + write.
	 * Same-instance appends are serialized to reduce races.
	 */
	allowReadWriteAppendFallback?: boolean | undefined;

	/**
	 * Prefer native appendText when the AgentFS client provides it.
	 */
	preferNativeAppend?: boolean | undefined;
}

/**
 * Normalized (fully resolved) configuration for an {@link AgentfsMemoryStore}.
 * All optional fields from {@link AgentfsMemoryStoreConfig} are resolved to concrete values.
 *
 * @public
 */
export interface NormalizedAgentfsMemoryStoreConfig {
	/**
	 * The resolved memory scope.
	 */
	scope: AgentfsMemoryScope;

	/**
	 * The fully resolved root path for this store instance.
	 */
	root: string;

	/**
	 * The resolved missing file behavior.
	 */
	missingFileBehavior: MissingFileBehavior;

	/**
	 * Whether read/write fallback for append operations is enabled.
	 */
	allowReadWriteAppendFallback: boolean;

	/**
	 * Whether to prefer native appendText when available on the client.
	 */
	preferNativeAppend: boolean;
}
