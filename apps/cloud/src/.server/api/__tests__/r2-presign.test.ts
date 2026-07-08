import { describe, expect, it } from "vitest";
import {
	PresignConfigError,
	presign,
	presignConfigFromEnv,
	presignMany,
} from "../r2-presign";

/**
 * R2 presign helper tests.
 *
 * The signed URL is produced by SigV4 query-string signing; given fixed
 * credentials + a fixed signing datetime it is deterministic, but the datetime
 * defaults to "now" inside `AwsV4Signer`. So we assert STRUCTURE (host, path,
 * required S3 query params, method-specific shape) rather than a brittle
 * exact-string match — the signature itself is validated every time the URL is
 * used against real R2 in deploy.
 */

const CONFIG = {
	accessKeyId: "AKIA_TEST_KEY_ID",
	secretAccessKey: "test-secret-key-with-enough-length",
	endpoint: "testacct.r2.cloudflarestorage.com",
	bucket: "memofs-blobs",
} as const;

const SHA = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

function mockEnv(overrides: Partial<Env> = {}): Env {
	return {
		BLOBS: {} as unknown as Env["BLOBS"],
		DATABASE_URL: "libsql://test.turso.io",
		R2_S3_ACCESS_KEY_ID: CONFIG.accessKeyId,
		R2_S3_SECRET_ACCESS_KEY: CONFIG.secretAccessKey,
		R2_S3_ENDPOINT: CONFIG.endpoint,
		R2_BUCKET_NAME: CONFIG.bucket,
		SESSION_SECRET: "test-session-secret",
		...overrides,
	} as Env;
}

describe("presignConfigFromEnv", () => {
	it("reads all R2 bindings from the Worker env", () => {
		const cfg = presignConfigFromEnv(mockEnv());
		expect(cfg).toMatchObject({
			accessKeyId: CONFIG.accessKeyId,
			secretAccessKey: CONFIG.secretAccessKey,
			endpoint: CONFIG.endpoint,
			bucket: CONFIG.bucket,
		});
	});

	it("parses PRESIGN_TTL_SECONDS into a number", () => {
		const cfg = presignConfigFromEnv(
			mockEnv({ PRESIGN_TTL_SECONDS: "300" as any }),
		);
		expect(cfg.ttlSeconds).toBe(300);
	});

	it("returns undefined ttl for blank/invalid PRESIGN_TTL_SECONDS", () => {
		expect(
			presignConfigFromEnv(mockEnv({ PRESIGN_TTL_SECONDS: "" as any }))
				.ttlSeconds,
		).toBeUndefined();
		expect(
			presignConfigFromEnv(mockEnv({ PRESIGN_TTL_SECONDS: "garbage" as any }))
				.ttlSeconds,
		).toBeUndefined();
		expect(
			presignConfigFromEnv(mockEnv({ PRESIGN_TTL_SECONDS: "-5" as any }))
				.ttlSeconds,
		).toBeUndefined();
	});
});

describe("presign", () => {
	it("builds a PUT URL against the R2 S3 host with the content-addressed key", async () => {
		const url = await presign(CONFIG, SHA, "PUT");
		expect(url).toContain(
			`memofs-blobs.testacct.r2.cloudflarestorage.com/${SHA}`,
		);
	});

	it("includes the SigV4 query-string signature params", async () => {
		const url = await presign(CONFIG, SHA, "GET");
		// `signQuery: true` emits these query params, not an Authorization header.
		expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
		expect(url).toContain("X-Amz-Credential=");
		expect(url).toContain("X-Amz-Signature=");
		expect(url).toContain("X-Amz-Date=");
		expect(url).toContain("X-Amz-Expires=900"); // default TTL
	});

	it("respects a custom ttlSeconds in the X-Amz-Expires param", async () => {
		const url = await presign({ ...CONFIG, ttlSeconds: 60 }, SHA, "GET");
		expect(url).toContain("X-Amz-Expires=60");
	});

	it("rewrites the host when publicBaseUrl is set", async () => {
		const url = await presign(
			{ ...CONFIG, publicBaseUrl: "https://cdn.memofs.dev" },
			SHA,
			"GET",
		);
		expect(url.startsWith("https://cdn.memofs.dev/")).toBe(true);
		expect(url).not.toContain("r2.cloudflarestorage.com");
	});

	it("produces distinct signatures for PUT vs GET (method is bound)", async () => {
		const putUrl = await presign(CONFIG, SHA, "PUT");
		const getUrl = await presign(CONFIG, SHA, "GET");
		// The signature is over the canonical request which includes the method;
		// same key + different method → different X-Amz-Signature.
		const putSig = new URL(putUrl).searchParams.get("X-Amz-Signature");
		const getSig = new URL(getUrl).searchParams.get("X-Amz-Signature");
		expect(putSig).not.toBe(getSig);
	});

	it("throws PresignConfigError when credentials are missing", async () => {
		await expect(
			presign({ ...CONFIG, accessKeyId: "" }, SHA, "PUT"),
		).rejects.toBeInstanceOf(PresignConfigError);
	});

	it("throws PresignConfigError when the endpoint is missing", async () => {
		await expect(
			presign({ ...CONFIG, endpoint: "" }, SHA, "PUT"),
		).rejects.toBeInstanceOf(PresignConfigError);
	});

	it("throws PresignConfigError when r2Key is empty", async () => {
		await expect(presign(CONFIG, "", "PUT")).rejects.toBeInstanceOf(
			PresignConfigError,
		);
	});
});

describe("presignMany", () => {
	it("returns one URL per unique key, collapsing duplicates", async () => {
		const keys = [SHA, "aa".repeat(32), SHA]; // SHA twice
		const map = await presignMany(CONFIG, keys, "PUT");
		expect(map.size).toBe(2);
		expect(map.has(SHA)).toBe(true);
		expect(map.has("aa".repeat(32))).toBe(true);
	});

	it("presigns GET URLs when method is GET", async () => {
		const map = await presignMany(CONFIG, [SHA], "GET");
		const url = map.get(SHA);
		// GET URLs still carry the full SigV4 signature (no method in the URL,
		// but the signature differs from a PUT for the same key).
		expect(url).toBeDefined();
		expect(url).toContain("X-Amz-Signature=");
	});

	it("handles an empty key set", async () => {
		const map = await presignMany(CONFIG, [], "PUT");
		expect(map.size).toBe(0);
	});
});
