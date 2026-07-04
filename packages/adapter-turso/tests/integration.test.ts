import { createClient } from "@libsql/client";
import { createR2BlobClient } from "@tekmemo/adapter-r2";
import {
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
	RemoteBlobMemoryStore,
} from "@tekmemo/core";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTursoMetadataStore } from "../src/index";

/**
 * Integration: proves the two **decoupled** adapter packages (`@tekmemo/adapter-r2`
 * blob + `@tekmemo/adapter-turso` metadata) compose cleanly through core's
 * provider-neutral `RemoteBlobMemoryStore` — the shape, not a bundled
 * adapter. This is the only place the two packages meet in tests; there is no
 * runtime coupling between them.
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

/** Fake R2 bucket — mirrors the cloud's `fakeR2Bucket` helper + adapter-r2's suite. */
function createFakeR2Bucket() {
	const objects = new Map<string, ArrayBuffer>();
	const bucket = {
		async get(key: string) {
			const body = objects.get(key);
			return body === undefined ? null : { arrayBuffer: async () => body };
		},
		async put(key: string, body: BodyInit) {
			objects.set(key, await toArrayBuffer(body));
		},
		async delete(key: string) {
			objects.delete(key);
		},
	};
	return { bucket, objects };
}

async function toArrayBuffer(body: BodyInit): Promise<ArrayBuffer> {
	if (body instanceof ArrayBuffer) return body;
	if (ArrayBuffer.isView(body)) {
		const view = body as Uint8Array;
		const copy = new ArrayBuffer(view.byteLength);
		new Uint8Array(copy).set(view);
		return copy;
	}
	throw new Error("Unsupported body type in fake R2 bucket");
}

let client: ReturnType<typeof createClient>;

beforeAll(() => {
	client = createClient({ url: ":memory:" });
});

beforeEach(async () => {
	await client.execute("DROP TABLE IF EXISTS project_files");
	for (const stmt of PROJECT_FILES_DDL) {
		await client.execute(stmt);
	}
});

describe("R2 blob + Turso metadata compose through RemoteBlobMemoryStore", () => {
	it("round-trips a write through both adapters into R2 + project_files", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});

		await store.write(CORE_MEMORY_PATH, "hosted memory content");

		const entry = await client.execute({
			sql: "SELECT sha256, r2_key FROM project_files WHERE project_id = ? AND path = ?",
			args: ["proj_1", CORE_MEMORY_PATH],
		});
		const sha = String(entry.rows[0]?.sha256);
		expect(sha).toHaveLength(64);
		expect(String(entry.rows[0]?.r2_key)).toBe(sha); // r2_key === sha256
		expect(objects.has(sha)).toBe(true);
		expect(await store.read(CORE_MEMORY_PATH)).toBe("hosted memory content");
	});

	it("append is a read-modify-write across both adapters", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});

		await store.write(NOTES_MEMORY_PATH, "first");
		await store.append(NOTES_MEMORY_PATH, " second");

		expect(await store.read(NOTES_MEMORY_PATH)).toBe("first second");
		// Two distinct immutable blobs (content-addressed).
		expect(objects.size).toBe(2);
	});

	it("shares one R2 object across two paths with identical content", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});

		await store.write(CORE_MEMORY_PATH, "same bytes");
		await store.write(NOTES_MEMORY_PATH, "same bytes");
		expect(objects.size).toBe(1);
	});

	it("isolates manifests by projectId", async () => {
		const { bucket } = createFakeR2Bucket();
		const blobClient = createR2BlobClient({ binding: bucket as never });
		const storeA = new RemoteBlobMemoryStore({
			blobClient,
			metadata: createTursoMetadataStore({ client, projectId: "proj_a" }),
			rootKey: "proj_a",
		});
		const storeB = new RemoteBlobMemoryStore({
			blobClient,
			metadata: createTursoMetadataStore({ client, projectId: "proj_b" }),
			rootKey: "proj_b",
		});

		await storeA.write(CORE_MEMORY_PATH, "project A");
		await storeB.write(CORE_MEMORY_PATH, "project B");

		expect(await storeA.read(CORE_MEMORY_PATH)).toBe("project A");
		expect(await storeB.read(CORE_MEMORY_PATH)).toBe("project B");
	});
});
