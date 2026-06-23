/**
 * In-memory libSQL test database, migrated from the committed Drizzle migration.
 *
 * Tests need a real database to exercise the actual SQL the handlers emit — a
 * mock would only assert the calls we hand-wrote, not the query the ORM builds.
 * `@libsql/client` supports a `:memory:` URL backed by the native `sqlite3`
 * driver in Node, so each test gets an isolated, zero-latency DB that is created
 * + torn down per test (no shared state, no cleanup harness).
 *
 * The schema is applied by running each committed `drizzle/*.sql` migration,
 * split on Drizzle's `--> statement-breaker` marker. Reading the files at test
 * time (not hard-copying the DDL) keeps the test schema in lock-step with the
 * migration the Worker actually deploys — drift fails the test, not a deploy.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "../../src/db/index.server";
import * as schema from "../../src/db/schema";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "..", "drizzle");

/**
 * Statement separator Drizzle emits between independent SQL statements.
 * Drizzle's literal token is `--> statement-breakpoint` (not "breaker").
 */
const STATEMENT_BREAK = "--> statement-breakpoint";

/**
 * Builds a fresh, migrated in-memory database. Each call yields an independent
 * client — tests don't share rows. Returns a Drizzle `Database` with the full
 * schema bound, so `.select().from(accounts)` type-checks.
 *
 * Async because applying migrations awaits the libSQL batch API; call in a test
 * setup hook (`beforeEach`) or at the top of an async test.
 */
export async function createTestDb(): Promise<Database> {
	const client = createClient({ url: ":memory:" });
	await applyMigrations(client);
	return drizzle({ schema, client }) as Database;
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
