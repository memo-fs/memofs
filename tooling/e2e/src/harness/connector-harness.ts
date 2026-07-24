/**
 * Real connector harness — runs real @memofs/connectors runner against MSW fixtures.
 *
 * @remarks
 * - Uses real MemoFS Node-fs store + real connectors (GitHub, Notion) via createConnectorRegistry()
 * - Fetch intercepted by MSW returning sanitized fixtures (RUN_ID style, secret redacted to test-token-***)
 * - Proves: first run ingests, second skips unchanged, changed record re-ingested
 * - Proves: connectors.json contains opaque secretRef never raw token
 * - Proves: file-first truth .memofs/ layout after ingest
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type ConnectorConfig,
	type ConnectorRegistry,
	createConnectorRegistry,
	type RunConnectorsResult,
	runConnectors,
	StaticSecretResolver,
} from "@memofs/connectors";
import { CONNECTORS_PATH, type MemoFS } from "@memofs/core";
import type { NodeFsMemoryStore } from "@memofs/core/node-fs";
import {
	type CreateRealCoreHarnessOptions,
	createRealCoreHarness,
} from "./core-harness";
import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers";

/**
 * Options for creating a real connector harness.
 * @public
 */
export type CreateRealConnectorHarnessOptions = CreateRealCoreHarnessOptions & {
	/** Optional custom registry (defaults to built-ins GitHub + Notion). */
	registry?: ConnectorRegistry;
	/** Initial token map for StaticSecretResolver. @defaultValue {"ss_test_a":"test-token-***"} */
	initialSecrets?: Record<string, string>;
};

/**
 * Real connector harness — core + connectors runner against MSW.
 * @public
 */
export type ConnectorRealHarness = {
	/** Absolute path to isolated tmpDir. */
	tmpDir: string;
	/** Real MemoFS client (for recall after ingest). */
	client: MemoFS;
	/** Real store. */
	store: NodeFsMemoryStore;
	/** Secret resolver (in-memory only, never written to disk). */
	secretResolver: StaticSecretResolver;
	/** Registry used (built-ins by default). */
	registry: ConnectorRegistry;
	/** Cleanup tmpDir + dispose store. */
	cleanup: () => Promise<void>;
	/** File assertions. */
	assertFileExists: (relPath: string) => Promise<void>;
	assertFileNotExists: (relPath: string) => Promise<void>;
	snapshotFs: () => Promise<Record<string, string>>;
	listFiles: () => Promise<string[]>;
	/** Write connectors.json with given connectors. */
	writeConnectorsFile: (connectors: ConnectorConfig[]) => Promise<void>;
	/** Read raw connectors.json content (for asserting secretRef opaque). */
	readConnectorsFileRaw: () => Promise<string>;
	/** Run connectors against MSW. */
	run: (opts?: { onlyType?: string }) => Promise<RunConnectorsResult>;
};

/**
 * Creates a real connector harness.
 *
 * Proves file-first truth + secretRef opaque + dedup behavior via MSW fixtures.
 *
 * @example
 * ```ts
 * const harness = await createRealConnectorHarness();
 * try {
 *   await harness.writeConnectorsFile([{id:"gh", type:"github", enabled:true, secretRef:"ss_test_a", sourceMapping:{repository:"owner/repo"}}]);
 *   const first = await harness.run();
 *   expect(first.written.length).toBe(2);
 *   const second = await harness.run();
 *   expect(second.skipped.length).toBe(2);
 * } finally {
 *   await harness.cleanup();
 * }
 * ```
 * @public
 */
export async function createRealConnectorHarness(
	options: CreateRealConnectorHarnessOptions = {},
): Promise<ConnectorRealHarness> {
	const core = await createRealCoreHarness({
		tmpDir: options.tmpDir,
		projectId: options.projectId,
		prefix: options.prefix ?? "memofs-e2e-connector-",
		lock: options.lock ?? false,
		createRoot: options.createRoot ?? true,
	});

	const registry = options.registry ?? createConnectorRegistry();

	const secrets = options.initialSecrets ?? {
		ss_test_a: "test-token-***",
		ss_test_b: "test-token-***",
		ss_test_notion: "test-token-***",
	};

	const secretResolver = new StaticSecretResolver(secrets);

	const writeConnectorsFile = async (
		connectors: ConnectorConfig[],
	): Promise<void> => {
		await mkdir(join(core.tmpDir, ".memofs"), { recursive: true });
		const filePath = join(core.tmpDir, CONNECTORS_PATH);
		await writeFile(filePath, JSON.stringify({ connectors }, null, 2), "utf8");
	};

	const readConnectorsFileRaw = async (): Promise<string> => {
		const filePath = join(core.tmpDir, CONNECTORS_PATH);
		return readFile(filePath, "utf8");
	};

	const run = async (opts?: {
		onlyType?: string;
	}): Promise<RunConnectorsResult> => {
		return runConnectors({
			rootDir: core.tmpDir,
			memo: core.client,
			secretResolver,
			connectorRegistry: registry,
			...(opts?.onlyType ? { onlyType: opts.onlyType } : {}),
		});
	};

	const cleanup = async (): Promise<void> => {
		await core.cleanup();
	};

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(core.tmpDir, relPath);
	};

	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(core.tmpDir, relPath);
	};

	const listFiles = async (): Promise<string[]> => {
		return listFilesRecursive(core.tmpDir);
	};

	const snapshotFs = async (): Promise<Record<string, string>> => {
		return snapshotFsRecursive(core.tmpDir);
	};

	return {
		tmpDir: core.tmpDir,
		client: core.client,
		store: core.store,
		secretResolver,
		registry,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
		writeConnectorsFile,
		readConnectorsFileRaw,
		run,
	};
}
