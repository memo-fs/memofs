import { defineBlobClientContractTests } from "@memofs/testing";
import { describe } from "vitest";
import { createR2BlobClient } from "../src/index";

/**
 * Fake R2 bucket: content-addressed by key (=== sha256), mirrors the real
 * `R2Bucket` surface `createR2BlobClient` calls (get/put/delete). Models the
 * cloud's `fakeR2Bucket` test helper. The real R2 *binding* is exercised by the
 * cloud's Miniflare runtime-worker test in — the honest place for a
 * binding-level test; here we unit-test our adapter logic against the surface
 * the binding exposes.
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

describe("R2 blob client", () => {
	// Fresh fake bucket per scenario so the contract's isolation assumption holds.
	defineBlobClientContractTests({
		name: "createR2BlobClient",
		createBlobClient: () =>
			createR2BlobClient({
				binding: createFakeR2Bucket().bucket as never,
			}),
	});
});
