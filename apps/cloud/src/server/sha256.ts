/**
 * Worker-safe sha256 hex helper (Web Crypto, not `node:crypto`).
 *
 * The core package's `sha256Hex` (`packages/tekmemo/src/tekmemo/sync/sha256.ts`)
 * uses `node:crypto` — fine for the local runtime, but `node:crypto` is not the
 * path we want inside a Cloudflare Worker even with `nodejs_compat`. Web Crypto
 * (`crypto.subtle.digest`) is the native Worker API and the idiomatic choice here.
 *
 * Two consumers in the cloud:
 *   1. API-key authentication (`middleware/auth.ts`): `keyHash = sha256(salt + ":" + rawKey)`,
 *      looked up against `api_keys.key_hash` (ADR 0006; schema §api_keys).
 *   2. Sync handlers (P2.3): verifying uploaded blob content matches the sha256
 *      the client claimed — the content-addressed identity primitive (§4.1).
 *
 * Both must produce a 64-char lowercase hex digest identical to what the local
 * runtime's `sha256Hex` produces for the same input, so the two implementations
 * are wire-compatible (the same bytes hash to the same digest across Worker +
 * Node). SHA-256 is SHA-256 regardless of implementation; only the I/O shape
 * differs (buffer vs stream vs string).
 *
 * @see packages/tekmemo/src/tekmemo/sync/sha256.ts — the Node-side counterpart.
 */

/**
 * Computes the sha256 hex digest of a UTF-8 string via Web Crypto.
 *
 * @returns A 64-character lowercase hexadecimal digest.
 */
export async function sha256Hex(value: string): Promise<string> {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return bufferToHex(digest);
}

/**
 * Computes the salted API-key lookup hash: `sha256(salt + ":" + rawKey)`.
 *
 * `salt` is the `TEKMEMO_API_KEY_SALT` Worker binding (empty string when unset —
 * dev only; production MUST set it). The raw key is the full `tk_live_…` token.
 * The result is stored in `api_keys.key_hash` at provisioning time and looked up
 * here on every authenticated request.
 *
 * @see apps/cloud/src/db/schema.ts — `api_keys.key_hash` column doc.
 */
export async function hashApiKey(
	rawKey: string,
	salt: string,
): Promise<string> {
	return sha256Hex(`${salt}:${rawKey}`);
}

/** Converts an `ArrayBuffer` to a lowercase hex string. */
function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = "";
	for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
	return hex;
}
