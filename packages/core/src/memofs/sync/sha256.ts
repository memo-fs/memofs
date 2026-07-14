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
