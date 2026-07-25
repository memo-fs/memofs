/**
 * CLI command handlers for interacting with the MemoFS Cloud service.
 *
 * The cloud is a **file replica**, not an engine: it stores byte-for-byte
 * replicas of the canonical `.memofs/` files and syncs them by path + sha256.
 * Only five cloud commands survive the v1.0.0-alpha.0 refactor — health,
 * readiness, and the three sync surface commands (`sync status|pull|push`)
 * that map onto the four-method frozen sync contract
 * (`sync.{push,complete,pull,status}`).
 *
 * See `docs/architecture/cloud-sync-and-refactor.md` §7 for the contract.
 *
 * @module cloud
 */

import type { FileManifest, MemoFsCloudClient } from "@memofs/core";
import { CANONICAL_MEMOFS_FILES, sha256Hex } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Base options shared by all cloud commands.
 */
export interface CloudCommandBaseOptions {
	/**
	 * Pre-instantiated MemoFS Cloud client from memo.cloud.
	 */
	client: MemoFsCloudClient;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * Optional local workspace root directory path.
	 */
	rootDir?: string | undefined;
	/**
	 * Optional prefetched stdin content, if available.
	 */
	stdinContent?: string | undefined;
}

/**
 * Options for the cloud health command.
 */
export interface CloudHealthCommandOptions extends CloudCommandBaseOptions {}

/**
 * Options for the cloud readiness command.
 */
export interface CloudReadinessCommandOptions extends CloudCommandBaseOptions {}

/**
 * Options for the `cloud sync status` command.
 */
export interface CloudSyncStatusCommandOptions
	extends CloudCommandBaseOptions {}

/**
 * Options for the `cloud sync pull` command.
 */
export interface CloudSyncPullCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Optional cursor to pull everything changed since.
	 */
	since?: string | undefined;
}

/**
 * Options for the `cloud sync push` command.
 */
export interface CloudSyncPushCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Optional cursor the client last synced at. Sent as `baseCursor` to `push`.
	 */
	baseCursor?: string | undefined;
}

/**
 * Performs a cloud health check.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudHealthCommand(
	options: CloudHealthCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.health();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.health", result);
		return 0;
	}
	options.output.write(
		[
			"MemoFS Cloud",
			`ok: ${result.ok}`,
			`name: ${result.name ?? "unknown"}`,
			`version: ${result.version ?? "unknown"}`,
			`capabilities: ${(result.capabilities ?? []).join(", ") || "none"}`,
			...(result.warnings?.length
				? result.warnings.map((warning) => `warning: ${warning}`)
				: []),
		].join("\n"),
	);
	return result.ok ? 0 : 1;
}

/**
 * Performs a cloud readiness check.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudReadinessCommand(
	options: CloudReadinessCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.readiness();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.readiness", result);
		return 0;
	}
	options.output.write(
		[
			`ok: ${result.ok}`,
			`name: ${result.name ?? "unknown"}`,
			`version: ${result.version ?? "unknown"}`,
			`capabilities: ${(result.capabilities ?? []).join(", ") || "none"}`,
			...(result.warnings?.length
				? result.warnings.map((warning) => `warning: ${warning}`)
				: []),
		].join("\n"),
	);
	return result.ok ? 0 : 1;
}

/**
 * Reads the cloud sync status: manifest, cursor, storage usage, and last sync.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncStatusCommand(
	options: CloudSyncStatusCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.sync.status();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.status", result);
		return 0;
	}
	options.output.write(
		[
			`cursor: ${result.cursor}`,
			`files: ${Object.keys(result.manifest).length}`,
			`storageBytes: ${result.storageBytes}`,
			...(result.lastSyncAt ? [`lastSyncAt: ${result.lastSyncAt}`] : []),
		].join("\n"),
	);
	return 0;
}

/** Creates the local NodeFs store used for manifest + sync I/O. */
function getLocalStore(
	rootDir: string,
): ReturnType<typeof createNodeFsMemoryStore> {
	return createNodeFsMemoryStore({
		rootDir,
		createRoot: false,
		missingFileBehavior: "empty",
	});
}

/**
 * Pulls file replicas from the cloud: requests presigned download URLs for every
 * file the local workspace is missing or behind on, plus paths removed
 * server-side.
 *
 * This implementation performs the actual byte download + verify + write
 * (previously it only reported the planned set). It uses the NodeFs store
 * directly, matching the file-replication layer's behavior, and then
 * re-derives indexes by bootstrapping if needed.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPullCommand(
	options: CloudSyncPullCommandOptions,
): Promise<number> {
	const client = options.client;
	const rootDir = options.rootDir ?? process.cwd();
	const store = getLocalStore(rootDir);

	// Compute local manifest for the pull request (server diffs against it).
	const localManifest = await computeLocalManifest(rootDir);

	const result = await client.sync.pull({
		manifest: localManifest,
		...(options.since ? { since: options.since } : {}),
	});

	// Perform actual download + verify + write
	for (const file of result.files) {
		const content = await fetchText(file.presignedGetUrl);
		const actualHash = await sha256Hex(content);
		if (actualHash !== file.sha256) {
			throw new Error(
				`sync.pull: sha256 mismatch for ${file.path} (expected ${file.sha256}, got ${actualHash}).`,
			);
		}
		// Validate canonical path
		if (!isCanonicalOrSnapshotPath(file.path)) {
			throw new Error(
				`sync.pull: refusing to write non-canonical path ${file.path}.`,
			);
		}
		await store.write(file.path as never, content);
	}

	for (const removed of result.removed) {
		if (isCanonicalOrSnapshotPath(removed)) {
			await store.delete(removed as never);
		}
	}

	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.pull", result);
		return 0;
	}
	options.output.write(
		[
			`files: ${result.files.length}`,
			`removed: ${result.removed.length}`,
			`cursor: ${result.cursor}`,
		].join("\n"),
	);
	return 0;
}

function isCanonicalOrSnapshotPath(path: string): boolean {
	if ((CANONICAL_MEMOFS_FILES as readonly string[]).includes(path)) return true;
	if (path.startsWith(".memofs/snapshots/") && path.endsWith(".json")) {
		const id = path.slice(".memofs/snapshots/".length, -".json".length);
		return /^[a-zA-Z0-9_.-]+$/.test(id);
	}
	return false;
}

/** Fetches a presigned URL as text, throwing on non-2xx. */
async function fetchText(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Presigned GET failed: ${response.status} ${response.statusText}.`,
		);
	}
	return response.text();
}

/**
 * Pushes local `.memofs/` file replicas to the cloud using the two-phase push
 * contract: (1) `push` computes the local manifest and requests presigned upload
 * URLs for changed/missing files; (2) the bytes are uploaded to R2; (3)
 * `complete` confirms the uploads and commits the manifest.
 *
 * This CLI implementation now performs phase 2 (byte upload) directly — it
 * reads each file from the local store and PUTs to its presigned URL, then
 * calls complete. Previously it skipped the upload, causing
 * "Uploaded object not found for <hash>. Re-upload and retry."
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPushCommand(
	options: CloudSyncPushCommandOptions,
): Promise<number> {
	const client = options.client;
	const rootDir = options.rootDir ?? process.cwd();
	const store = getLocalStore(rootDir);
	const manifest = await computeLocalManifest(rootDir);

	// Phase 1: request presigned upload URLs for changed/missing files.
	const pushResult = await client.sync.push({
		manifest,
		...(options.baseCursor ? { baseCursor: options.baseCursor } : {}),
	});

	if (pushResult.upload.length === 0) {
		// Nothing to upload — the cloud is already in sync with this manifest.
		if (options.json) {
			printJsonEnvelope(options.output, "cloud.sync.push", {
				upload: pushResult.upload,
				cursor: pushResult.cursor,
				complete: null,
			});
			return 0;
		}
		options.output.write(
			[
				"Nothing to push — cloud is already in sync.",
				`cursor: ${pushResult.cursor}`,
			].join("\n"),
		);
		return 0;
	}

	// Phase 2: upload bytes to presigned PUT URLs
	for (const target of pushResult.upload) {
		const content = await store.read(target.path as never);
		const actualHash = await sha256Hex(content);
		if (actualHash !== target.sha256) {
			throw new Error(
				`sync.upload: sha256 mismatch for ${target.path} (expected ${target.sha256}, got ${actualHash}).`,
			);
		}
		await putText(target.presignedPutUrl, content);
	}

	// Phase 3: confirm uploads and commit the manifest update.
	const uploaded = pushResult.upload.map((target) => ({
		path: target.path,
		sha256: target.sha256,
	}));

	// Phase 3: confirm uploads and commit the manifest update. (Phase 2, the
	// byte upload, runs in the runtime file-sync layer between these two calls.)
	const completeResult = await client.sync.complete({
		uploaded,
		cursor: pushResult.cursor,
	});

	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.push", {
			upload: pushResult.upload,
			cursor: pushResult.cursor,
			complete: completeResult,
		});
		return 0;
	}
	options.output.write(
		[
			`uploaded: ${uploaded.length}`,
			`cursor: ${completeResult.cursor}`,
			`files: ${Object.keys(completeResult.manifest).length}`,
		].join("\n"),
	);
	return 0;
}

/** PUTs text to a presigned URL, throwing on non-2xx. */
async function putText(url: string, body: string): Promise<void> {
	const response = await fetch(url, {
		method: "PUT",
		body,
	});
	if (!response.ok) {
		throw new Error(
			`Presigned PUT failed: ${response.status} ${response.statusText}.`,
		);
	}
}

/**
 * Computes the local file manifest (canonical path → sha256) for the given
 * workspace root by reading the canonical `.memofs/` files through the public
 * node FS memory store. Missing files are skipped (they contribute no entry).
 *
 * @param rootDir - Workspace root containing the `.memofs/` directory.
 * @returns the local file manifest.
 */
export async function computeLocalManifest(
	rootDir: string,
): Promise<FileManifest> {
	const store = getLocalStore(rootDir);
	const manifest: FileManifest = {};
	for (const path of CANONICAL_MEMOFS_FILES) {
		if (!(await store.exists(path))) continue;
		const content = await store.read(path);
		manifest[path] = await sha256Hex(content);
	}
	return manifest;
}
