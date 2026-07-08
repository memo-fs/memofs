/**
 * R2 presigned-URL generation via the S3-compatible API.
 *
 * The file-replication sync model (cloud-sync-and-refactor.md §4.4/§4.5) is
 * built on the server handing clients short-lived presigned PUT/GET URLs. The
 * client uploads/downloads blobs directly to/from R2 — the Worker never proxies
 * file bytes. This keeps the Worker out of the data path (no CPU on the hot
 * sync path, no 100MB Worker body cap, no egress billed through the Worker) and
 * is exactly the model §4.4 (`presignedPutUrl`) / §4.5 (`presignedGetUrl`) lock.
 *
 * We use `aws4fetch`'s `AwsV4Signer` with `signQuery: true` (Signature V4 query-
 * string signing) — this is the path that yields a URL the client can fetch with
 * a plain `fetch()`, no headers to manage. `aws4fetch` is Web Crypto-native, so
 * it runs inside a Cloudflare Worker without Node polyfills.
 *
 * Object keys are **content-addressed** (the sha256), so identical file content
 * across projects/projects shares one blob in R2 (ADR 0005 §12.2; schema
 * `project_files.r2_key`). Presigning therefore takes the sha256, never the
 * path — two projects syncing the same file hit the same object.
 *
 * @see cloud-sync-and-refactor.md §4.4 (push: presigned PUTs)
 *      cloud-sync-and-refactor.md §4.5 (pull: presigned GETs)
 * @see docs/adr/0005-cloud-tech-stack.md — R2 + aws4fetch (S3 API, free egress).
 */

import { env } from "cloudflare:workers";
import { AwsV4Signer } from "aws4fetch";

export const DEFAULT_PRESIGN_TTL_SECONDS = 900;

/** R2's S3 API is served under the `auto` region bucket subdomain. */
const R2_REGION = "auto";
/** R2 implements the S3 API; the SigV4 service name is `s3`. */
const R2_SERVICE = "s3";

/**
 * Signer config derived once from `env`. Kept as a plain object (not a class)
 * so it's trivially mockable in tests — construct it with literal credentials
 * and pass to `presign()`.
 */
export interface R2PresignConfig {
	accessKeyId: string;
	secretAccessKey: string;
	/** e.g. `<accountId>.r2.cloudflarestorage.com`. */
	endpoint: string;
	/** e.g. `memofs-blobs`. */
	bucket: string;
	/** Public base URL (no trailing slash) to rewrite the signed host with, if
	 * the S3 endpoint is internal/different from what clients should hit. */
	publicBaseUrl?: string;
	/** Presigned URL lifetime in seconds (default 900 = 15 min). */
	ttlSeconds?: number;
}

/** Pulls the presign config out of the Worker bindings. */
export function presignConfigFromEnv(): R2PresignConfig {
	return {
		accessKeyId: env.R2_S3_ACCESS_KEY_ID,
		secretAccessKey: env.R2_S3_SECRET_ACCESS_KEY,
		endpoint: env.R2_S3_ENDPOINT,
		bucket: env.R2_BUCKET_NAME,
		publicBaseUrl: env.CLOUD_PUBLIC_BASE_URL,
		ttlSeconds: parseTtl(env.PRESIGN_TTL_SECONDS),
	};
}

/**
 * The kind of operation a presigned URL grants. Maps to the S3 HTTP method.
 */
export type PresignMethod = "PUT" | "GET";

/**
 * Builds a short-lived presigned R2 URL for one object.
 *
 * @param config  signer config (from `presignConfigFromEnv`, or literal in tests)
 * @param r2Key   content-addressed object key (the sha256 hex), e.g.
 *                `9f86d081884c7d65…`. Never the canonical `.memofs/` path —
 *                paths are metadata, keys are content addresses.
 * @param method  `PUT` (upload, §4.4) or `GET` (download, §4.5).
 * @returns       a fully-formed, signed URL the client can `fetch()` directly.
 */
export async function presign(
	config: R2PresignConfig,
	r2Key: string,
	method: PresignMethod,
): Promise<string> {
	if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
		throw new PresignConfigError(
			"R2 presign requires R2_S3_ACCESS_KEY_ID, R2_S3_SECRET_ACCESS_KEY, and R2_S3_ENDPOINT to be set.",
		);
	}
	if (!r2Key) throw new PresignConfigError("r2Key (object key) is required.");

	const host = `${config.bucket}.${config.endpoint}`;
	// Path-style addressing (`/<key>`) is the safest across R2 + tooling;
	// virtual-host-style (`<bucket>.<endpoint>/<key>`) can collide with DNS
	// for keys that look like hostnames. R2 supports both.
	const unsignedUrl = new URL(`https://${host}/${encodeURIComponent(r2Key)}`);
	const ttl = config.ttlSeconds ?? DEFAULT_PRESIGN_TTL_SECONDS;
	// aws4fetch's `AwsV4Signer` has no `expires` option; the TTL is set by
	// pre-populating `X-Amz-Expires` on the query string. The signer then signs
	// it (and skips its own 86400 default because the param is already present).
	unsignedUrl.searchParams.set("X-Amz-Expires", String(ttl));

	const signer = new AwsV4Signer({
		url: unsignedUrl.toString(),
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		method,
		region: R2_REGION,
		service: R2_SERVICE,
		signQuery: true,
	});

	const signed = await signer.sign();
	let signedUrl = signed.url.toString();

	// If a public base URL is set, rewrite the host so clients resolve a
	// publicly-reachable address (e.g. when the S3 endpoint is internal or a
	// custom domain fronts R2). The signature binds the original host, so this
	// is only valid when publicBaseUrl is a CNAME/alias that routes to the same
	// R2 endpoint — see wrangler.toml `CLOUD_PUBLIC_BASE_URL`.
	if (config.publicBaseUrl) {
		signedUrl = signedUrl.replace(`https://${host}`, config.publicBaseUrl);
	}

	return signedUrl;
}

/**
 * Batch-presigns a set of keys with one method. The sync handlers issue one
 * PUT URL per file-to-upload (§4.4) and one GET URL per file-to-download
 * (§4.5); this is the shape they want.
 *
 * @returns a map of `{ r2Key → presignedUrl }`. Duplicate keys collapse to one
 *          URL (content-addressed → identical content shares one blob).
 */
export async function presignMany(
	config: R2PresignConfig,
	r2Keys: Iterable<string>,
	method: PresignMethod,
): Promise<Map<string, string>> {
	const out = new Map<string, string>();
	// De-duplicate first: content-addressed keys mean a push with the same
	// file in two paths only needs one PUT URL.
	const unique = new Set(r2Keys);
	await Promise.all(
		[...unique].map(async (key) => {
			out.set(key, await presign(config, key, method));
		}),
	);
	return out;
}

/** Thrown when the Worker bindings needed to sign are missing/empty. */
export class PresignConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PresignConfigError";
	}
}

/** Parses `PRESIGN_TTL_SECONDS` (a Worker var string) into a number of seconds. */
function parseTtl(raw: string | undefined): number | undefined {
	if (raw == null || raw === "") return undefined;
	const n = Number(raw);
	if (Number.isNaN(n) || n <= 0) return undefined;
	return n;
}
