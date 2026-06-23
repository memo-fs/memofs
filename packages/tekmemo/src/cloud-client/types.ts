/**
 * Public types for @tekbreed/tekmemo/cloud.
 *
 * TekMemo Cloud is a **file replica**, not an engine. The cloud stores
 * byte-for-byte replicas of the canonical `.tekmemo/` files and syncs them by
 * file path + sha256 checksum. The cloud never embeds, recalls, runs graph
 * traversal, extracts memory, or hosts agent sessions — every one of those
 * operations runs in the local runtime against the same files the cloud mirrors.
 *
 * See `docs/architecture/cloud-sync-and-refactor.md` for the full contract.
 *
 * The client is project-scoped:
 *   /api/v1/projects/:projectId/sync/{push,pull,status}
 *
 * It intentionally does not import Cloudflare, Turso, Better Auth, Polar, or any
 * server-only TekMemo Cloud internals.
 *
 * @public
 */
import type { JsonObject, JsonPrimitive, JsonValue } from "../core/types/json";

export type { JsonObject, JsonPrimitive, JsonValue };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface TekMemoCloudMeta {
	requestId?: string;
	[key: string]: JsonValue | undefined;
}

export interface TekMemoCloudSuccessEnvelope<T> {
	data: T;
	meta?: TekMemoCloudMeta;
}

export interface TekMemoCloudErrorEnvelope {
	error: {
		code: string;
		message: string;
		details?: JsonValue;
	};
	meta?: TekMemoCloudMeta;
}

export type TekMemoCloudEnvelope<T> =
	| TekMemoCloudSuccessEnvelope<T>
	| TekMemoCloudErrorEnvelope;

export interface TekMemoCloudFetchResponse {
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly headers: Headers;
	text(): Promise<string>;
}

export type TekMemoCloudFetch = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<TekMemoCloudFetchResponse>;

export interface TekMemoCloudRetryOptions {
	retries?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	statuses?: number[];
}

export interface TekMemoCloudClientOptions {
	/** Base URL, usually https://memo.tekbreed.com/api/v1 or a self-hosted /api/v1 URL. */
	baseUrl: string;
	/** TekMemo API key, e.g. tk_live_... . Never pass provider keys here. */
	apiKey?: string;
	/** Default project used by project-scoped API calls. */
	defaultProjectId?: string;
	/** Optional workspace value kept for caller metadata/config. API calls are project-scoped. */
	defaultWorkspaceId?: string;
	fetch?: TekMemoCloudFetch;
	timeoutMs?: number;
	retry?: TekMemoCloudRetryOptions | false;
	headers?: Record<string, string>;
	userAgent?: string;
	requireApiKey?: boolean;
}

export interface TekMemoCloudRequestOptions {
	method: HttpMethod;
	path: string;
	query?: Record<string, string | number | boolean | null | undefined>;
	body?: unknown;
	signal?: AbortSignal;
	requireApiKey?: boolean;
}

export interface TekMemoCloudRequestMeta {
	requestId?: string;
	status?: number;
	retryAfterMs?: number;
}

export interface ProjectScopedInput {
	projectId?: string;
}

/**
 * Health check result. The cloud reports itself as a sync replica; its
 * `capabilities` advertise only sync-related capabilities.
 */
export interface TekMemoCloudHealthResult {
	ok: boolean;
	name?: string;
	version?: string;
	capabilities?: string[];
	warnings?: string[];
}

// ---------------------------------------------------------------------------
// File-based sync types
// ---------------------------------------------------------------------------

/**
 * A single canonical `.tekmemo/` file entry in a sync manifest, identified by
 * its canonical path and versioned by the sha256 of its content.
 */
export interface FileSyncEntry {
	/** Canonical `.tekmemo/` path, e.g. `.tekmemo/memory/core.md`. */
	path: string;
	/** sha256 hex digest of the file content. */
	sha256: string;
	/** Content size in bytes. */
	sizeBytes: number;
}

/**
 * A manifest entry as stored server-side. Includes the R2 object key and the
 * server wall-clock timestamp of the last commit.
 */
export interface CloudFileSyncEntry extends FileSyncEntry {
	/** R2 object key the cloud stores the bytes under. */
	r2Key?: string;
	/** ISO timestamp of the last server-side commit for this file. */
	updatedAt?: string;
}

/** A local file manifest: canonical path → current sha256. */
export type FileManifest = Record<string, string>;

/** A cloud file manifest: canonical path → server entry (sha256 + metadata). */
export type CloudFileManifest = Record<string, CloudFileSyncEntry>;

/** Server cursor representing a point in the project's sync history. */
export type SyncCursor = string;

/**
 * Push request: the client sends its current file manifest. The server diffs
 * against its own manifest and returns presigned upload URLs for every file
 * that is missing or whose sha256 differs.
 */
export interface SyncPushInput extends ProjectScopedInput {
	/** Local file manifest: path → sha256. */
	manifest: FileManifest;
	/** Optional cursor the client last synced at. */
	baseCursor?: SyncCursor;
}

/** A presigned upload URL for a single file the server needs. */
export interface SyncUploadTarget extends FileSyncEntry {
	/** Presigned R2 PUT URL the client uploads bytes to. */
	presignedPutUrl: string;
	/** Optional expiry of the presigned URL (ISO timestamp). */
	expiresAt?: string;
}

export interface SyncPushResult {
	/** Files the server needs from the client (missing or changed). */
	upload: SyncUploadTarget[];
	/** Cursor this push is associated with. */
	cursor: SyncCursor;
}

/**
 * Push complete request: the client confirms which files it uploaded. The
 * server verifies each object's sha256 and commits the manifest update.
 */
export interface SyncPushCompleteInput extends ProjectScopedInput {
	/** Files the client uploaded, with their sha256 (must match the presigned target). */
	uploaded: Array<{ path: string; sha256: string }>;
	/** Cursor returned by the preceding `push`. */
	cursor: SyncCursor;
}

export interface SyncPushCompleteResult {
	/** Cursor after the commit. */
	cursor: SyncCursor;
	/** The cloud manifest after the commit (path → server entry). */
	manifest: CloudFileManifest;
}

/**
 * Pull request: the client sends its current file manifest (or a cursor). The
 * server diffs against its own manifest and returns presigned download URLs for
 * every file the client is missing or behind on, plus paths removed server-side.
 */
export interface SyncPullInput extends ProjectScopedInput {
	/** Local file manifest (path → sha256). Omit to pull every known file. */
	manifest?: FileManifest;
	/** Alternatively, pull everything changed since this cursor. */
	since?: SyncCursor;
}

/** A presigned download URL for a single file the client needs. */
export interface SyncDownloadTarget extends FileSyncEntry {
	/** Presigned R2 GET URL the client downloads bytes from. */
	presignedGetUrl: string;
	/** Optional expiry of the presigned URL (ISO timestamp). */
	expiresAt?: string;
}

export interface SyncPullResult {
	/** Files the client should download (missing or behind). */
	files: SyncDownloadTarget[];
	/** Canonical paths deleted server-side that the client should remove locally. */
	removed: string[];
	/** Cursor after this pull. */
	cursor: SyncCursor;
	/** The cloud manifest at this cursor (path → server entry). */
	manifest: CloudFileManifest;
}

export interface SyncStatusInput extends ProjectScopedInput {}

export interface SyncStatusResult {
	/** The cloud manifest (path → server entry). */
	manifest: CloudFileManifest;
	/** Latest cursor. */
	cursor: SyncCursor;
	/** Total storage used by this project, in bytes. */
	storageBytes: number;
	/** ISO timestamp of the last sync, if any. */
	lastSyncAt?: string;
}

// ---------------------------------------------------------------------------
// Client interfaces
// ---------------------------------------------------------------------------

export interface TekMemoCloudSyncClient {
	/** Request presigned upload URLs for changed/missing files. */
	push(input: SyncPushInput, signal?: AbortSignal): Promise<SyncPushResult>;
	/** Confirm uploads and commit the manifest update. */
	complete(
		input: SyncPushCompleteInput,
		signal?: AbortSignal,
	): Promise<SyncPushCompleteResult>;
	/** Request presigned download URLs for files the client is behind on. */
	pull(input?: SyncPullInput, signal?: AbortSignal): Promise<SyncPullResult>;
	/** Read the cloud manifest, cursor, and storage usage. */
	status(
		input?: SyncStatusInput,
		signal?: AbortSignal,
	): Promise<SyncStatusResult>;
}

/**
 * The cloud client surface frozen into v1.0.0-alpha.0. The cloud is a file
 * replica: only health/readiness and the four sync methods exist.
 */
export interface TekMemoCloudClient {
	health(signal?: AbortSignal): Promise<TekMemoCloudHealthResult>;
	readiness(signal?: AbortSignal): Promise<TekMemoCloudHealthResult>;
	sync: TekMemoCloudSyncClient;
}
