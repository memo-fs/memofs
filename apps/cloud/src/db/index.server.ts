/**
 * Cloudflare D1 metadata store.
 *
 * The cloud app's metadata (user auth, sessions, projects, files) lives in
 * Cloudflare D1. We construct a drizzle client per request from the Worker `env.DB`.
 */
import { drizzle } from "drizzle-orm/d1";
import type { CloudWorkerEnv } from "../server/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Builds a drizzle client bound to the Cloudflare D1 database configured in `wrangler.toml`.
 */
export function createDb(env: CloudWorkerEnv) {
	return drizzle(env.DB, { schema });
}
