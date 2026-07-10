import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { defineMetadataStoreContractTests } from "@memofs/testing";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import { createTursoMetadataStore } from "../src/index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

let dbFile: string;
let client: ReturnType<typeof createClient>;

beforeAll(async () => {
	dbFile = path.resolve(
		__dirname,
		`../test-${Math.random().toString(36).slice(2)}.db`,
	);
	client = createClient({ url: `file:${dbFile}`, timeout: 5000 });
});

afterAll(async () => {
	client.close();
	await fs.rm(dbFile, { force: true });
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
