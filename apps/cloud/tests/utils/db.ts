/**
 * File-backed libSQL test database, migrated from the committed Drizzle migration.
 *
 * Tests need a real database to exercise the actual SQL the handlers emit — a
 * mock would only assert the calls we hand-wrote, not the query the ORM builds.
 * Each test gets an isolated, zero-latency libSQL DB under a fresh OS temp dir
 * that is created + torn down per test (no shared state, no cleanup harness).
 *
 * ## Why a temp FILE, not `:memory:`
 * The cloud concurrency layer (ADR 0010) runs commits inside interactive
 * `BEGIN IMMEDIATE` transactions (`db.$client.transaction("write")`). The
 * native `libsql` driver that backs `:memory:` has a quirk: after such a
 * transaction commits, subsequent queries on the main client hit a SEPARATE
 * empty in-memory database and fail with "no such table". A file-backed URL
 * (`file:<tmp>/test.db`) keeps a single database instance across the connection
 * and the transaction, so the production serialization primitive behaves in
 * tests exactly as it does against Turso over HTTP. Each `createTestDb` call
 * uses a unique temp dir, so isolation is preserved.
 *
 * The schema is applied by running each committed `drizzle/*.sql` migration,
 * split on Drizzle's `--> statement-breakpoint` marker. Reading the files at
 * test time (not hard-copying the DDL) keeps the test schema in lock-step with
 * the migration the Worker actually deploys — drift fails the test, not a deploy.
 */

// Test-only infra: this module runs under vitest (Node), never in the Worker
// bundle. The triple-slash refs pull ambient `@types/node` module declarations
// so `node:fs`/`node:os`/`node:path`/`node:url` resolve without adding `node`
// to the worker project's global `types` (which would weaken the no-node-deps
// guardrail on prod worker code).
/// <reference types="node" />
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "../../src/.server/db";
import * as schema from "../../src/.server/db/schema";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "..", "drizzle");

/**
 * Statement separator Drizzle emits between independent SQL statements.
 * Drizzle's literal token is `--> statement-breakpoint` (not "breaker").
 */
const STATEMENT_BREAK = "--> statement-breakpoint";

/**
 * Builds a fresh, migrated database under a unique temp dir. Each call yields an
 * independent client — tests don't share rows. Returns a Drizzle `Database` with
 * the full schema bound, so `.select().from(accounts)` type-checks.
 *
 * Async because applying migrations awaits the libSQL batch API; call in a test
 * setup hook (`beforeEach`) or at the top of an async test.
 *
 * @returns the drizzle `Database`; `db.$client` is the raw libSQL client (call
 *          `.close()` on it in `afterEach`; the temp dir is left for the OS to
 *          reap, which is fine for test runs).
 */
export async function createTestDb(): Promise<Database> {
	// Unique temp dir per DB so concurrent tests never collide on one file.
	const dir = mkdtempSync(join(tmpdir(), "memofs-test-"));
	const url = `file:${join(dir, "test.db")}`;
	const client = createClient({ url });
	await applyMigrations(client);
	// `Database` is `ReturnType<typeof createDb>` (libSQL drizzle), so the shapes
	// match — the cast just satisfies TS without a redundant re-declaration.
	return drizzle({ schema, client }) as unknown as Database;
}

/**
 * Applies every `drizzle/*.sql` migration to the client in filename order.
 * Statements within a file are split on Drizzle's break marker so dependencies
 * (a table referenced by an index) apply in order; each batch is atomic.
 */ export async function applyMigrations(client: Client): Promise<void> {
	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const file of files) {
		const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
		const statements = sql
			.split(STATEMENT_BREAK)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		// `batch` runs the statements sequentially in one transaction. "write" mode
		// guarantees the DDL is durable for subsequent queries on the same client.
		await client.batch(
			statements.map((s) => ({ sql: s, args: [] })),
			"write",
		);
	}
}
