import { createClient } from "@libsql/client";
import { defineMetadataStoreContractTests } from "@tekmemo/testing";
import { beforeAll, beforeEach, describe } from "vitest";
import { createTursoMetadataStore } from "../src/index";

/**
 * The `project_files` table this adapter consumes — owned by the cloud's
 * drizzle schema territory); the adapter is a consumer, not the owner.
 * Recreated here as the smallest durable DDL the manifest needs, mirroring the
 * cloud layout + unique `(project_id, path)` index exactly.
 */
const PROJECT_FILES_DDL = [
	`CREATE TABLE project_files (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		path TEXT NOT NULL,
		sha256 TEXT NOT NULL,
		r2_key TEXT NOT NULL,
		size_bytes INTEGER NOT NULL,
		updated_at TEXT NOT NULL DEFAULT (current_timestamp)
	)`,
	`CREATE UNIQUE INDEX project_files_project_path_uq ON project_files (project_id, path)`,
];

let client: ReturnType<typeof createClient>;

beforeAll(() => {
	// `:memory:` is fine — this suite exercises metadata CRUD, not the
	// interactive `BEGIN IMMEDIATE` transactions that need a file-backed DB.
	client = createClient({ url: ":memory:" });
});

beforeEach(async () => {
	await client.execute("DROP TABLE IF EXISTS project_files");
	// Each statement must be its own `execute` — better-sqlite3's `prepare`
	// (the local driver under libSQL) rejects multi-statement strings.
	for (const stmt of PROJECT_FILES_DDL) {
		await client.execute(stmt);
	}
});

describe("Turso metadata store", () => {
	defineMetadataStoreContractTests({
		name: "createTursoMetadataStore",
		createMetadataStore: () =>
			createTursoMetadataStore({ client, projectId: "proj_1" }),
	});
});
