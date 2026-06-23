/**
 * @file Filesystem-backed recall store with JSONL persistence.
 *
 * @remarks
 * Wraps the in-memory recall store so that embeddings survive process
 * restarts, staying true to TekMemo's file-first identity. On construction
 * the store rehydrates from `.tekmemo/indexes/embeddings.jsonl` (one document
 * per line) into the volatile index; every `upsert`/`delete`/`deleteBySource`
 * is mirrored to the same file as a full rewrite.
 *
 * A full rewrite (rather than append) keeps the file in sync with deletions
 * and re-indexing without a compaction pass — fine for local scale (low
 * thousands of chunks). At larger scale, swap in a real vector DB via the
 * {@link RecallStore} interface.
 *
 * @public
 */

import { EMBEDDINGS_INDEX_PATH } from "../../core/constants/memory-paths";
import { MemoryNotFoundError } from "../../core/errors/errors";
import type { MemoryStore } from "../../core/types/memory-store";
import { stringifyJsonlEntry } from "../../core/validation/jsonl";
import type {
	DeleteBySourceInput,
	RecallDocument,
	RecallQuery,
	RecallResult,
	RecallStore,
} from "../types";
import { InMemoryRecallStore } from "./in-memory-recall-store";

export interface FsRecallStoreOptions {
	/** Memory store used for file I/O (typically NodeFsMemoryStore). */
	store: MemoryStore;
	/** Backing in-memory index. A fresh one is created when omitted. */
	inner?: InMemoryRecallStore;
	/**
	 * Canonical path to the embeddings JSONL file.
	 * @defaultValue {@link EMBEDDINGS_INDEX_PATH}
	 */
	path?: typeof EMBEDDINGS_INDEX_PATH;
	/** Optional clock for deterministic tests. */
	now?: () => string;
}

interface PersistedRecord {
	id: string;
	text: string;
	embedding: number[];
	metadata: Record<string, unknown>;
	namespace: string;
}

/**
 * Coerce a persisted metadata blob into a valid {@link RecallMetadata} by
 * backfilling the required fields with safe defaults. Older index files may
 * be missing fields added after they were written.
 */
function normalizePersistedMetadata(
	value: Record<string, unknown> | undefined,
): RecallDocument["metadata"] {
	const source = value ?? {};
	return {
		projectId:
			typeof source.projectId === "string" ? source.projectId : "default",
		sourceType:
			typeof source.sourceType === "string" ? source.sourceType : "document",
		sourceId: typeof source.sourceId === "string" ? source.sourceId : "unknown",
		memoryType:
			typeof source.memoryType === "string" ? source.memoryType : "notes",
		...(source.sectionName === undefined
			? {}
			: { sectionName: source.sectionName as string }),
		...(source.sourcePath === undefined
			? {}
			: { sourcePath: source.sourcePath as string }),
		...(source.chunkHash === undefined
			? {}
			: { chunkHash: source.chunkHash as string }),
		...(source.sourceHash === undefined
			? {}
			: { sourceHash: source.sourceHash as string }),
		...(source.createdAt === undefined
			? {}
			: { createdAt: source.createdAt as string }),
		...(source.updatedAt === undefined
			? {}
			: { updatedAt: source.updatedAt as string }),
		...Object.fromEntries(
			Object.entries(source).filter(
				([key]) =>
					![
						"projectId",
						"sourceType",
						"sourceId",
						"memoryType",
						"sectionName",
						"sourcePath",
						"chunkHash",
						"sourceHash",
						"createdAt",
						"updatedAt",
					].includes(key),
			),
		),
	} as RecallDocument["metadata"];
}

/**
 * A recall store that persists embeddings to JSONL on disk.
 *
 * @public
 */
export class FsRecallStore implements RecallStore {
	private readonly store: MemoryStore;
	private readonly inner: InMemoryRecallStore;
	private readonly path: typeof EMBEDDINGS_INDEX_PATH;
	private readonly now: () => string;
	private hydrated = false;

	constructor(options: FsRecallStoreOptions) {
		this.store = options.store;
		// `last-write-wins` is essential here: chunk ids are content-addressed
		// and re-indexing (or re-hydrating) the same id must replace, not throw.
		this.inner =
			options.inner ??
			new InMemoryRecallStore({
				duplicateDocumentIdBehavior: "last-write-wins",
			});
		this.path = options.path ?? EMBEDDINGS_INDEX_PATH;
		this.now = options.now ?? (() => new Date().toISOString());
	}

	/**
	 * Load any persisted embeddings from disk into the in-memory index.
	 * Safe to call multiple times; only the first call performs the load.
	 */
	async hydrate(): Promise<void> {
		if (this.hydrated) return;
		this.hydrated = true;
		let content: string;
		try {
			content = await this.store.read(this.path);
		} catch (error) {
			if (error instanceof MemoryNotFoundError) return;
			throw error;
		}
		const lines = content.split(/\r?\n/);
		const documents: RecallDocument[] = [];
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				const record = JSON.parse(trimmed) as PersistedRecord;
				if (
					typeof record.id === "string" &&
					typeof record.text === "string" &&
					Array.isArray(record.embedding)
				) {
					documents.push({
						id: record.id,
						text: record.text,
						embedding: record.embedding,
						metadata: normalizePersistedMetadata(record.metadata),
						...(record.namespace === undefined
							? {}
							: { namespace: record.namespace }),
					});
				}
			} catch {
				// Skip malformed lines rather than failing boot.
			}
		}
		if (documents.length > 0) {
			await this.inner.upsert(documents);
		}
	}

	async upsert(documents: RecallDocument[]): Promise<void> {
		await this.inner.upsert(documents);
		await this.persist();
	}

	async query(query: RecallQuery): Promise<RecallResult[]> {
		await this.hydrate();
		return this.inner.query(query);
	}

	async delete(ids: string[], options?: { namespace?: string }): Promise<void> {
		await this.inner.delete(ids, options);
		await this.persist();
	}

	async deleteBySource(input: DeleteBySourceInput): Promise<void> {
		await this.inner.deleteBySource(input);
		await this.persist();
	}

	/**
	 * Returns the count of documents currently indexed in memory.
	 */
	async count(namespace?: string): Promise<number> {
		await this.hydrate();
		return this.inner.count(namespace);
	}

	/**
	 * Expose the backing in-memory store for direct re-indexing paths that
	 * bypass per-call persistence (the caller is responsible for calling
	 * `persist()` once at the end of a batch).
	 *
	 * @internal
	 */
	get innerStore(): InMemoryRecallStore {
		return this.inner;
	}

	/**
	 * Rewrite the JSONL file from the current in-memory snapshot.
	 */
	async persist(): Promise<void> {
		const snapshot = this.inner.snapshot();
		if (snapshot.length === 0) {
			await this.store.write(this.path, "");
			return;
		}
		const serialized = snapshot
			.map((doc) =>
				stringifyJsonlEntry({
					id: doc.id,
					text: doc.text,
					embedding: doc.embedding,
					metadata: doc.metadata as Record<string, unknown>,
					namespace: doc.namespace,
					updatedAt: this.now(),
				}),
			)
			.join("");
		await this.store.write(this.path, serialized);
	}
}

/**
 * Factory for {@link FsRecallStore}.
 *
 * @public
 * @param options - Store options.
 * @returns A new FsRecallStore (not yet hydrated).
 */
export function createFsRecallStore(
	options: FsRecallStoreOptions,
): FsRecallStore {
	return new FsRecallStore(options);
}
