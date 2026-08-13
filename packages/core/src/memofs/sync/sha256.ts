/**
 * sha256 hex helper for file-replication sync.
 *
 * Sync identity is the sha256 of a canonical file's content. The cloud-client
 * contract treats this as a 64-character lowercase hex digest.
 *
 * @public
 */

import { hashBytesHex } from "../../core/stores/remote-blob-memory-store";

/**
 * Computes the sha256 hex digest of a UTF-8 string.
 *
 * @param value - The string to hash.
 * @returns A promise for a 64-character lowercase hexadecimal digest.
 *
 * @public
 */
export function sha256Hex(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const buffer = new ArrayBuffer(encoded.byteLength);
	const bytes = new Uint8Array(buffer);
	bytes.set(encoded);
	return hashBytesHex(bytes);
}

/**
 * Computes the sha256 hex digest of a byte buffer's exact bytes (no
 * UTF-8 re-encoding). Use this for file-content hashing where the
 * raw bytes are the integrity unit (code-anchor content hashing).
 *
 * @param bytes - The bytes to hash.
 * @returns A promise for a 64-character lowercase hexadecimal digest.
 *
 * @public
 */
export function sha256BytesHex(bytes: Uint8Array): Promise<string> {
	// `hashBytesHex` requires an `ArrayBuffer`-backed `Uint8Array` (not
	// `SharedArrayBuffer`). `readFile` returns a `Buffer` (an
	// `ArrayBufferLike`-backed view), so copy into a fresh `ArrayBuffer` to
	// satisfy the contract without mutating the caller's bytes.
	const buffer = new ArrayBuffer(bytes.byteLength);
	const copy = new Uint8Array(buffer);
	copy.set(bytes);
	return hashBytesHex(copy);
}
