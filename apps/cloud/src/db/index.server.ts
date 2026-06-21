/**
 * Turso/libSQL metadata store.
 *
 * The cloud stores metadata only — no memory content (ADR 0005 §12.2). The
 * libSQL HTTP client works inside a Worker over HTTPS, so we keep Turso remote
 * (no native binding, no D1) and construct a drizzle client per request from
 * the Worker `env`.
 *
 * @see docs/adr/0005-cloud-tech-stack.md — Turso/Drizzle is the locked metadata DB.
 */
import { drizzle } from "drizzle-orm/libsql";

import type { CloudWorkerEnv } from "../server/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Builds a drizzle client bound to the Turso DB configured in `wrangler.jsonc`.
 * Construct per-request (or memoize on `context.cloudflare.env`) — the libSQL
 * HTTP client opens a fresh connection per call.
 */
export function createDb(env: CloudWorkerEnv) {
	return drizzle({
		schema,
		connection: {
			url: env.DATABASE_URL,
			authToken: env.DATABASE_AUTH_TOKEN,
		},
	});
}
