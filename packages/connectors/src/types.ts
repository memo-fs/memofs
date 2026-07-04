/**
 * Provider-neutral connector framework types.
 *
 * Connectors ingest external sources (GitHub, Notion, …) into `.tekmemo/`
 * through the local engine. Each source is a plugin implementing {@link Connector}.
 * This mirrors the embedder/extractor adapter pattern used across TekMemo:
 * adding a connector = writing a new adapter, not refactoring the framework
 * (decision Q10 /).
 *
 * @public
 */

import type { JsonObject, Tekmemo } from "@tekmemo/core";

/**
 * A single connector row in `.tekmemo/connectors.json`.
 *
 * Locked schema (decision Q7): `{ id, type, enabled, schedule, sourceMapping,
 * secretRef }`. The `secretRef` is an opaque pointer to a token stored
 * server-side — **never** the token itself (tokens never ride in the file
 * replica;).
 *
 * @public
 */
export interface ConnectorConfig {
	/** Stable id for this connector instance within the project (e.g. `"github-main"`). */
	readonly id: string;
	/** Connector type — matches a registered {@link Connector.type} (e.g. `"github"`). */
	readonly type: string;
	/** Whether the runner should include this connector. */
	readonly enabled: boolean;
	/**
	 * Optional schedule hint (cron-ish). Stored but not enforced in v1 — execution
	 * happens only while the local runtime is alive (decision Q2).
	 */
	readonly schedule?: string;
	/**
	 * Source-specific configuration opaque to the framework (e.g.
	 * `{ repository: "owner/repo" }` for GitHub). Forwarded verbatim to the
	 * connector's {@link Connector.ingest} call.
	 */
	readonly sourceMapping?: JsonObject;
	/**
	 * Opaque pointer to a credential resolved at run time via a
	 * {@link SecretResolver}. **Never** the token. (e.g. `"ss_abc123"`.)
	 */
	readonly secretRef: string;
}

/**
 * The on-disk shape of `.tekmemo/connectors.json` (the 11th canonical sync unit).
 *
 * @public
 */
export interface ConnectorsFile {
	readonly connectors: readonly ConnectorConfig[];
}

/**
 * A normalized external item before it becomes a TekMemo note. The connector
 * produces these; the runner handles dedup + the write discipline.
 *
 * @public
 */
export interface ConnectorRecord {
	/**
	 * Stable external id (e.g. `"issue:42"`). Used as the dedup key
	 * (`sourceRefs[0].sourceId`) and as input to the content-derived note id.
	 * Must be stable across re-ingest of the same external item.
	 */
	readonly externalId: string;
	/** One-line title for the note. */
	readonly title: string;
	/** Full body of the note (markdown). */
	readonly content: string;
	/** HTTP(S) URL for external provenance, if available. */
	readonly url?: string;
	/** ISO timestamp of when the item occurred in the source (createdAt, etc). */
	readonly occurredAt?: string;
	/** Structured metadata forwarded into the note's `sourceRefs[0].metadata`. */
	readonly metadata?: JsonObject;
}

/**
 * Handed to {@link Connector.ingest} on each run.
 *
 * @public
 */
export interface ConnectorIngestContext {
	/** The connector config row being run. */
	readonly config: ConnectorConfig;
	/**
	 * Resolved credential — in-memory only, never written to disk. The framework
	 * never logs this value.
	 */
	readonly token: string;
	/**
	 * The host's Tekmemo instance. Single-writer contract (AGENTS.md): the
	 * connector must not construct its own `Tekmemo` on this root.
	 */
	readonly memo: Tekmemo;
	/** Optional abort signal propagated from {@link RunConnectorsOptions.signal}. */
	readonly signal?: AbortSignal;
}

/**
 * A recoverable per-item or per-page error surfaced from a connector run. The
 * runner records these and continues — a single error never aborts the whole run.
 *
 * @public
 */
export interface ConnectorIngestError {
	/** Connector `type` that produced the error. */
	readonly connectorType: string;
	/** Human-readable message. */
	readonly message: string;
	/** The external id the error pertains to, if any. */
	readonly externalId?: string;
	/** Original error, if any (not serialized across process boundaries). */
	readonly cause?: unknown;
}

/**
 * Result of a single connector's ingest, as returned by the connector or
 * aggregated by the runner.
 *
 * @public
 */
export interface ConnectorIngestResult {
	/** Note ids written this run. */
	readonly written: readonly string[];
	/** External ids already ingested on a prior run (dedup skips). */
	readonly skipped: readonly string[];
	/** Recoverable errors encountered during the run. */
	readonly errors: readonly ConnectorIngestError[];
}

/**
 * Provider-neutral connector interface. One implementation per external source.
 *
 * @public
 */
export interface Connector {
	/** Matches {@link ConnectorConfig.type}. */
	readonly type: string;
	/** Human-readable name for logs/errors. */
	readonly displayName: string;
	/**
	 * Fetch + normalize external items into {@link ConnectorRecord}s.
	 *
	 * The connector does **not** write notes itself — the runner handles the
	 * connector-write discipline (decision Q3 /): `source: "connector"`,
	 * stable `sourceRefs[0].sourceId`, content-derived `id` with no wall-clock.
	 * Returning records (rather than writing) keeps the discipline in one place
	 * and makes connectors trivial to test.
	 *
	 * @returns the records to consider for ingestion this run. The runner
	 * dedupes by `externalId` against already-ingested notes and writes the rest.
	 */
	ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]>;
}
