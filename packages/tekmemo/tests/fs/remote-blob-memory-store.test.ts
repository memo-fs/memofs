import { describe, expect, it } from "vitest";
import {
	type BlobClient,
	type BlobEntry,
	CORE_MEMORY_PATH,
	hashBytesHex,
	type MetadataStore,
	MemoryNotFoundError,
	MemoryPathError,
	NOTES_MEMORY_PATH,
	RemoteBlobMemoryStore,
} from "../../src/index";

/**
 * In-memory fake BlobClient for tests: opaque-keyed bytes, mirrors what an R2
 * binding provides.
 */
function createFakeBlobClient(): BlobClient & {
	blobs: Map<string, ArrayBuffer>;
} {
	const blobs = new Map<string, ArrayBuffer>();
	return {
		blobs,
		async get(key) {
			return blobs.get(key) ?? null;
		},
		async put(key, body) {
			const buf = await toBuffer(body);
			blobs.set(key, buf);
		},
		async delete(key) {
			blobs.delete(key);
		},
	};
}

/** In-memory fake MetadataStore: path → entry. */
function createFakeMetadataStore(): MetadataStore & {
	entries: Map<string, BlobEntry>;
} {
	const entries = new Map<string, BlobEntry>();
	return {
		entries,
		async getEntry(path) {
			return entries.get(path);
		},
		async upsertEntry(path, entry) {
			entries.set(path, entry);
		},
		async removeEntry(path) {
			entries.delete(path);
		},
	};
}

/** Resolves a BufferSource (ArrayBuffer / typed-array view) or stream to an ArrayBuffer. */
async function toBuffer(body: BufferSource | ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
	if (body instanceof ArrayBuffer) return body;
	if (ArrayBuffer.isView(body)) {
		const view = body as Uint8Array;
		// Copy into a standalone ArrayBuffer so the stored bytes are stable.
		const copy = new ArrayBuffer(view.byteLength);
		new Uint8Array(copy).set(view);
		return copy;
	}
	const stream = body as ReadableStream<Uint8Array>;
	const reader = stream.getReader();
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
	const view = new Uint8Array(out);
	let offset = 0;
	for (const chunk of chunks) {
		view.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}

function createStore() {
	const blobs = createFakeBlobClient();
	const metadata = createFakeMetadataStore();
	const store = new RemoteBlobMemoryStore({
		blobClient: blobs,
		metadata,
		rootKey: "test-project",
	});
	return { store, blobs, metadata };
}

describe("RemoteBlobMemoryStore", () => {
	it("writes, reads and appends content", async () => {
		const { store } = createStore();
		await store.write(CORE_MEMORY_PATH, "hello");
		await store.append(CORE_MEMORY_PATH, " world");

		expect(await store.read(CORE_MEMORY_PATH)).toBe("hello world");
	});

	it("throws a typed MemoryNotFoundError for missing files", async () => {
		const { store } = createStore();
		await expect(store.read(CORE_MEMORY_PATH)).rejects.toBeInstanceOf(
			MemoryNotFoundError,
		);
	});

	it("reports existence from the manifest", async () => {
		const { store } = createStore();
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(false);
		await store.write(CORE_MEMORY_PATH, "x");
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(true);
	});

	it("delete is idempotent and removes the manifest row", async () => {
		const { store, metadata } = createStore();
		await store.write(CORE_MEMORY_PATH, "x");
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(true);
		await store.delete(CORE_MEMORY_PATH);
		expect(await store.exists(CORE_MEMORY_PATH)).toBe(false);
		expect(metadata.entries.has(CORE_MEMORY_PATH)).toBe(false);
		// Idempotent re-delete is a no-op.
		await expect(store.delete(CORE_MEMORY_PATH)).resolves.toBeUndefined();
	});

	it("content-addresses blobs: identical content shares one blob key", async () => {
		const { store, blobs, metadata } = createStore();
		const content = "same bytes";
		await store.write(CORE_MEMORY_PATH, content);
		await store.write(NOTES_MEMORY_PATH, content);

		// Both paths point at the same sha256-keyed blob.
		const core = metadata.entries.get(CORE_MEMORY_PATH);
		const notes = metadata.entries.get(NOTES_MEMORY_PATH);
		expect(core?.blobKey).toBe(notes?.blobKey);
		expect(blobs.blobs.size).toBe(1);
		expect(core?.sha256).toHaveLength(64);
	});

	it("blob key equals the sha256 of the content (matches the cloud replica)", async () => {
		const { store, metadata } = createStore();
		const content = "memory runtime on hosted infra";
		await store.write(CORE_MEMORY_PATH, content);

		const entry = metadata.entries.get(CORE_MEMORY_PATH);
		const expected = await hashBytesHex(
			new TextEncoder().encode(content) as Uint8Array<ArrayBuffer>,
		);
		expect(entry?.blobKey).toBe(expected);
		expect(entry?.sha256).toBe(expected);
		expect(entry?.sizeBytes).toBe(new Blob([content]).size);
	});

	it("append on a missing file writes the content as the new blob", async () => {
		const { store } = createStore();
		await store.append(NOTES_MEMORY_PATH, "first");
		expect(await store.read(NOTES_MEMORY_PATH)).toBe("first");
	});

	it("never deletes the blob on path delete (content-addressed, possibly shared)", async () => {
		const { store, blobs } = createStore();
		await store.write(CORE_MEMORY_PATH, "shared content");
		const blobKey = Array.from(blobs.blobs.keys())[0];
		await store.delete(CORE_MEMORY_PATH);
		// Blob remains — GC is operational, not per-path.
		expect(blobs.blobs.has(blobKey)).toBe(true);
	});

	it("surfaces MemoryNotFoundError when the manifest row exists but the blob is gone", async () => {
		const { store, blobs, metadata } = createStore();
		await store.write(CORE_MEMORY_PATH, "x");
		const key = metadata.entries.get(CORE_MEMORY_PATH)?.blobKey;
		expect(key).toBeDefined();
		if (key) await blobs.delete(key);
		await expect(store.read(CORE_MEMORY_PATH)).rejects.toBeInstanceOf(
			MemoryNotFoundError,
		);
	});

	it("rejects unsupported paths at runtime", async () => {
		const { store } = createStore();
		await expect(
			store.write("../secret" as typeof CORE_MEMORY_PATH, "x"),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	it("rejects null-byte paths", async () => {
		const { store } = createStore();
		await expect(
			store.exists(".tekmemo/memory/core.md\0" as typeof CORE_MEMORY_PATH),
		).rejects.toBeInstanceOf(MemoryPathError);
	});
});

describe("hashBytesHex", () => {
	it("produces the canonical 64-char lowercase sha256 hex", async () => {
		// sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
		expect(
			await hashBytesHex(
				new TextEncoder().encode("hello") as Uint8Array<ArrayBuffer>,
			),
		).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
	});
});
