/**
 * Worker bindings — declared in `wrangler.jsonc` and typed by `wrangler types`
 * (the `cf-typegen` script emits `.wrangler/types/worker-configuration.d.ts`).
 *
 * Runtime config comes from these bindings, NEVER from `process.env`. The only
 * legitimate `process.env` reads in this app are in the drizzle-kit CLI path
 * (`drizzle.config.ts`), which runs in Node at build time.
 *
 * @see docs/adr/0005-cloud-tech-stack.md — R2 (blobs) + Turso/libSQL (metadata).
 */
export interface CloudWorkerEnv {
	/** R2 bucket holding content-addressed blobs at `tekmemo/blobs/{sha256}`. */
	BLOBS: R2Bucket;

	/**
	 * Cloudflare Workers AI binding — the frontier extractor for hosted-memory
	 * graph extraction (ADR 0011 Phase 3, Q18). The hosted `Tekmemo` runtime
	 * uses it as the Pro+ extractor; the Free tier runs the rule-based floor.
	 */
	AI: Ai;

	/** Turso/libSQL HTTPS endpoint (e.g. `https://...turso.io`). */
	DATABASE_URL: string;
	/** Turso auth token (optional for local/ephemeral DBs). */
	DATABASE_AUTH_TOKEN?: string;

	/** HMAC/lookup salt applied when hashing API keys. */
	TEKMEMO_API_KEY_SALT?: string;

	// --- Auth (Better Auth) — SC4.1 passwordless ----------------------------
	/** Session/JWT signing secret for Better Auth. */
	BETTER_AUTH_SECRET: string;
	/** Base URL the auth app is served from (for callbacks/links). */
	BETTER_AUTH_URL: string;

	// --- OAuth providers (configured in A2; bindings land in A1) ------------
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;

	// --- Email (Plunk, plain HTTP transport) --------------------------------
	PLUNK_API_KEY?: string;
	/** RFC 5322 From header, e.g. `TekMemo Cloud <noreply@tekbreed.com>`. */
	PLUNK_FROM?: string;

	// --- Rate limiting (Upstash REST — SC4.1 magic-link defense) ------------
	UPSTASH_REDIS_REST_URL?: string;
	UPSTASH_REDIS_REST_TOKEN?: string;

	/** R2 S3-compatible API credentials for presigning PUT/GET URLs. */
	R2_S3_ACCESS_KEY_ID: string;
	R2_S3_SECRET_ACCESS_KEY: string;
	/** e.g. `<accountId>.r2.cloudflarestorage.com`. */
	R2_S3_ENDPOINT: string;
	/** e.g. `tekmemo-blobs`. */
	R2_BUCKET_NAME: string;

	/** Public base used to build absolute presigned URLs (without trailing slash). */
	CLOUD_PUBLIC_BASE_URL?: string;

	/** Presigned URL lifetime in seconds (default 900 = 15 min). */
	PRESIGN_TTL_SECONDS?: string;

	/** Deployment environment label surfaced by `/v1/readiness`. */
	ENVIRONMENT?: string;

	// --- Billing (Polar, Merchant of Record — ADR 0006) ---------------------
	/**
	 * Polar access token (org-scoped). The webhook + checkout/portal calls use it
	 * to talk to the Polar API. Secret — set via `wrangler secret put`.
	 */
	POLAR_ACCESS_TOKEN?: string;
	/**
	 * Webhook signing secret (from the Polar webhook endpoint config). The
	 * `@polar-sh/hono` `Webhooks` verifier signs every incoming payload against it
	 * — a mismatch yields 403, so spoofed events are rejected before any handler.
	 * Secret — set via `wrangler secret put`.
	 */
	POLAR_WEBHOOK_SECRET?: string;
	/** Polar API server: `"sandbox"` for test, `"production"` for live. */
	POLAR_ENV?: "sandbox" | "production";

	// Dashboard session cookie secret (used by React Router session storage).
	SESSION_SECRET: string;

	// --- Hosted-memory intelligence (ADR 0011 Phase 3) ----------------------
	/**
	 * Voyage AI API key — the hosted-memory embedder + reranker provider. Used
	 * by the hosted `Tekmemo` runtime for semantic recall + hybrid reranking
	 * against R2-resident files. Secret — set via `wrangler secret put`.
	 */
	VOYAGE_API_KEY: string;
}

/** Default presigned-URL lifetime when `PRESIGN_TTL_SECONDS` is unset. */
export const DEFAULT_PRESIGN_TTL_SECONDS = 900;
