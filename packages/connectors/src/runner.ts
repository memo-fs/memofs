/**
 * The connector runner — orchestrates a single connector run.
 *
 * Flow ( / decisions Q1–Q3):
 * 1. Read `.memofs/connectors.json`, select enabled connectors.
 * 2. For each: resolve the token via the injected {@link SecretResolver}
 * (in-memory only — never written to disk, never logged).
 * 3. Look up the {@link Connector} by `type`; call `ingest()` to get records.
 * 4. Dedupe by `externalId` against already-ingested connector notes.
 * 5. Write new records through the host's `MemoFS` instance with the Q3
 * connector-write discipline (`source: "connector"`, stable
 * `sourceRefs[0].sourceId`, content-derived `id` with no wall-clock).
 * 6. Aggregate `{ written, skipped, errors }`. A single connector error never
 * aborts the whole run — it's recorded and the next connector proceeds.
 *
 * @public
 */

import type { JsonObject, MemoFS, SourceRef } from "@memofs/core";
import { readMemoryEvents } from "@memofs/core";
import { readConnectorsFile, selectConnectors } from "./config";
import { connectorNoteId } from "./id";
import {
	type ConnectorRegistry,
	createConnectorRegistry,
	getConnector,
} from "./registry";
import type { SecretResolver } from "./secret-resolver";
import type {
	Connector,
	ConnectorConfig,
	ConnectorIngestContext,
	ConnectorIngestError,
	ConnectorRecord,
} from "./types";

/**
 * Options for {@link runConnectors}.
 *
 * @public
 */
export interface RunConnectorsOptions {
	/** The `.memofs/` parent directory (same rootDir passed to MemoFS). */
	readonly rootDir: string;
	/**
	 * The host's MemoFS instance. The runner never constructs its own — the
	 * `.memofs/` root is single-writer (AGENTS.md, decision Q28).
	 */
	readonly memo: MemoFS;
	/** Resolves `secretRef` → token at run time. Tokens never touch disk. */
	readonly secretResolver: SecretResolver;
	/** Connector registry. Defaults to the built-ins (GitHub). */
	readonly connectorRegistry?: ConnectorRegistry;
	/** Run only connectors of this `type`. */
	readonly onlyType?: string;
	/** Abort signal propagated to connectors. */
	readonly signal?: AbortSignal;
}

/**
 * Aggregated result of a connector run.
 *
 * @public
 */
export interface RunConnectorsResult {
	/** Note ids written this run, across all connectors. */
	readonly written: readonly string[];
	/** External ids already ingested (dedup skips), across all connectors. */
	readonly skipped: readonly string[];
	/** Recoverable errors, across all connectors. */
	readonly errors: readonly ConnectorIngestError[];
	/** Connector `id`s that ran. */
	readonly ran: readonly string[];
}

/**
 * Run all enabled connectors configured in `.memofs/connectors.json`.
 *
 * @public
 */
export async function runConnectors(
	opts: RunConnectorsOptions,
): Promise<RunConnectorsResult> {
	const registry = opts.connectorRegistry ?? createConnectorRegistry();
	const file = await readConnectorsFile(opts.rootDir);
	const selected = selectConnectors(file, {
		...(opts.onlyType === undefined ? {} : { type: opts.onlyType }),
	});

	const written: string[] = [];
	const skipped: string[] = [];
	const errors: ConnectorIngestError[] = [];
	const ran: string[] = [];

	// Load already-written note ids once for dedup across the run. The
	// connector note id is content-derived, so identical external content
	// reproduces the same id → skip on re-run.
	const existingNoteIds = await loadExistingNoteIds(opts.memo);

	for (const config of selected) {
		ran.push(config.id);
		try {
			const result = await runOne(config, opts, registry, existingNoteIds);
			written.push(...result.written);
			skipped.push(...result.skipped);
			errors.push(...result.errors);
		} catch (error) {
			// A connector throwing synchronously (e.g. unregistered type, secret
			// failure) is recorded — the run continues with the next connector.
			errors.push(toIngestError(config.type, error));
		}
	}

	return { written, skipped, errors, ran };
}

/** Run a single connector: resolve secret → ingest → dedupe → write. */
async function runOne(
	config: ConnectorConfig,
	opts: RunConnectorsOptions,
	registry: ConnectorRegistry,
	existingNoteIds: Set<string>,
): Promise<{
	written: string[];
	skipped: string[];
	errors: ConnectorIngestError[];
}> {
	const connector: Connector = getConnector(registry, config.type);

	// Resolve the token — in-memory only, never logged.
	const token = await opts.secretResolver.resolve(config.secretRef);

	const ctx: ConnectorIngestContext = {
		config,
		token,
		memo: opts.memo,
		...(opts.signal === undefined ? {} : { signal: opts.signal }),
	};

	const records = await connector.ingest(ctx);

	const written: string[] = [];
	const skipped: string[] = [];
	const errors: ConnectorIngestError[] = [];

	for (const record of records) {
		// Dedup by the deterministic note id (content-derived, no wall-clock).
		// Same externalId + same content → same id → skip. Changed content → a
		// new id → write (the underlying fact genuinely changed). This works
		// identically across all store strategies because the id is on the note.
		const noteId = connectorNoteId(record);
		if (existingNoteIds.has(noteId)) {
			skipped.push(record.externalId);
			continue;
		}
		try {
			await writeConnectorRecord(record, noteId, opts);
			written.push(noteId);
			existingNoteIds.add(noteId); // dedupe within this run too
		} catch (error) {
			errors.push({
				connectorType: config.type,
				message: toErrorMessage(error),
				...(record.externalId === undefined
					? {}
					: { externalId: record.externalId }),
				cause: error,
			});
		}
	}

	return { written, skipped, errors };
}

/**
 * Write one connector record through the host's MemoFS instance with the Q3
 * connector-write discipline. The note id is precomputed by the caller (so the
 * dedup check and the write agree on the same id).
 */
async function writeConnectorRecord(
	record: ConnectorRecord,
	id: string,
	opts: RunConnectorsOptions,
): Promise<void> {
	const sourceRef: SourceRef = {
		sourceType: "connector",
		sourceId: record.externalId,
		...(record.title === undefined ? {} : { title: record.title }),
		...(record.url === undefined ? {} : { url: record.url }),
		...(record.metadata === undefined ? {} : { metadata: record.metadata }),
	};

	const metadata: JsonObject = {
		source: "connector",
		...(record.occurredAt === undefined
			? {}
			: { occurredAt: record.occurredAt }),
		...(record.metadata ?? {}),
	};

	await opts.memo.writeMemory(
		{
			id,
			content: record.content,
			...(record.title === undefined ? {} : { title: record.title }),
			kind: "note",
			source: "connector",
			sourceRefs: [sourceRef],
			metadata,
		},
		opts.signal,
	);
}

/**
 * Load the set of already-written connector note ids so re-runs skip unchanged
 * content. The connector note id is content-derived (no wall-clock), so an
 * identical external item reproduces the same id → skip.
 *
 * Scans the full `memory-events.jsonl` (via {@link readMemoryEvents}) for the
 * note `id` recorded on each `memory.created` event, rather than
 * `listRecentMemories` — which caps at the N most recent events and would let
 * older connector notes fall out of the dedup window (producing duplicate
 * writes once a project accumulates more than that many memories). Falling
 * back to `listRecentMemories` keeps this working on hosts whose store does
 * not expose the events log directly (e.g. a minimal in-memory fake).
 */
async function loadExistingNoteIds(memo: MemoFS): Promise<Set<string>> {
	const ids = new Set<string>();

	// Primary path: the complete events log. The note id lands at
	// `event.metadata.id` for every write (see local-strategy.writeMemory).
	// Collecting every id here — not only `conn_` ones — is harmless: agent
	// `mem_` ids never collide with content-derived `conn_` ids.
	try {
		const events = await readMemoryEvents(memo.store, {
			malformedLineMode: "skip",
		});
		for (const event of events) {
			const noteId = (event.metadata as Record<string, unknown> | undefined)
				?.id;
			if (typeof noteId === "string" && noteId.length > 0) {
				ids.add(noteId);
			}
		}
		if (ids.size > 0) return ids;
	} catch {
		// Events log unavailable (missing file, store without `.read`) — fall
		// through to the recent-memory scan so dedup still works.
	}

	// Fallback: recent memory items. Bounded to the window the host returns, so
	// it under-counts on large projects, but preserves behavior on hosts that
	// don't expose the events log.
	const recent = await memo.listRecentMemories({ limit: 500 });
	for (const item of recent.items) {
		if (typeof item.id === "string" && item.id.length > 0) {
			ids.add(item.id);
		}
		const metaNoteId = (item.metadata as Record<string, unknown> | undefined)
			?.id;
		if (typeof metaNoteId === "string" && metaNoteId.length > 0) {
			ids.add(metaNoteId);
		}
	}
	return ids;
}

function toIngestError(
	connectorType: string,
	error: unknown,
): ConnectorIngestError {
	return {
		connectorType,
		message: toErrorMessage(error),
		cause: error,
	};
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
