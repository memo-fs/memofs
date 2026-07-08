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
import { type Client } from "@libsql/client";
import type { Database } from "../../src/.server/db";
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
export declare function createTestDb(): Promise<Database>;
/**
 * Applies every `drizzle/*.sql` migration to the client in filename order.
 * Statements within a file are split on Drizzle's break marker so dependencies
 * (a table referenced by an index) apply in order; each batch is atomic.
 */ export declare function applyMigrations(client: Client): Promise<void>;
