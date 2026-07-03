/**
 * CLI command handlers for interacting with the TekMemo Cloud service.
 *
 * The cloud is a **file replica**, not an engine: it stores byte-for-byte
 * replicas of the canonical `.tekmemo/` files and syncs them by path + sha256.
 * Only five cloud commands survive the v1.0.0-alpha.0 refactor — health,
 * readiness, and the three sync surface commands (`sync status|pull|push`)
 * that map onto the four-method frozen sync contract
 * (`sync.{push,complete,pull,status}`).
 *
 * See `docs/architecture/cloud-sync-and-refactor.md` §7 for the contract.
 *
 * @module cloud
 */

import type {
	FileManifest,
	SyncCursor,
	SyncPushCompleteResult,
	TekMemoCloudClient,
} from "@tekmemo/core";
import { CANONICAL_TEKMEMO_FILES, sha256Hex } from "@tekmemo/core";
import { createNodeFsMemoryStore } from "@tekmemo/core/node-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Base options shared by all cloud commands.
 */
export interface CloudCommandBaseOptions {
	/**
	 * Pre-instantiated TekMemo Cloud client from memo.cloud.
	 */
	client: TekMemoCloudClient;
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
			"TekMemo Cloud",
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

/**
 * Pulls file replicas from the cloud: requests presigned download URLs for every
 * file the local workspace is missing or behind on, plus paths removed
 * server-side.
 *
 * NOTE: the actual byte download + verify + write + reindex is delegated to the
 * local file-sync layer (see
 * `packages/tekmemo/src/tekmemo/sync/file-replication.ts`). When this command is
 * invoked through the CLI runner, the runtime wires `pull` end-to-end; when
 * invoked directly with a raw cloud client, it reports the planned download set.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPullCommand(
	options: CloudSyncPullCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.sync.pull(
		options.since ? { since: options.since } : undefined,
	);
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

/**
 * Pushes local `.tekmemo/` file replicas to the cloud using the two-phase push
 * contract: (1) `push` computes the local manifest and requests presigned upload
 * URLs for changed/missing files; (2) the bytes are uploaded to R2; (3)
 * `complete` confirms the uploads and commits the manifest.
 *
 * The CLI performs phases 1 and 3 directly against the cloud client. Phase 2
 * (the actual byte upload to presigned PUT URLs) is handled by the runtime
 * file-sync layer, which has access to the local file store; here we report
 * which files the layer must upload.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPushCommand(
	options: CloudSyncPushCommandOptions,
): Promise<number> {
	const client = options.client;
	const rootDir = options.rootDir ?? process.cwd();
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

	// Confirm which files the runtime layer must upload to presigned PUTs.
	const uploaded = pushResult.upload.map((target) => ({
		path: target.path,
		sha256: target.sha256,
	}));

	// Phase 3: confirm uploads and commit the manifest update. (Phase 2, the
	// byte upload, runs in the runtime file-sync layer between these two calls.)
	const completeResult = await completePush(
		client,
		pushResult.cursor,
		uploaded,
	);

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

/**
 * Confirms a push and commits the manifest update. Separated so the runtime
 * file-sync layer can interleave the actual byte upload between phases 1 and 3.
 */
async function completePush(
	client: TekMemoCloudClient,
	cursor: SyncCursor,
	uploaded: Array<{ path: string; sha256: string }>,
): Promise<SyncPushCompleteResult> {
	return client.sync.complete({ uploaded, cursor });
}

/**
 * Computes the local file manifest (canonical path → sha256) for the given
 * workspace root by reading the canonical `.tekmemo/` files through the public
 * node FS memory store. Missing files are skipped (they contribute no entry).
 *
 * @param rootDir - Workspace root containing the `.tekmemo/` directory.
 * @returns the local file manifest.
 */
export async function computeLocalManifest(
	rootDir: string,
): Promise<FileManifest> {
	const store = createNodeFsMemoryStore({
		rootDir,
		createRoot: false,
		missingFileBehavior: "empty",
	});
	const manifest: FileManifest = {};
	for (const path of CANONICAL_TEKMEMO_FILES) {
		if (!(await store.exists(path))) continue;
		const content = await store.read(path);
		manifest[path] = sha256Hex(content);
	}
	return manifest;
}
