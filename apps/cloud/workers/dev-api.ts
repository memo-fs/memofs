/**
 * Dev-only entry for the Hono API, loaded by `vite/dev-api.ts`.
 *
 * This exists ONLY so `react-router dev` can serve `/v1/*` identically to the
 * production Worker. It builds the SAME `createApiApp()` routing tree and
 * hands it a dev-synthesized `CloudWorkerEnv`:
 *   - vars come from `process.env` (dev only — `.dev.vars` / shell env);
 *   - `BLOBS` is a stub R2 bucket that returns "not found" for heads/gets,
 *     which makes `/v1/readiness` report `r2_unreachable` in dev unless a
 *     real binding is wired (intentional: dev has no R2 by default).
 *
 * Production never imports this file — the Worker's `fetch` handler is the
 * only production entry (`workers/app.ts`), and there bindings come from
 * real Worker `env`.
 */
import { createApiApp } from "../src/api";
import type { CloudWorkerEnv } from "../src/server/env";

// NOTE on R2 types: `wrangler types` emits `worker-configuration.d.ts`, which
// declares `R2Bucket`/`R2Object`/`R2Objects` as AMBIENT GLOBALS — that is what
// `CloudWorkerEnv.BLOBS: R2Bucket` resolves to. We deliberately do NOT import
// these from `@cloudflare/workers-types`: that package ships a
// module-scoped copy whose `Headers`/`R2Object` shapes don't structurally
// overlap the ambient ones, so cross-assigning them fails typecheck. Using the
// globals keeps one source of truth (the wrangler-generated file).

/** Dev stub for the R2 `BLOBS` binding: always reports "object absent". */
const stubBlobs: R2Bucket = {
	async head() {
		return null;
	},
	async get() {
		return null;
	},
	async put() {
		throw new Error(
			"R2 is not available in `react-router dev`; use `pnpm preview` (wrangler dev) to exercise R2.",
		);
	},
	async createMultipartUpload() {
		throw new Error("R2 multipart upload unavailable in dev.");
	},
	resumeMultipartUpload() {
		// Ambient R2 type returns `R2MultipartUpload` synchronously (not a
		// Promise), so this stays a sync throw — no `async`.
		throw new Error("R2 multipart resume unavailable in dev.");
	},
	async delete() {},
	async list() {
		return { objects: [], delimitedPrefixes: [], truncated: false };
	},
};

/**
 * Synthesize a dev `CloudWorkerEnv` from `process.env`. Only the public vars
 * are read here; secrets (DATABASE_*, R2 S3 creds) are picked up the same way
 * when present in the dev environment.
 */
function devEnv(): CloudWorkerEnv {
	return {
		BLOBS: stubBlobs,
		ENVIRONMENT: process.env.ENVIRONMENT ?? "development",
		CLOUD_PUBLIC_BASE_URL:
			process.env.CLOUD_PUBLIC_BASE_URL ?? "http://localhost:5173",
		PRESIGN_TTL_SECONDS: process.env.PRESIGN_TTL_SECONDS ?? "900",
		R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT ?? "",
		R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ?? "tekmemo-blobs",
		DATABASE_URL: process.env.DATABASE_URL ?? "",
		DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
		TEKMEMO_API_KEY_SALT: process.env.TEKMEMO_API_KEY_SALT,
		R2_S3_ACCESS_KEY_ID: process.env.R2_S3_ACCESS_KEY_ID ?? "",
		R2_S3_SECRET_ACCESS_KEY: process.env.R2_S3_SECRET_ACCESS_KEY ?? "",
		SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-insecure-session-secret",
	};
}

/** The Hono API as a standalone fetch handler — consumed by the dev plugin. */
export const devApi = {
	fetch: (request: Request) => createApiApp().fetch(request, devEnv()),
};
