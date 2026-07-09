/**
 * Input validation for the sync-only cloud client surface.
 *
 * The cloud is a file replica: the only request bodies it accepts are the
 * file-manifest sync payloads (`push`, `push/complete`, `pull`, `status`).
 * Every engine validator (recall, memory, graph, extraction, providers,
 * candidates, conflicts, agent sessions) has been removed — those operations
 * run locally and never hit the cloud.
 *
 * @public
 */
import {
	MemoFSCloudConfigurationError,
	MemoFsCloudValidationError,
} from "./errors";
import type {
	FileManifest,
	SyncCursor,
	SyncPullInput,
	SyncPushCompleteInput,
	SyncPushInput,
	SyncStatusInput,
} from "./types";

/** sha256 hex digest: 64 lowercase hexadecimal characters. */
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function assertNonEmptyString(
	value: unknown,
	fieldName: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new MemoFsCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a non-empty string.`,
		});
	}
}

/**
 * Asserts an optional cursor. Cursors are opaque server-issued strings; we only
 * require that, when present, they are non-empty. We do not parse their format.
 */
export function assertOptionalCursor(
	value: unknown,
	fieldName: string,
): asserts value is SyncCursor | undefined {
	if (value === undefined || value === null) return;
	assertNonEmptyString(value, fieldName);
}

/** Asserts a value is a sha256 hex digest (64 lowercase hex chars). */
export function assertSha256(
	value: unknown,
	fieldName: string,
): asserts value is string {
	if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
		throw new MemoFsCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a sha256 hex digest (64 lowercase hex characters).`,
		});
	}
}

export function assertProjectId(value: unknown, fallback?: string): string {
	const projectId =
		typeof value === "string" && value.trim() ? value : fallback;
	assertNonEmptyString(projectId, "projectId");
	return projectId.trim();
}

/**
 * Validates an optional local file manifest. When present, it must be a map of
 * canonical `.memofs/` path → sha256; when absent, the server treats the
 * request as "pull/push everything known" (see §4.5 of the refactor doc).
 */
export function assertOptionalFileManifest(
	value: unknown,
	fieldName: string,
): asserts value is FileManifest | undefined {
	if (value === undefined || value === null) return;
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoFsCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a JSON object mapping paths to sha256 digests.`,
		});
	}
	for (const [path, sha] of Object.entries(value as Record<string, unknown>)) {
		assertNonEmptyString(path, `${fieldName} key`);
		assertSha256(sha, `${fieldName}["${path}"]`);
	}
}

/**
 * Validates a local file manifest: a map of canonical `.memofs/` path → sha256.
 * Each path must be a non-empty string; each value must be a sha256 hex digest.
 */
export function assertFileManifest(
	value: unknown,
	fieldName: string,
): asserts value is FileManifest {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoFsCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a JSON object mapping paths to sha256 digests.`,
		});
	}
	for (const [path, sha] of Object.entries(value as Record<string, unknown>)) {
		assertNonEmptyString(path, `${fieldName} key`);
		assertSha256(sha, `${fieldName}["${path}"]`);
	}
}

/**
 * Validates a `push` request: the local file manifest plus an optional base
 * cursor the client last synced at.
 */
export function validateSyncPushInput(input: SyncPushInput): SyncPushInput {
	assertFileManifest(input.manifest, "manifest");
	assertOptionalCursor(input.baseCursor, "baseCursor");
	return input;
}

/**
 * Validates the two-phase push completion: the list of files the client
 * uploaded (path + sha256) and the cursor returned by the preceding `push`.
 */
export function validateSyncPushCompleteInput(
	input: SyncPushCompleteInput,
): SyncPushCompleteInput {
	if (!Array.isArray(input.uploaded)) {
		throw new MemoFsCloudValidationError({
			code: "invalid_input",
			message: "uploaded must be an array of { path, sha256 } entries.",
		});
	}
	for (const [index, entry] of input.uploaded.entries()) {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			throw new MemoFsCloudValidationError({
				code: "invalid_input",
				message: `uploaded[${index}] must be an object.`,
			});
		}
		assertNonEmptyString(entry.path, `uploaded[${index}].path`);
		assertSha256(entry.sha256, `uploaded[${index}].sha256`);
	}
	assertNonEmptyString(input.cursor, "cursor");
	return input;
}

/**
 * Validates a `pull` request. The client may supply its local manifest (path →
 * sha256) so the server can diff, a cursor to pull everything changed since,
 * or omit both to pull every known file.
 */
export function validateSyncPullInput(input: SyncPullInput): SyncPullInput {
	assertOptionalCursor(input.since, "since");
	assertOptionalFileManifest(input.manifest, "manifest");
	return input;
}

export function normalizeBaseUrl(baseUrl: string): string {
	assertNonEmptyString(baseUrl, "baseUrl");
	let url: URL;
	try {
		url = new URL(baseUrl.trim());
	} catch (cause) {
		throw new MemoFSCloudConfigurationError({
			code: "invalid_base_url",
			message: "baseUrl must be a valid absolute URL.",
			cause,
		});
	}
	if (
		url.protocol !== "https:" &&
		url.hostname !== "localhost" &&
		url.hostname !== "127.0.0.1"
	) {
		throw new MemoFSCloudConfigurationError({
			code: "insecure_base_url",
			message:
				"baseUrl must use https, except for localhost self-hosted development.",
		});
	}
	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url.toString().replace(/\/$/, "");
}

export function normalizeApiKey(
	apiKey: string | undefined,
): string | undefined {
	if (apiKey === undefined) return undefined;
	const trimmed = apiKey.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function compactQuery(
	input: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
	const output: Record<string, string | number | boolean> = {};
	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined && value !== null && value !== "")
			output[key] = value;
	}
	return output;
}
