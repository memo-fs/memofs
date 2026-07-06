/**
 * Provider-neutral remote-blob memory store.
 *
 * The runtime's read/write path runs through the {@link MemoryStore} abstraction
 * (`NodeFsMemoryStore` for local OSS). Cloudflare Workers have no Node `fs`, so
 * the *same* `local-strategy` runtime cannot run there unmodified against a
 * POSIX filesystem. This module defines the provider-neutral contract that lets
 * the runtime read/write its canonical `.tekmemo/` files against a remote-blob
 * backend (Cloudflare R2, S3, GCS, …) instead.
 *
 * Two injected interfaces keep the runtime unaware of any specific cloud:
 * - {@link BlobClient} — opaque-keyed get/put/delete of raw bytes.
 * - {@link MetadataStore} — the canonical-file manifest: path → blob id + size
 * + sha256.
 *
 * The concrete implementations live in published adapter packages (mirrors
 * the Embedder/Extractor/Connector interface-in-core + impl-in-adapter seam):
 * `@memofs/adapter-r2` (Cloudflare R2 blobs) + `@memofs/adapter-turso`
 * (Turso/libSQL metadata), decoupled as not a bundled N×M adapter.
 * A future `tekmemo-adapter-s3` / `-gcs` implements the same `BlobClient` and
 * the runtime is unchanged.
 *
 * Content addressing: the blob key IS the sha256 of the content, matching the
 * cloud file replica exactly (sync handler: `r2Key === sha256`). Identical
 * content across paths/projects shares one blob — the runtime is a new
 * reader/writer over the same blobs the replica holds, not a parallel store
 * ( reuse sub-decision).
 *
 * @public
 */

import { assertMemoryPath } from "../core/constants/memory-paths";
import { MemoryNotFoundError } from "../core/errors/errors";
import type { MemoryPath, MemoryStore } from "../core/types/memory-store";
import { assertString } from "../core/validation/assertions";

/**
 * A stored canonical file: its content's sha256, the opaque blob key under which
 * the bytes live in the {@link BlobClient}, and the byte size. `blobKey === sha256`
 * for the content-addressed layout the cloud replica uses; it is kept as a
 * distinct field so a future backend with a non-content-addressed keying scheme
 * still fits the contract.
 *
 * @public
 */
export interface BlobEntry {
	/** 64-char lowercase hex sha256 of the file content. */
	sha256: string;
	/** Opaque blob key the {@link BlobClient} resolves (=== sha256 for R2). */
	blobKey: string;
	/** Content byte length. */
	sizeBytes: number;
}

/**
 * Minimal opaque-blob byte store: get/put/delete by opaque key.
 *
 * Implementations hold no TekMemo knowledge — the key is opaque, the bytes are
 * raw. Streaming-friendly: `put` accepts a `ReadableStream` or a buffer.
 *
 * @public
 */
export interface BlobClient {
	/** Reads a blob's bytes; `null` if the key is absent. */
	get(key: string): Promise<ArrayBuffer | null>;
	/**
	 * Writes a blob, overwriting if the key exists. Accepts a `BufferSource`
	 * (`ArrayBuffer` or any typed-array view) or a byte stream — matches what
	 * remote-blob SDKs (R2 `put`, S3 `Body`) natively accept.
	 */
	put(
		key: string,
		body: BufferSource | ReadableStream<Uint8Array<ArrayBuffer>>,
	): Promise<void>;
	/** Deletes a blob. Idempotent: a missing key resolves without error. */
	delete(key: string): Promise<void>;
}

/**
 * The canonical-file manifest: path → {@link BlobEntry}. The source of truth for
 * which files exist and where their bytes live. A remote-blob backend has no
 * directory listing, so this manifest *is* existence.
 *
 * ## Transactional serialization (ADR 0010 — slice 3)
 *
 * An implementation MAY provide {@link MetadataStore.withTransaction} to
 * serialize mutating ops. When present, {@link RemoteBlobMemoryStore} wraps
 * every `write` / `append` / `delete` inside it so concurrent multi-agent
 * writers to one project cannot interleave (the D6 lost-write hazard). The
 * Turso/libSQL adapter implements it via `BEGIN IMMEDIATE`; in-memory and
 * file-backed test stores omit it (no concurrency → no serialization needed).
 *
 * @public
 */
export interface MetadataStore {
	/** Returns the entry for a canonical path, or `undefined` if absent. */
	getEntry(path: string): Promise<BlobEntry | undefined>;
	/** Upserts a path → entry row (insert-or-replace). */
	upsertEntry(path: string, entry: BlobEntry): Promise<void>;
	/** Removes a manifest row for a path. Idempotent. */
	removeEntry(path: string): Promise<void>;
	/**
	 * Runs `fn` inside a serialized transaction. The `tx` argument is a
	 * transaction-scoped {@link MetadataStore} whose `getEntry` / `upsertEntry`
	 * / `removeEntry` calls are atomic with each other — concurrent callers
	 * queue (e.g. libSQL `BEGIN IMMEDIATE`) so two mutating ops to the same
	 * project cannot interleave.
	 *
	 * When a backend does not support transactions (in-memory, file-backed
	 * test stores), this property is `undefined` and
	 * {@link RemoteBlobMemoryStore} runs the function directly against the
	 * store — correct for single-writer scenarios, the no-op serialization
	 * case.
	 *
	 * @param fn - The work to run inside the transaction. Receives a
	 *   transaction-scoped manifest. R2/blob reads/writes inside `fn` are fine
	 *   — blob ops are content-addressed and idempotent, so they don't need
	 *   2PC; only the manifest read + upsert must be atomic.
	 * @returns whatever `fn` returns (committed).
	 */
	withTransaction?<T>(fn: (tx: MetadataStore) => Promise<T>): Promise<T>;
}

/** Options for constructing a {@link RemoteBlobMemoryStore}. */
export interface RemoteBlobMemoryStoreOptions {
	/** Opaque blob byte store (e.g. `createR2BlobClient(env.BLOBS)`). */
	blobClient: BlobClient;
	/** Canonical-file manifest (e.g. `createTursoMetadataStore(db, projectId)`). */
	metadata: MetadataStore;
	/**
	 * Opaque root key namespacing the store's files for one project/tenant. Not
	 * part of blob keys (those are content-addressed), but available to adapters
	 * that partition metadata by root. Stored for diagnostics + adapter use.
	 */
	rootKey: string;
}

/**
 * A {@link MemoryStore} backed by a remote-blob {@link BlobClient} + a
 * {@link MetadataStore} manifest.
 *
 * Implements the same 5-method surface `local-strategy` already calls, so it
 * slots in as the runtime's `store` with no changes to recall/extraction/
 * consolidation. Reads resolve the path → entry in the manifest, then fetch the
 * bytes; writes content-address the bytes (sha256), `put` them, and upsert the
 * manifest row.
 *
 * @public
 */
export class RemoteBlobMemoryStore implements MemoryStore {
	private readonly blobClient: BlobClient;
	private readonly metadata: MetadataStore;
	private readonly rootKey: string;

	constructor(options: RemoteBlobMemoryStoreOptions) {
		this.blobClient = options.blobClient;
		this.metadata = options.metadata;
		this.rootKey = options.rootKey;
	}

	/** The opaque root key this store is namespaced under. */
	get rootKeyAccessor(): string {
		return this.rootKey;
	}

	async read(path: MemoryPath): Promise<string> {
		assertMemoryPath(path);
		const entry = await this.metadata.getEntry(path);
		if (!entry) {
			throw new MemoryNotFoundError(`Memory file not found: ${path}`, { path });
		}
		const bytes = await this.blobClient.get(entry.blobKey);
		if (bytes === null) {
			// Manifest says the file exists but the blob is gone — a storage-layer
			// integrity break, not a normal "missing file". Surface as not-found so
			// callers (bootstrap, recall) follow the same recovery path.
			throw new MemoryNotFoundError(
				`Memory file blob missing for path: ${path} (blob key: ${entry.blobKey})`,
				{ path, blobKey: entry.blobKey },
			);
		}
		return new TextDecoder().decode(bytes);
	}

	async write(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content");
		const mutate = async (meta: MetadataStore): Promise<void> => {
			const bytes = encodeUtf8(content);
			const sha256 = await hashBytesHex(bytes);
			await this.blobClient.put(sha256, bytes);
			await meta.upsertEntry(path, {
				sha256,
				blobKey: sha256,
				sizeBytes: bytes.byteLength,
			});
		};
		await this.runSerialized(mutate);
	}

	async append(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content");
		if (content.length === 0) return;
		const mutate = async (meta: MetadataStore): Promise<void> => {
			// Remote blobs are immutable + content-addressed, so append is a
			// read-modify-write: fetch the current bytes (empty if absent),
			// concat, write the new blob, upsert the manifest row. The manifest
			// read + upsert MUST be inside the same transaction so two
			// concurrent appends serialize — the second read sees the first
			// commit (ADR 0010, slice 3).
			const existing = await this.safeReadVia(meta, path);
			const merged = existing + content;
			const bytes = encodeUtf8(merged);
			const sha256 = await hashBytesHex(bytes);
			await this.blobClient.put(sha256, bytes);
			await meta.upsertEntry(path, {
				sha256,
				blobKey: sha256,
				sizeBytes: bytes.byteLength,
			});
		};
		await this.runSerialized(mutate);
	}

	async exists(path: MemoryPath): Promise<boolean> {
		assertMemoryPath(path);
		const entry = await this.metadata.getEntry(path);
		return entry !== undefined;
	}

	async delete(path: MemoryPath): Promise<void> {
		assertMemoryPath(path);
		const mutate = async (meta: MetadataStore): Promise<void> => {
			// The blob is content-addressed and may be shared by other
			// paths/projects, so deletion removes only the manifest row — the
			// blob is never inline-GC'd (same policy as the cloud file replica;
			// GC is an operational concern).
			await meta.removeEntry(path);
		};
		await this.runSerialized(mutate);
	}

	/**
	 * Runs a mutating metadata operation, serializing it through
	 * {@link MetadataStore.withTransaction} when the backend supports it
	 * (ADR 0010). When `withTransaction` is absent (in-memory, file-backed test
	 * stores), the function runs directly — correct for single-writer
	 * scenarios with no concurrency.
	 *
	 * R2/blob reads/writes inside `fn` are safe: blob ops are content-addressed
	 * and idempotent, so they don't participate in 2PC; only the manifest
	 * read + upsert must be atomic, and that's what the transaction provides.
	 */
	private async runSerialized(
		fn: (meta: MetadataStore) => Promise<void>,
	): Promise<void> {
		if (typeof this.metadata.withTransaction === "function") {
			await this.metadata.withTransaction(fn);
		} else {
			await fn(this.metadata);
		}
	}

	/**
	 * Reads a path as a string, returning "" when the manifest has no entry.
	 * Used internally by {@link append} via a transaction-scoped metadata
	 * store; not part of the {@link MemoryStore} contract.
	 */
	private async safeReadVia(
		meta: MetadataStore,
		path: MemoryPath,
	): Promise<string> {
		const entry = await meta.getEntry(path);
		if (!entry) return "";
		const bytes = await this.blobClient.get(entry.blobKey);
		return bytes === null ? "" : new TextDecoder().decode(bytes);
	}
}

/**
 * Computes the sha256 hex digest of bytes via Web Crypto (`crypto.subtle`).
 *
 * Cross-runtime: `globalThis.crypto.subtle` is available in both Node 22 (the
 * core `engines.node >= 22` floor) and Cloudflare Workers — so the runtime
 * computes the *same* content identity the cloud file replica uses, without
 * `node:crypto` (keeping the store Worker-loadable unconditionally).
 *
 * Named `hashBytesHex` (not `sha256Hex`) to avoid clashing with the sync-side
 * `sha256Hex(string): string` exported from `./tekmemo/sync/sha256` — this one
 * takes bytes and is async (Web Crypto's `subtle.digest` is async).
 *
 * @public
 */
export async function hashBytesHex(
	bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
	const view = new Uint8Array(digest);
	let hex = "";
	for (const byte of view) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

/**
 * Encodes a UTF-8 string into a fresh `ArrayBuffer`-backed `Uint8Array`. The
 * explicit `ArrayBuffer` (never `SharedArrayBuffer`) backing keeps the bytes
 * valid as input to both Web Crypto (`crypto.subtle.digest`) and the
 * {@link BlobClient.put} contract under TS 6's stricter typed-array generics.
 */
function encodeUtf8(value: string): Uint8Array<ArrayBuffer> {
	const encoded = new TextEncoder().encode(value);
	// `TextEncoder().encode` already yields a fresh `Uint8Array<ArrayBuffer>`, but
	// the lib types widen to `Uint8Array<ArrayBufferLike>`; copy into an explicit
	// ArrayBuffer to satisfy the stricter generic on the call sites above.
	const buffer = new ArrayBuffer(encoded.byteLength);
	const view = new Uint8Array(buffer);
	view.set(encoded);
	return view;
}
