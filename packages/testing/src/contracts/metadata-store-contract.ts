import { describe, expect, it } from "vitest";
import type { MinimalBlobEntry, MinimalMetadataStore } from "../types/contracts";

export interface MetadataStoreContractOptions {
	name: string;
	/** Creates a fresh, empty metadata store for each scenario. */
	createMetadataStore: () =>
		| Promise<MinimalMetadataStore>
		| MinimalMetadataStore;
	/** Optional per-scenario teardown (clears any persisted state). */
	cleanup?: () => Promise<void> | void;
	/** A canonical path the store treats as a valid manifest key. */
	samplePath?: string;
}

const DEFAULT_PATH = ".tekmemo/memory/core.md";

function makeEntry(sha = "a".repeat(64)): MinimalBlobEntry {
	return { sha256: sha, blobKey: sha, sizeBytes: 42 };
}

/**
 * Contract suite for the provider-neutral `MetadataStore`: the
 * canonical-file manifest of path → `BlobEntry`. Any metadata backend
 * (Turso/libSQL, and future portable stores) must pass this to satisfy core's
 * `RemoteBlobMemoryStore` manifest half.
 *
 * Mirrors the embedder/reranker/extractor/memory-store contract family: a
 * stable name, a factory, and the behavioral invariants the runtime depends on
 * (upsert→get round-trip, missing → `undefined`, idempotent remove, upsert
 * replaces).
 */
export function defineMetadataStoreContractTests(
	options: MetadataStoreContractOptions,
): void {
	const path = options.samplePath ?? DEFAULT_PATH;

	describe(`${options.name} MetadataStore contract`, () => {
		it("returns undefined for a path that was never written", async () => {
			const store = await options.createMetadataStore();
			try {
				expect(await store.getEntry(path)).toBeUndefined();
			} finally {
				await options.cleanup?.();
			}
		});

		it("round-trips an upserted entry", async () => {
			const store = await options.createMetadataStore();
			try {
				const entry = makeEntry();
				await store.upsertEntry(path, entry);
				const got = await store.getEntry(path);
				expect(got).toEqual(entry);
			} finally {
				await options.cleanup?.();
			}
		});

		it("replaces the entry when upserted twice on the same path", async () => {
			const store = await options.createMetadataStore();
			try {
				const first = makeEntry("b".repeat(64));
				const second = makeEntry("c".repeat(64));
				await store.upsertEntry(path, first);
				await store.upsertEntry(path, second);
				expect(await store.getEntry(path)).toEqual(second);
			} finally {
				await options.cleanup?.();
			}
		});

		it("makes remove idempotent (removing a missing path is a no-op)", async () => {
			const store = await options.createMetadataStore();
			try {
				await expect(store.removeEntry(path)).resolves.toBeUndefined();
				// A real entry then removed twice stays idempotent.
				await store.upsertEntry(path, makeEntry());
				await store.removeEntry(path);
				await expect(store.removeEntry(path)).resolves.toBeUndefined();
				expect(await store.getEntry(path)).toBeUndefined();
			} finally {
				await options.cleanup?.();
			}
		});

		it("removes a written entry", async () => {
			const store = await options.createMetadataStore();
			try {
				await store.upsertEntry(path, makeEntry());
				await store.removeEntry(path);
				expect(await store.getEntry(path)).toBeUndefined();
			} finally {
				await options.cleanup?.();
			}
		});
	});
}
