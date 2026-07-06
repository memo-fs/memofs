/**
 * AES-GCM encryption for connector tokens.
 *
 * Tokens are stored encrypted in the `connectors.encrypted_secret` column —
 * never in R2, never displayed. The Worker secret (`ENCRYPTION_KEY`)
 * derives the AES key via HKDF. The ciphertext is base64-encoded for storage.
 *
 * Uses Web Crypto (`crypto.subtle`) — available in both Workers and Node 20+,
 * so the same code runs in production + tests.
 */

/** HKDF info string for key derivation (domain separation). */
const KEY_INFO = "memofs-connector-encryption-v1";

/** Derives the AES-GCM key from the Worker secret via HKDF. */
async function deriveKey(encryptionKey: string): Promise<CryptoKey> {
	const raw = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(encryptionKey),
		{ name: "HKDF" },
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			info: new TextEncoder().encode(KEY_INFO),
			salt: new Uint8Array(0),
		},
		raw,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/** Encrypts a token → base64 ciphertext (iv + encrypted data). */
export async function encryptToken(
	plaintext: string,
	encryptionKey: string,
): Promise<string> {
	const key = await deriveKey(encryptionKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		new TextEncoder().encode(plaintext),
	);
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), iv.length);
	return base64Encode(combined);
}

/** Decrypts a base64 ciphertext → plaintext token. */
export async function decryptToken(
	ciphertext: string,
	encryptionKey: string,
): Promise<string> {
	const key = await deriveKey(encryptionKey);
	const combined = base64Decode(ciphertext);
	const iv = combined.slice(0, 12);
	const data = combined.slice(12);
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		data,
	);
	return new TextDecoder().decode(plaintext);
}

/** Base64-encodes a Uint8Array (Workers-compatible — no Node Buffer). */
function base64Encode(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

/** Base64-decodes a string → Uint8Array. */
function base64Decode(str: string): Uint8Array {
	const binary = atob(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

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
 * `salt` is the `API_KEY_SALT` Worker binding (empty string when unset —
 * dev only; production MUST set it). The raw key is the full `tm_…` token.
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
