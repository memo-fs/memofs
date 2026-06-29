/**
 * Cloudflare R2 blob client — implements core's provider-neutral {@link BlobClient}
 * over an `R2Bucket` binding.
 *
 * The R2 coupling (the `R2Bucket` type from `@cloudflare/workers-types`) is
 * quarantined here, never in core (ADR 0012). A future S3/GCS adapter implements
 * the same `BlobClient` interface and the runtime is unchanged.
 *
 * Content addressing: this adapter writes blobs keyed by their sha256 (the blob
 * key core's `RemoteBlobMemoryStore` computes), matching the cloud file replica's
 * `r2_key === sha256` layout exactly — so the runtime and the sync handler share
 * the *same* R2 objects, not a parallel store (ADR 0012 reuse sub-decision).
 *
 * @public
 */

import type { BlobClient } from "@tekbreed/tekmemo";

/**
 * Options for {@link createR2BlobClient}.
 *
 * @public
 */
export interface CreateR2BlobClientOptions {
	/** The Cloudflare R2 bucket binding (`env.BLOBS`). */
	binding: R2Bucket;
}

/**
 * Creates a {@link BlobClient} backed by a Cloudflare R2 bucket binding.
 *
 * @example
 * ```ts
 * import { createR2BlobClient } from "@tekbreed/tekmemo-adapter-r2";
 *
 * const blobClient = createR2BlobClient({ binding: env.BLOBS });
 * ```
 *
 * @public
 */
export function createR2BlobClient(options: CreateR2BlobClientOptions): BlobClient {
	const { binding } = options;

	return {
		async get(key) {
			const object = await binding.get(key);
			if (object === null) return null;
			return object.arrayBuffer();
		},
		async put(key, body) {
			// R2's `put` accepts ArrayBuffer | ArrayBufferView | ReadableStream |
			// string | null | Blob. The contract's `BufferSource | ReadableStream`
			// is a strict subset; cast to R2's union. Content-addressed
			// (key === sha256), so idempotent.
			await binding.put(
				key,
				body as
					| ArrayBuffer
					| ArrayBufferView
					| ReadableStream<Uint8Array>
					| string
					| null,
			);
		},
		async delete(key) {
			// Idempotent: deleting a missing key is a no-op on R2.
			await binding.delete(key);
		},
	};
}
