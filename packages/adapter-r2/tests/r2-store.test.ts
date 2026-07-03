import { createClient } from "@libsql/client";
import {
	type BlobEntry,
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
	RemoteBlobMemoryStore,
} from "@tekmemo/core";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createR2BlobClient, createTursoMetadataStore } from "../src/index";

/**
 * Fake R2 bucket: content-addressed by key (=== sha256), mirrors the real
 * `R2Bucket` surface `createR2BlobClient` calls (get/put/delete). Models on
 * `apps/cloud`'s `fakeR2Bucket` test helper.
 */
function createFakeR2Bucket() {
	const objects = new Map<string, ArrayBuffer>();
	const bucket = {
		async get(key: string) {
			const body = objects.get(key);
			return body === undefined ? null : r2Object(body);
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

/** Mimics an R2Object: only `arrayBuffer()` is consumed by the adapter. */
function r2Object(body: ArrayBuffer) {
	return { arrayBuffer: async () => body };
}

async function toArrayBuffer(body: BodyInit): Promise<ArrayBuffer> {
	if (body instanceof ArrayBuffer) return body;
	if (ArrayBuffer.isView(body)) {
		const view = body as Uint8Array;
		const copy = new ArrayBuffer(view.byteLength);
		new Uint8Array(copy).set(view);
		return copy;
	}
	if (typeof Blob !== "undefined" && body instanceof Blob) {
		return body.arrayBuffer();
	}
	// ReadableStream
	if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
		const reader = (body as ReadableStream<Uint8Array>).getReader();
		const chunks: Uint8Array[] = [];
		let total = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				chunks.push(value);
				total += value.byteLength;
			}
		}
		const out = new ArrayBuffer(total);
		const merged = new Uint8Array(out);
		let offset = 0;
		for (const chunk of chunks) {
			merged.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return out;
	}
	throw new Error("Unsupported body type in fake R2 bucket");
}

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

describe("R2 blob client + Turso metadata store", () => {
	let client: ReturnType<typeof createClient>;

	beforeAll(() => {
		// `:memory:` is fine here — this suite exercises metadata CRUD, not the
		// interactive `BEGIN IMMEDIATE` transactions that need a file-backed DB.
		client = createClient({ url: ":memory:" });
	});

	beforeEach(async () => {
		await client.execute("DROP TABLE IF EXISTS project_files");
		// Each statement must be its own `execute` — better-sqlite3's `prepare`
		// (the local driver under libSQL) rejects multi-statement strings. The
		// cloud's `createTestDb` splits migrations on `--> statement-breakpoint`
		// for the same reason and uses `client.batch(...)`.
		for (const stmt of PROJECT_FILES_DDL) {
			await client.execute(stmt);
		}
	});

	it("round-trips a write through RemoteBlobMemoryStore into R2 + project_files", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});

		await store.write(CORE_MEMORY_PATH, "hosted memory content");

		// Manifest row landed with the content-addressed key.
		const entry = await client.execute({
			sql: "SELECT sha256, r2_key, size_bytes FROM project_files WHERE project_id = ? AND path = ?",
			args: ["proj_1", CORE_MEMORY_PATH],
		});
		expect(entry.rows.length).toBe(1);
		const sha = String(entry.rows[0]?.sha256);
		expect(sha).toHaveLength(64);
		expect(String(entry.rows[0]?.r2_key)).toBe(sha); // r2_key === sha256

		// Blob landed in R2 under that key.
		expect(objects.has(sha)).toBe(true);

		// And reads back through the store.
		expect(await store.read(CORE_MEMORY_PATH)).toBe("hosted memory content");
	});

	it("read throws MemoryNotFoundError for a missing path", async () => {
		const { bucket } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});
		await expect(store.read(CORE_MEMORY_PATH)).rejects.toThrow(/not found/i);
	});

	it("append does a read-modify-write, producing a new blob + manifest row", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});

		await store.write(NOTES_MEMORY_PATH, "first");
		await store.append(NOTES_MEMORY_PATH, " second");

		expect(await store.read(NOTES_MEMORY_PATH)).toBe("first second");
		// Two distinct blobs written (content-addressed, immutable).
		expect(objects.size).toBe(2);
	});

	it("exists reflects the manifest only", async () => {
		const { bucket } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(false);
		await store.write(CORE_MEMORY_PATH, "x");
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(true);
	});

	it("delete removes the manifest row but leaves the (content-addressed, shared) blob", async () => {
		const { bucket, objects } = createFakeR2Bucket();
		const store = new RemoteBlobMemoryStore({
			blobClient: createR2BlobClient({ binding: bucket as never }),
			metadata: createTursoMetadataStore({ client, projectId: "proj_1" }),
			rootKey: "proj_1",
		});
		await store.write(CORE_MEMORY_PATH, "x");
		const key = Array.from(objects.keys())[0];
		expect(key).toBeDefined();
		await store.delete(CORE_MEMORY_PATH);

		expect(await store.exists(CORE_MEMORY_PATH)).toBe(false);
		expect(objects.has(key!)).toBe(true); // blob not GC'd
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

	it("isolates manifests by projectId (two projects, same path)", async () => {
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

	it("getEntry reads back exactly the shape written", async () => {
		const { bucket } = createFakeR2Bucket();
		const metadata = createTursoMetadataStore({
			client,
			projectId: "proj_1",
		});
		const entry: BlobEntry = {
			sha256: "a".repeat(64),
			blobKey: "a".repeat(64),
			sizeBytes: 42,
		};
		await metadata.upsertEntry(CORE_MEMORY_PATH, entry);
		const got = await metadata.getEntry(CORE_MEMORY_PATH);
		expect(got).toEqual(entry);
		expect(await metadata.getEntry(NOTES_MEMORY_PATH)).toBeUndefined();
	});
});
