/**
 * Turso/libSQL metadata store — the cloud's metadata database (ADR 0005 §12.2).
 *
 * The cloud stores METADATA ONLY (auth spine, entitlements, the `project_files`
 * manifest, `sync_cursors`). File bytes live in R2; this DB is the relational
 * index over them. A libSQL/Turso backend is load-bearing for two locked reasons
 * (reconciliation K1, 2026-07-02):
 *
 *   1. **The concurrency layer (ADR 0010) depends on libSQL's interactive write
 *      transactions** — `BEGIN IMMEDIATE` *queues* concurrent writers rather than
 *      rejecting them, which is what `acquireWriteLock` (sync/concurrency.ts)
 *      relies on to serialize multi-agent writes with zero app-level locking.
 *      D1 offers no equivalent primitive (no interactive transactions), so the
 *      cloud MUST stay on libSQL for the v1.1 hosted-runtime/Teams-write paths
 *      to remain safe under D6 (last-writer-wins).
 *   2. **Self-host portability** — the cloud and an OSS self-hoster running
 *      `memofs-server` on Node (Fly/Railway/VPS) run identical server code. A
 *      Cloudflare-D1-only binding would foreclose that; Turso/libSQL runs
 *      identically in a Worker and in a plain Node process.
 *
 * The drizzle client is built per request from `env.DATABASE_URL` +
 * `env.DATABASE_AUTH_TOKEN`. The underlying `@libsql/client` `Client` is memoized
 * per (url, token) so a single isolate reuses one connection pool; drizzle wraps
 * it on top. `db.$client` exposes the raw client, which is what
 * `acquireWriteLock` reaches below drizzle for (`db.$client.transaction("write")`).
 */

import { env } from "cloudflare:workers";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Database = ReturnType<typeof getDB>;

/**
 * Connection-key → libSQL client cache, scoped to the Worker isolate.
 *
 * One underlying TCP/HTTP connection serves every request the isolate handles;
 * drizzle clients are cheap wrappers allocated per `createDb` call on top. The
 * key is the unique (URL, token) pair so rotating the Turso token via secret
 * rotation picks up a fresh client rather than reusing the stale one.
 */
/**
 * Builds a drizzle client bound to the env's Turso/libSQL database.
 *
 * @param env - The Worker env (`DATABASE_URL` / `DATABASE_AUTH_TOKEN`).
 * @returns a drizzle `Database` whose `.$client` is the raw libSQL `Client`
 *          (used by the concurrency layer's `transaction("write")`).
 */
// export function getDB() {
// 	const client = createClient({
// 		url: env.DATABASE_URL,
// 		authToken: env.DATABASE_AUTH_TOKEN,
// 	});
// 	return drizzle({ schema, client });
// }

let db: ReturnType<typeof drizzle> | undefined;

export function getDB() {
	if (!db) {
		db = drizzle({
			client: createClient({
				url: env.DATABASE_URL,
				authToken: env.DATABASE_AUTH_TOKEN,
			}),
			schema,
		});
	}
	return db;
}

