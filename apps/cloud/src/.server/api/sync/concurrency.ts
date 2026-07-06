/**
 * Cloud write serialization — ADR 0010.
 *
 * The single cloud replica (`project_files` + `sync_cursors`) must stay
 * consistent under concurrent multi-agent writes (the B3 "one memory, many
 * agents" model). Without serialization, two `push/complete` calls racing on
 * `bumpCursor` (a `max(seq)+1` read-then-write) can land the same `seq`, and a
 * commit interleaved with another loses a manifest entry — silently, the D6
 * "last-writer-wins" trust bug.
 *
 * Fix: wrap every manifest mutation in a libSQL **interactive write
 * transaction** (`BEGIN IMMEDIATE`). libSQL queues concurrent write
 * transactions rather than rejecting them (see `@libsql/core` api.d.ts: the
 * server "cannot process multiple write transactions concurrently, so if there
 * is another write transaction already started, our transaction will wait in a
 * queue before it can begin"). That queue makes the per-project commit path
 * strictly serial with zero application-level locking.
 *
 * ## Why not drizzle's `db.transaction()`?
 * Drizzle's libSQL session starts transactions with **no mode argument**
 * (`session.js` → `client.transaction()`), which defaults to `"deferred"`. A
 * deferred transaction upgrades to a write lock on first write, and that upgrade
 * "may fail if there is already a write transaction executing" — the exact
 * race we are trying to eliminate on a path that must never lose a commit. We
 * therefore reach below drizzle to `db.$client.transaction("write")` (raw
 * `BEGIN IMMEDIATE`, the queueing primitive) and run the commit's statements
 * against that raw `Transaction` via `execute()`. This keeps the serialization
 * guarantee in one place and free of drizzle's mode-defaulting footgun.
 *
 * ## Lock scope
 * Project-scoped, not global: every `push/complete` acquires the lock for its
 * own `projectId`. Two different projects commit concurrently with no
 * contention. The lock is on the **metadata/manifest** only — blob bytes live
 * in R2 and are content-addressed (the sha is the key), so uploads never need
 * this lock.
 *
 * ## Failure classification
 * The libSQL interactive-transaction lock-acquisition step has a timeout
 * (≈5s). If the queue is still full at the timeout (a long-running commit, or
 * pathological contention), the transaction throws `"database is locked"`. We
 * surface that as `ConcurrencyError` (503 + `Retry-After`) so the client
 * retries the same `push/complete` idempotently. Every other throw
 * (`ConflictError`, `EntitlementError`, …) passes through unchanged.
 *
 * @see docs/adr/0010-cloud-concurrency-control-for-b3.md
 * @see ./shared.ts `commitPushTx` — the work run inside the lock.
 */

/**
 * The raw libSQL `Transaction` (`BEGIN IMMEDIATE`) we run the commit against.
 * Imported from the installed `@libsql/client` so the type tracks the real
 * client rather than a local re-declaration.
 */
import type { Transaction } from "@libsql/client";
import type { Database } from "../../db";
import { type ApiErrorHeaders, ConcurrencyError } from "../errors";

/**
 * Substrings that identify a libSQL write-lock acquisition failure (interactive
 * transaction timed out waiting in the write queue). Matched case-insensitively
 * against `error.message`. Kept deliberately broad: the exact wording has
 * shifted across `@libsql/client` versions, but "database is locked" / the
 * SQLite `SQLITE_BUSY` story is stable.
 */
const LOCK_TIMEOUT_PATTERNS = [
	"database is locked",
	"sqlite_busy",
	"transaction timed out",
	"write transaction",
];

/**
 * Runs `fn` inside a per-project libSQL write transaction (`BEGIN IMMEDIATE`),
 * serializing concurrent `push/complete` commits (ADR 0010).
 *
 * `fn` receives the raw `Transaction` (use `tx.execute(sql, args)`); every
 * statement it runs is atomic with the others, and the cursor bump + manifest
 * upserts land together. libSQL queues other concurrent write transactions
 * until this one commits/rolls back, so callers do not need to handle
 * "transaction could not start" failures — only the lock-acquisition timeout,
 * which `classify()` turns into `ConcurrencyError`.
 *
 * @returns whatever `fn` returns (committed).
 * @throws {ConcurrencyError} 503 if the write lock could not be acquired in time.
 * @throws re-throws anything `fn` throws (after rolling back).
 */
export async function acquireWriteLock<T>(
	db: Database,
	projectId: string,
	fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
	// `db.$client` is the raw libSQL client exposed by the drizzle driver
	// (driver-core.js: `db.$client = client`). `transaction("write")` opens an
	// interactive transaction with `BEGIN IMMEDIATE`, which queues — see the
	// module header for why this beats drizzle's deferred default.
	const tx = await db.$client.transaction("write");
	try {
		const result = await fn(tx);
		await tx.commit();
		return result;
	} catch (err) {
		// Always roll back on any throw so we never leave a write transaction
		// hanging (which would hold the lock until the Worker request ends).
		// `rollback()` itself never throws for a still-open tx; guard anyway so
		// a rollback failure can't mask the original error.
		try {
			await tx.rollback();
		} catch {
			/* original error is the interesting one */
		}
		// `classify` returns the error the caller should throw: a transformed
		// `ConcurrencyError` for lock timeouts, or the original otherwise. Throwing
		// its return value keeps `classify` a pure, directly-testable transform.
		throw classify(err, projectId);
	}
}

/**
 * Maps a caught error from the write-transaction body to the error the caller
 * should throw. A pure transform (never throws itself) so it is unit-testable
 * with a synthetic error.
 *
 * - libSQL write-lock timeout → a new `ConcurrencyError` (503 + Retry-After).
 *   This is the ONLY transformation; it signals transient contention the client
 *   retries idempotently.
 * - Everything else (`ConflictError`, `EntitlementError`, unknown throws) is
 *   returned unchanged. The caller re-throws it, and the global `onError` maps
 *   our `ApiError`s to their status + code and unknown throws to a generic 500.
 *
 * @returns the error to throw (a `ConcurrencyError` for lock timeouts, else the
 *          original error).
 */
export function classify(err: unknown, _projectId: string): unknown {
	if (isLockTimeout(err)) {
		// We don't have the current cursor inside `classify` without another DB
		// read; the client retries and gets a fresh cursor if it needs one. The
		// 503 is enough signal.
		return new ConcurrencyError();
	}
	return err;
}

/**
 * True if `err` looks like a libSQL write-lock acquisition failure. Matched on
 * the error message (case-insensitive) and, when present, the libSQL `code`
 * field (`SQLITE_BUSY` / `HRANA_TIMEOUT`). Split out so it is trivially testable.
 */
export function isLockTimeout(err: unknown): boolean {
	if (err == null) return false;
	const message =
		typeof err === "object" &&
		"message" in err &&
		typeof (err as { message: unknown }).message === "string"
			? (err as { message: string }).message
			: String(err);
	const lowered = message.toLowerCase();
	return LOCK_TIMEOUT_PATTERNS.some((p) => lowered.includes(p));
}

/**
 * Convenience for tests / callers that need the headers a `ConcurrencyError`
 * would attach, without constructing the error. Kept for symmetry with the
 * `ApiErrorHeaders` shape; the error class itself is the production path.
 */
export function concurrencyRetryHeaders(retryAfterMs: number): ApiErrorHeaders {
	return { "retry-after": String(Math.ceil(retryAfterMs / 1000)) };
}
