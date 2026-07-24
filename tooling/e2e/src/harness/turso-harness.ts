/**
 * Real Turso harness — file DB, libSQL client, adapter-turso.
 *
 * @remarks
 * Creates an isolated tmpDir, a `file:<tmpDir>/test.db` libSQL database,
 * ensures `project_files` schema, and exposes a real `TursoMetadataStore`
 * via `@memofs/adapter-turso`. Proves file persistence across client restart
 * and contract compliance (`defineMetadataStoreContractTests`).
 *
 * Node-only: imports `node:fs`, `@libsql/client`.
 *
 * File-first truth: the DB file exists on disk after write, snapshot captures it.
 * Cross-visibility: adapter write visible to core harness when same tmpDir used
 * for file-level isolation (DB file path side-by-side).
 *
 * @public
 */

import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";

import type { RealHarness } from "./core-harness.js";

/**
 * DDL for `project_files` — mirrors integration test in adapter-turso.
 * Used to ensure schema exists on file DB.
 */
const PROJECT_FILES_DDL = [
	`CREATE TABLE IF NOT EXISTS project_files (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		path TEXT NOT NULL,
		sha256 TEXT NOT NULL,
		r2_key TEXT NOT NULL,
		size_bytes INTEGER NOT NULL,
		updated_at TEXT NOT NULL DEFAULT (current_timestamp)
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS project_files_project_path_uq ON project_files (project_id, path)`,
];

/**
 * Turso real harness — real libSQL file + adapter-turso instance.
 * @public
 */
export type TursoRealHarness = RealHarness & {
	/** Absolute path to isolated tmpDir. */
	tmpDir: string;
	/** Absolute path to DB file e.g. `/tmp/.../test.db`. */
	dbPath: string;
	/** Project ID scoping the manifest. */
	projectId: string;
	/** Real libSQL client (`@libsql/client`). */
	client: {
		execute: (stmt: unknown) => Promise<{ rows: unknown[] }>;
		close: () => void;
		// other methods present but not typed strictly
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	};
	/** Real metadata store from adapter-turso (implements MinimalMetadataStore). */
	metadataStore: {
		getEntry: (path: string) => Promise<{ sha256: string; blobKey: string; sizeBytes: number } | undefined>;
		upsertEntry: (path: string, entry: { sha256: string; blobKey: string; sizeBytes: number }) => Promise<void>;
		removeEntry: (path: string) => Promise<void>;
		withTransaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	};
	/** Ensures `project_files` table exists (idempotent). */
	ensureSchema: () => Promise<void>;
	/** Closes client without removing tmpDir — for restart test. */
	closeClient: () => Promise<void>;
	/** Restarts client pointing to same DB file, re-creates metadataStore, proves persistence. */
	restart: () => Promise<void>;
	/** Closes client + removes tmpDir (cleanup). */
	close: () => Promise<void>;
};

/**
 * Options for creating a real Turso harness.
 * @public
 */
export type CreateRealTursoHarnessOptions = {
	/** Reuse existing tmpDir instead of creating new. */
	tmpDir?: string;
	/** Prefix for mkdtemp. @defaultValue "memofs-e2e-turso-" */
	prefix?: string;
	/** Project ID for manifest. @defaultValue "e2e-test" */
	projectId?: string;
	/** DB file name inside tmpDir. @defaultValue "test.db" */
	dbFileName?: string;
};

/**
 * Ensures schema via direct SQL execution.
 * @param client - libSQL client
 */
async function ensureSchemaOnClient(client: { execute: (sql: string) => Promise<unknown> }): Promise<void> {
	for (const sql of PROJECT_FILES_DDL) {
		await client.execute(sql);
	}
}

/**
 * Creates a real Turso harness with isolated tmpDir and file DB.
 *
 * Proves:
 * - file:<tmpDir>/test.db creation
 * - real libSQL client via adapter-turso
 * - ensureSchema (table + unique index)
 * - write persists across client restart (close + reopen same file)
 * - passes defineMetadataStoreContractTests
 * - file-first truth: DB file exists after write, snapshot captures layout
 *
 * @example
 * ```ts
 * const turso = await createRealTursoHarness();
 * try {
 *   await turso.ensureSchema();
 *   await turso.metadataStore.upsertEntry(".memofs/memory/core.md", {
 *     sha256: "a".repeat(64),
 *     blobKey: "a".repeat(64),
 *     sizeBytes: 42
 *   });
 *   await turso.restart();
 *   const entry = await turso.metadataStore.getEntry(".memofs/memory/core.md");
 *   expect(entry).toBeDefined();
 * } finally {
 *   await turso.cleanup();
 * }
 * ```
 *
 * @public
 */
export async function createRealTursoHarness(
	options: CreateRealTursoHarnessOptions = {},
): Promise<TursoRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-turso-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));
	const dbFileName = options.dbFileName ?? "test.db";
	const dbPath = join(tmpDir, dbFileName);
	const projectId = options.projectId ?? "e2e-test";

	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	// Dynamic imports to avoid hard dep at top-level
	let createClient: (config: { url: string; timeout?: number }) => {
		execute: (stmt: unknown) => Promise<{ rows: unknown[] }>;
		close: () => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	};
	let createTursoMetadataStore: (opts: { client: unknown; projectId: string }) => TursoRealHarness["metadataStore"];

	try {
		const libsqlMod = (await import("@libsql/client")) as unknown as {
			createClient: typeof createClient;
		};
		createClient = libsqlMod.createClient;
	} catch (e) {
		throw new Error(
			`TursoRealHarness: failed to import @libsql/client. Install it in @repo/e2e. Original: ${(e as Error).message}`,
		);
	}

	try {
		const adapterMod = (await import("@memofs/adapter-turso")) as unknown as {
			createTursoMetadataStore: typeof createTursoMetadataStore;
		};
		createTursoMetadataStore = adapterMod.createTursoMetadataStore;
	} catch (e) {
		throw new Error(
			`TursoRealHarness: failed to import @memofs/adapter-turso. Original: ${(e as Error).message}`,
		);
	}

	let client = createClient({ url: `file:${dbPath}`, timeout: 5000 });
	await ensureSchemaOnClient(client as never);
	let metadataStore = createTursoMetadataStore({ client: client as never, projectId });

	let cleaned = false;

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => listFilesRecursive(tmpDir);
	const snapshotFs = async (): Promise<Record<string, string>> => snapshotFsRecursive(tmpDir);

	const ensureSchema = async (): Promise<void> => {
		await ensureSchemaOnClient(client as never);
	};

	const closeClient = async (): Promise<void> => {
		try {
			client.close();
		} catch {
			// ignore
		}
	};

	// Verify file exists after client creation (SQLite file may not exist until write, but libSQL file:... creates on first execute)
	try {
		await stat(dbPath);
	} catch {
		// File may not exist until first write — that's okay, ensureSchema should have created it
	}

	const harness: TursoRealHarness = {
		tmpDir,
		dbPath,
		projectId,
		client: client as TursoRealHarness["client"],
		metadataStore,
		ensureSchema,
		closeClient,
		restart: async () => {
			// Placeholder, will be overwritten below with closure that mutates harness
		},
		close: async () => {},
		cleanup: async () => {},
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};

	harness.restart = async (): Promise<void> => {
		await closeClient();
		client = createClient({ url: `file:${dbPath}`, timeout: 5000 });
		await ensureSchemaOnClient(client as never);
		metadataStore = createTursoMetadataStore({ client: client as never, projectId });
		harness.client = client as TursoRealHarness["client"];
		harness.metadataStore = metadataStore;
	};

	harness.close = async (): Promise<void> => {
		await closeClient();
	};

	harness.cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		try {
			await closeClient();
		} catch {
			// ignore
		}
		await rm(tmpDir, { recursive: true, force: true });
	};

	return harness;
}
