/**
 * sha256 hex helper for file-replication sync.
 *
 * Sync identity is the sha256 of a canonical file's content. The cloud-client
 * contract treats this as a 64-character lowercase hex digest.
 *
 * @public
 */

import { createHash } from "node:crypto";

/**
 * Computes the sha256 hex digest of a UTF-8 string.
 *
 * @param value - The string to hash.
 * @returns A 64-character lowercase hexadecimal digest.
 *
 * @public
 */
export function sha256Hex(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}
