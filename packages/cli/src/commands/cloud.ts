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
import { createCliSnapshot } from "./snapshot";

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
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Checking MemoFS Cloud health...");

	try {
		const result = await client.health();
		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "cloud.health", result);
			return 0;
		}

		if (result.ok) {
			options.output.success(
				`MemoFS Cloud is operational (${result.name ?? "cloud"} v${result.version ?? "1.0"})`,
			);
		} else {
			options.output.error(`MemoFS Cloud health check failed`);
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
	} catch (error) {
		spinner.fail("Cloud health check failed");
		throw error;
	}
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
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Checking MemoFS Cloud readiness...");

	try {
		const result = await client.readiness();
		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "cloud.readiness", result);
			return 0;
		}

		if (result.ok) {
			options.output.success("MemoFS Cloud service is ready for sync");
		} else {
			options.output.error("MemoFS Cloud service is not ready");
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
	} catch (error) {
		spinner.fail("Cloud readiness check failed");
		throw error;
	}
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
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Fetching cloud sync status...");

	try {
		const result = await client.sync.status();
		spinner.stop();

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
	} catch (error) {
		spinner.fail("Failed to fetch cloud sync status");
		throw error;
	}
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
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPullCommand(
	options: CloudSyncPullCommandOptions,
): Promise<number> {
	const client = options.client;
	const rootDir = options.rootDir ?? process.cwd();
	const store = getLocalStore(rootDir);
	const spinner = options.output.spinner({ json: options.json });
	const progress = options.output.progress({ json: options.json });

	try {
		spinner.start("[1/4] Computing local workspace file manifest...");
		const localManifest = await computeLocalManifest(rootDir);

		spinner.update("[2/4] Requesting server sync pull status...");
		const result = await client.sync.pull({
			manifest: localManifest,
			...(options.since ? { since: options.since } : {}),
		});

		// Mandatory pre-sync snapshot before mutating local files (§8, D6)
		if (result.files.length > 0 || result.removed.length > 0) {
			spinner.update(
				"[3/4] Creating pre-sync safety snapshot (pre-sync-pull)...",
			);
			await createCliSnapshot(store as never, {
				label: "pre-sync-pull",
				type: "pre-sync",
			});
		}

		spinner.stop();

		// Perform actual download + verify + write
		const totalFiles = result.files.length;
		let completedFiles = 0;

		for (const file of result.files) {
			completedFiles += 1;
			progress.update(
				completedFiles,
				totalFiles,
				`Downloading file replica: ${file.path}`,
			);

			const content = await fetchText(file.presignedGetUrl);
			const actualHash = await sha256Hex(content);
			if (actualHash !== file.sha256) {
				progress.stop();
				throw new Error(
					`sync.pull: sha256 mismatch for ${file.path} (expected ${file.sha256}, got ${actualHash}).`,
				);
			}
			// Validate canonical path
			if (!isCanonicalOrSnapshotPath(file.path)) {
				progress.stop();
				throw new Error(
					`sync.pull: refusing to write non-canonical path ${file.path}.`,
				);
			}
			await store.write(file.path as never, content);
		}

		progress.stop();

		for (const removed of result.removed) {
			if (isCanonicalOrSnapshotPath(removed)) {
				await store.delete(removed as never);
			}
		}

		if (options.json) {
			printJsonEnvelope(options.output, "cloud.sync.pull", result);
			return 0;
		}

		options.output.success(
			`✓ Cloud pull complete (${result.files.length} downloaded, ${result.removed.length} removed, cursor: ${result.cursor})`,
		);

		options.output.write(
			[
				`files: ${result.files.length}`,
				`removed: ${result.removed.length}`,
				`cursor: ${result.cursor}`,
			].join("\n"),
		);
		return 0;
	} catch (error) {
		spinner.fail("Cloud sync pull failed");
		progress.stop();
		throw error;
	}
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
 * contract.
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
	const spinner = options.output.spinner({ json: options.json });
	const progress = options.output.progress({ json: options.json });

	try {
		spinner.start("[1/4] Computing local workspace file manifest...");
		const manifest = await computeLocalManifest(rootDir);

		spinner.update(
			"[2/4] Requesting presigned upload URLs from MemoFS Cloud...",
		);
		const pushResult = await client.sync.push({
			manifest,
			...(options.baseCursor ? { baseCursor: options.baseCursor } : {}),
		});

		if (pushResult.upload.length === 0) {
			spinner.succeed("Cloud workspace is already up to date.");
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

		spinner.stop();

		// Phase 2: upload bytes to presigned PUT URLs
		const totalUploads = pushResult.upload.length;
		let completedUploads = 0;

		for (const target of pushResult.upload) {
			completedUploads += 1;
			progress.update(
				completedUploads,
				totalUploads,
				`Uploading file replica: ${target.path}`,
			);

			const content = await store.read(target.path as never);
			const actualHash = await sha256Hex(content);
			if (actualHash !== target.sha256) {
				progress.stop();
				throw new Error(
					`sync.upload: sha256 mismatch for ${target.path} (expected ${target.sha256}, got ${actualHash}).`,
				);
			}
			await putText(target.presignedPutUrl, content);
		}

		progress.stop();

		spinner.start("[4/4] Committing uploaded manifest to MemoFS Cloud...");

		const uploaded = pushResult.upload.map((target) => ({
			path: target.path,
			sha256: target.sha256,
		}));

		const completeResult = await client.sync.complete({
			uploaded,
			cursor: options.baseCursor ?? pushResult.cursor,
		});

		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "cloud.sync.push", {
				upload: pushResult.upload,
				cursor: pushResult.cursor,
				complete: completeResult,
			});
			return 0;
		}

		options.output.success(
			`✓ Cloud push complete (${uploaded.length} uploaded, cursor: ${completeResult.cursor})`,
		);

		options.output.write(
			[
				`uploaded: ${uploaded.length}`,
				`cursor: ${completeResult.cursor}`,
				`files: ${Object.keys(completeResult.manifest).length}`,
			].join("\n"),
		);
		return 0;
	} catch (error) {
		spinner.fail("Cloud sync push failed");
		progress.stop();
		throw error;
	}
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
 * Computes the local file manifest for the given workspace root.
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
