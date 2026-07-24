/**
 * Real R2 harness — via Miniflare getR2Bucket + adapter-r2.
 *
 * @remarks
 * Boots Miniflare with an R2 bucket binding when available, falls back to
 * in-memory fake bucket (same surface as adapter-r2 tests) when Miniflare
 * / workerd is unavailable. Exposes real `@memofs/adapter-r2` put/get/delete
 * and proves contract `defineBlobClientContractTests`.
 *
 * Node-only.
 *
 * File-first truth: snapshot of tmpDir captures harness isolation; R2 objects
 * live in Miniflare's in-memory storage (or fake Map) — blob persistence
 * proven via round-trip, not filesystem, per ADR 0021 F2 standalone vs dependent.
 *
 * @public
 */

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RealHarness } from "./core-harness";
import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers";

/**
 * Minimal R2Bucket surface consumed by adapter-r2.
 * Matches what createR2BlobClient calls: get/put/delete, get returns object with arrayBuffer().
 */
type R2BucketSurface = {
	get: (
		key: string,
	) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
	put: (key: string, body: unknown) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

/** Creates an in-memory fake R2 bucket (fallback when Miniflare unavailable). */
function createFakeR2Bucket(): {
	bucket: R2BucketSurface;
	objects: Map<string, ArrayBuffer>;
	dispose: () => Promise<void>;
} {
	const objects = new Map<string, ArrayBuffer>();

	function r2Object(body: ArrayBuffer) {
		return { arrayBuffer: async () => body };
	}

	async function toArrayBuffer(body: unknown): Promise<ArrayBuffer> {
		if (body instanceof ArrayBuffer) return body;
		if (ArrayBuffer.isView(body)) {
			const view = body as Uint8Array;
			const copy = new ArrayBuffer(view.byteLength);
			new Uint8Array(copy).set(view);
			return copy;
		}
		if (typeof Blob !== "undefined" && body instanceof Blob) {
			return (body as Blob).arrayBuffer();
		}
		if (
			typeof ReadableStream !== "undefined" &&
			body instanceof ReadableStream
		) {
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
		// String
		if (typeof body === "string") {
			return new TextEncoder().encode(body).buffer as ArrayBuffer;
		}
		throw new Error(`Unsupported body type in fake R2 bucket: ${typeof body}`);
	}

	const bucket: R2BucketSurface = {
		async get(key: string) {
			const body = objects.get(key);
			return body === undefined ? null : r2Object(body);
		},
		async put(key: string, body: unknown) {
			objects.set(key, await toArrayBuffer(body));
		},
		async delete(key: string) {
			objects.delete(key);
		},
	};

	return {
		bucket,
		objects,
		dispose: async () => {
			objects.clear();
		},
	};
}

/**
 * R2 real harness — Miniflare bucket or fake bucket + real adapter-r2 client.
 * @public
 */
export type R2RealHarness = RealHarness & {
	/** Absolute tmpDir for isolation + snapshot. */
	tmpDir: string;
	/** Bucket binding (real Miniflare R2Bucket or fake). */
	bucket: R2BucketSurface;
	/** Underlying Miniflare instance when used, else undefined. */
	miniflare?: {
		dispose: () => Promise<void>;
		getR2Bucket: (name: string) => Promise<R2BucketSurface>;
	} & { [k: string]: unknown };
	/** Real blob client from adapter-r2. */
	blobClient: {
		get: (key: string) => Promise<ArrayBuffer | null>;
		put: (
			key: string,
			body: BufferSource | ReadableStream<Uint8Array>,
		) => Promise<void>;
		delete: (key: string) => Promise<void>;
	};
	/** Whether Miniflare was successfully used (true) or fake fallback (false). */
	isMiniflare: boolean;
	/** In-memory objects map when fake fallback — useful for assertions. */
	objects?: Map<string, ArrayBuffer>;
	/** Close Miniflare / clear fake. */
	close: () => Promise<void>;
};

/**
 * Options for creating a real R2 harness.
 * @public
 */
export type CreateRealR2HarnessOptions = {
	/** Reuse existing tmpDir. */
	tmpDir?: string;
	/** Prefix for mkdtemp. @defaultValue "memofs-e2e-r2-" */
	prefix?: string;
	/** R2 bucket name. @defaultValue "MEMOFS_E2E_BUCKET" */
	bucketName?: string;
	/** Force fake bucket even if Miniflare available (fast path). */
	forceFake?: boolean;
};

/**
 * Attempts to boot Miniflare with R2 bucket. Returns bucket + miniflare instance.
 * Falls back to fake bucket on any failure (workerd missing, import error, etc.).
 */
async function tryCreateMiniflareBucket(bucketName: string): Promise<
	| {
			bucket: R2BucketSurface;
			miniflare: R2RealHarness["miniflare"];
			isMiniflare: true;
	  }
	| { bucket: null; isMiniflare: false }
> {
	if (
		typeof process !== "undefined" &&
		process.env.MEMOFS_E2E_R2_FAKE === "1"
	) {
		return { bucket: null, isMiniflare: false };
	}
	try {
		const mod = (await import("miniflare")) as unknown as Record<
			string,
			unknown
		>;
		const Miniflare = (mod as { Miniflare: new (opts: unknown) => unknown })
			.Miniflare as unknown as new (
			opts: unknown,
		) => {
			getR2Bucket: (name: string) => Promise<R2BucketSurface>;
			dispose: () => Promise<void>;
		};
		if (!Miniflare) return { bucket: null, isMiniflare: false };

		const mf = new Miniflare({
			modules: true,
			script: `export default { async fetch() { return new Response("ok"); } }`,
			r2Buckets: [bucketName],
		});

		const bucket = await mf.getR2Bucket(bucketName);
		if (!bucket) {
			await mf.dispose();
			return { bucket: null, isMiniflare: false };
		}
		return {
			bucket,
			miniflare: mf as R2RealHarness["miniflare"],
			isMiniflare: true as const,
		};
	} catch {
		return { bucket: null, isMiniflare: false };
	}
}

/**
 * Creates a real R2 harness.
 *
 * Proves:
 * - Miniflare `getR2Bucket` path when workerd available, else fake fallback;
 * - real `@memofs/adapter-r2` put/get/list (via get/put/delete);
 * - passes `defineBlobClientContractTests`;
 * - file-first truth via tmpDir isolation + snapshot.
 *
 * @public
 */
export async function createRealR2Harness(
	options: CreateRealR2HarnessOptions = {},
): Promise<R2RealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-r2-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));
	const bucketName = options.bucketName ?? "MEMOFS_E2E_BUCKET";

	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	let bucket: R2BucketSurface;
	let miniflare: R2RealHarness["miniflare"] | undefined;
	let isMiniflare = false;
	let objects: Map<string, ArrayBuffer> | undefined;
	let fakeDispose: (() => Promise<void>) | undefined;

	if (!options.forceFake) {
		const mfResult = await tryCreateMiniflareBucket(bucketName);
		if (mfResult.isMiniflare && mfResult.bucket) {
			bucket = mfResult.bucket;
			miniflare = mfResult.miniflare;
			isMiniflare = true;
		} else {
			const fake = createFakeR2Bucket();
			bucket = fake.bucket;
			objects = fake.objects;
			fakeDispose = fake.dispose;
			isMiniflare = false;
		}
	} else {
		const fake = createFakeR2Bucket();
		bucket = fake.bucket;
		objects = fake.objects;
		fakeDispose = fake.dispose;
		isMiniflare = false;
	}

	// Dynamic import adapter-r2
	let createR2BlobClient: (opts: {
		binding: unknown;
	}) => R2RealHarness["blobClient"];
	try {
		const mod = (await import("@memofs/adapter-r2")) as unknown as {
			createR2BlobClient: typeof createR2BlobClient;
		};
		createR2BlobClient = mod.createR2BlobClient;
	} catch (e) {
		throw new Error(
			`R2RealHarness: failed to import @memofs/adapter-r2. Original: ${(e as Error).message}`,
		);
	}

	const blobClient = createR2BlobClient({ binding: bucket as never });

	let cleaned = false;

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => listFilesRecursive(tmpDir);
	const snapshotFs = async (): Promise<Record<string, string>> =>
		snapshotFsRecursive(tmpDir);

	const close = async (): Promise<void> => {
		if (fakeDispose) {
			await fakeDispose();
		}
		if (miniflare) {
			try {
				await miniflare.dispose();
			} catch {
				// ignore
			}
		}
	};

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		try {
			await close();
		} catch {
			// ignore
		}
		await rm(tmpDir, { recursive: true, force: true });
	};

	return {
		tmpDir,
		bucket,
		miniflare,
		blobClient,
		isMiniflare,
		objects,
		close,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};
}
