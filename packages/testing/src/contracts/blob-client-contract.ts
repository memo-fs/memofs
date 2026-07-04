import { describe, expect, it } from "vitest";
import type { MinimalBlobClient } from "../types/contracts";

export interface BlobClientContractOptions {
	name: string;
	/** Creates a fresh, empty blob client for each scenario. */
	createBlobClient: () => Promise<MinimalBlobClient> | MinimalBlobClient;
	/** Optional per-scenario teardown (clears any persisted state). */
	cleanup?: () => Promise<void> | void;
}

/**
 * Contract suite for the provider-neutral `BlobClient`: opaque-keyed
 * get/put/delete of raw bytes. Any blob backend (R2, S3, GCS, MinIO) must pass
 * this to satisfy core's `RemoteBlobMemoryStore` blob-storage half.
 *
 * Mirrors the embedder/reranker/extractor/memory-store contract family: a
 * stable name, a factory, and the behavioral invariants the runtime depends on
 * (content-addressed writes round-trip, missing reads → `null`, deletes are
 * idempotent, `put` overwrites a key).
 */
export function defineBlobClientContractTests(
	options: BlobClientContractOptions,
): void {
	describe(`${options.name} BlobClient contract`, () => {
		it("round-trips a written blob", async () => {
			const client = await options.createBlobClient();
			try {
				const bytes = new TextEncoder().encode("memory bytes");
				await client.put("key-1", bytes);
				const got = await client.get("key-1");
				expect(got).toBeInstanceOf(ArrayBuffer);
				expect(new TextDecoder().decode(got as ArrayBuffer)).toBe(
					"memory bytes",
				);
			} finally {
				await options.cleanup?.();
			}
		});

		it("returns null for a missing key", async () => {
			const client = await options.createBlobClient();
			try {
				const got = await client.get("absent-key");
				expect(got).toBeNull();
			} finally {
				await options.cleanup?.();
			}
		});

		it("overwrites when put is called twice with the same key", async () => {
			const client = await options.createBlobClient();
			try {
				await client.put("dup", new TextEncoder().encode("first"));
				await client.put("dup", new TextEncoder().encode("second"));
				const got = await client.get("dup");
				expect(new TextDecoder().decode(got as ArrayBuffer)).toBe(
					"second",
				);
			} finally {
				await options.cleanup?.();
			}
		});

		it("makes delete idempotent (deleting a missing key is a no-op)", async () => {
			const client = await options.createBlobClient();
			try {
				await expect(client.delete("never-written")).resolves.toBeUndefined();
				// A real key then deleted twice also stays idempotent.
				await client.put("once", new TextEncoder().encode("x"));
				await client.delete("once");
				await expect(client.delete("once")).resolves.toBeUndefined();
				expect(await client.get("once")).toBeNull();
			} finally {
				await options.cleanup?.();
			}
		});

		it("deletes a written blob", async () => {
			const client = await options.createBlobClient();
			try {
				await client.put("gone", new TextEncoder().encode("bye"));
				await client.delete("gone");
				expect(await client.get("gone")).toBeNull();
			} finally {
				await options.cleanup?.();
			}
		});
	});
}
