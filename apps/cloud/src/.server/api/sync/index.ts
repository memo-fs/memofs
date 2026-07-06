/**
 * Sync router — the four file-replication sync endpoints.
 *
 * Mounted by `createApiApp` at `/v1/projects/:projectId/sync/*` (the path the
 * frozen `@memofs/core/cloud-client` transport calls). Implements §4.4
 * (push + push/complete), §4.5 (pull), §4.6 (status) of the locked cloud-sync
 * spec, composed from the pure helpers in `./shared` + the R2 presigner.
 *
 * The router carries its own middleware spine (auth + db) because both need
 * `c.env`, and mounting them here keeps the project-scoped contract obvious:
 * every `/sync/*` request authenticates an account AND binds a per-request
 * drizzle client before any handler runs. Health/readiness stay env-light and
 * never pay this cost (they mount directly in `createApiApp`).
 *
 *   1. `dbMiddleware`     — builds `createDb(c.env)`, sets `c.var.db`.
 *   2. `authMiddleware`   — resolves the Bearer key → `c.var.account`.
 *
 * Handlers then resolve the project (`:projectId`), assert ownership, and run
 * the request-specific logic. Every response goes through `json()` so the wire
 * envelope stays the SSOT; errors throw `ApiError` subclasses serialized by the
 * global `onError`.
 *
 * ## Two-phase push + concurrency (ADR 0010)
 * `push` returns the CURRENT cursor (pre-commit); `complete` is what bumps it.
 *
 * `complete` now serializes the commit: it acquires the project's libSQL
 * `BEGIN IMMEDIATE` write lock (via `acquireWriteLock`) and runs the whole
 * commit — cursor bump, manifest upserts, storage total — inside it, so two
 * concurrent multi-agent pushes to one project can never interleave or lose a
 * manifest entry. The lock is project-scoped; unrelated projects commit in
 * parallel. If the lock can't be acquired within the libSQL timeout, the client
 * gets a 503 `concurrency_locked` + `Retry-After` and retries the same
 * `push/complete` idempotently.
 *
 * The optimistic `baseCursor` gate runs INSIDE the lock: if the client supplied
 * a `baseCursor` that is now stale (another agent committed since `push`), we
 * reject with 409 carrying the current cursor so the client re-diffs and
 * retries. A client that omits `baseCursor` (or sends the current one) passes
 * straight through — single-user, single-device sync is unaffected. This keeps
 * D6 (last-writer-wins) for the uncontended case while making B3 (one memory,
 * many agents) safe: a contended commit is either retried cleanly (503) or
 * resolved with a fresh diff (409), never silently dropped.
 *
 * @see docs/architecture/cloud-sync-and-refactor.md §4.4/§4.5/§4.6
 * @see docs/adr/0010-cloud-concurrency-control-for-b3.md
 * @see docs/architecture/decisions.md Q13 (auto-provision), Q14 (cursor = String(seq))
 */

import type {
	CloudFileManifest,
	FileManifest,
} from "@memofs/core/cloud-client";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import type { Database } from "../../db";
import { getDB } from "../../db";
import { invariant } from "../../../utils/misc";
import { ConflictError, EntitlementError, ValidationError } from "../errors";
import type { ApiEnv, ApiVariables } from "../index";
import { json } from "../json";
import { resolveAccount } from "../middleware/auth";
import { presignConfigFromEnv, presignMany } from "../r2-presign";
import { acquireWriteLock } from "./concurrency";
import {
	assertOwns,
	cloudManifestToLocal,
	commitPushTx,
	currentCursor,
	currentCursorTx,
	diffPullTargets,
	diffPushTargets,
	diffRemoved,
	ensureProject,
	INITIAL_CURSOR,
	lastSyncAt,
	loadCloudManifest,
	loadProject,
	parseCursor,
	projectedStorageBytes,
	verifyUploaded,
} from "./shared";

// ---------------------------------------------------------------------------
// Input shapes (server-side view of the frozen client types)
// ---------------------------------------------------------------------------
//
// We read the body as `unknown` and narrow with these local guards rather than
// trust the client's TS type. The client ALSO validates (`cloud-client/
// validation.ts`) so a well-behaved SDK never sends bad input, but the server
// is the trust boundary — a hand-rolled POST must get a 422, never a 500.

/** A `{ path → sha256 }` manifest as received over the wire. */
type ManifestBody = Record<string, unknown>;

/** `POST /sync/push` body. */
interface PushBody {
	manifest?: ManifestBody;
	baseCursor?: unknown;
}

/** `POST /sync/push/complete` body. */
interface PushCompleteBody {
	uploaded?: unknown;
	cursor?: unknown;
}

/** `POST /sync/pull` body. */
interface PullBody {
	manifest?: ManifestBody;
	since?: unknown;
}

// ---------------------------------------------------------------------------
// Middleware: db + auth, both built per-request from `c.env`
// ---------------------------------------------------------------------------

/**
 * Builds `createDb(c.env)` once per request and stamps it on `c.var.db`.
 *
 * A fresh drizzle client per request matches how the Worker runtime works —
 * the libSQL HTTP client is connectionless, so this is cheap. Keeping the
 * construction in middleware (not inside each handler) means the handlers stay
 * pure "read `c.get("db")`" and the binding→client mapping lives in one place.
 *
 * If `c.var.db` is already set (tests pre-seed a migrated in-memory DB this
 * way via a tiny `use("*", (c) => c.set("db", testDb))` mounted before this
 * router), we honor it and skip construction — so integration tests run the
 * real handlers against a real libSQL client without a Worker binding.
 */
const dbMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
	if (!c.get("db")) c.set("db", getDB());
	await next();
};

/**
 * Bearer auth, resolving the per-request deps from `c.env` + `c.get("db")`.
 *
 * `resolveAccount` is the pure core of `createAuthMiddleware`; calling it
 * directly here avoids re-creating a middleware closure per request while
 * keeping the same validation + error paths (it throws `AuthError` → 401).
 *
 * `db` MUST be set first (by `dbMiddleware`) — auth joins `api_keys` →
 * `accounts`, so it needs the client. Router ordering below guarantees this.
 */
const authMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
	const db = c.get("db");
	// Defensive: the router mounts db before auth, so this is unreachable in
	// normal operation. Failing loudly surfaces a wiring bug rather than
	// letting an unauthenticated request slip past.
	invariant(db, "db middleware must run before auth middleware");
	const salt = c.env.API_KEY_SALT ?? "";
	const account = await resolveAccount(db, salt, c.req.header("authorization"));
	c.set("account", account);
	await next();
};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const syncApp = new Hono<ApiEnv>()
	.use("*", dbMiddleware)
	.use("*", authMiddleware)

	// --- POST /push ----------------------------------------------------------
	.post("/push", async (c) => {
		const db = requireDb(c);
		const account = requireAccount(c);
		const projectId = requireProjectId(c);

		const body = await readJsonObject<PushBody>(c);
		const manifest = parseManifest(body.manifest, "manifest");
		// Parse `baseCursor` leniently (opaque-string contract); it is echoed
		// back unchanged so the client includes it on `push/complete`, where the
		// optimistic gate (ADR 0010) checks it inside the write lock.
		const baseCursor =
			typeof body.baseCursor === "string" ? body.baseCursor : undefined;
		void parseCursor(baseCursor);

		// First push auto-provisions the project owned by this account (Q13).
		const project = await ensureProject(db, account.id, projectId);
		await assertOwns(db, project, account.id);

		const cloud = await loadCloudManifest(db, projectId);
		const targets = diffPushTargets(manifest, cloudManifestToLocal(cloud));

		// Issue one presigned PUT per changed/missing path. Keys are content-
		// addressed (the sha256), so identical content across paths shares one URL.
		const config = presignConfigFromEnv(c.env);
		const urls = await presignMany(
			config,
			targets.map((t) => t.sha256),
			"PUT",
		);

		const cursor = await currentCursor(db, projectId);
		const expiresAt = presignExpiry(c.env);

		return json(c, {
			upload: targets.map((t) => ({
				path: t.path,
				sha256: t.sha256,
				// sizeBytes is unknown until the client uploads — the server doesn't
				// have the bytes yet. The frozen type marks it required, so we report
				// 0 here; `complete` is where size becomes authoritative (read from R2).
				sizeBytes: 0,
				presignedPutUrl: urls.get(t.sha256) ?? "",
				expiresAt,
			})),
			// The client echoes this back as `cursor` on `push/complete`, where the
			// optimistic gate (ADR 0010) checks it inside the write lock.
			cursor,
		});
	})

	// --- POST /push/complete -------------------------------------------------
	.post("/push/complete", async (c) => {
		const db = requireDb(c);
		const account = requireAccount(c);
		const projectId = requireProjectId(c);

		const body = await readJsonObject<PushCompleteBody>(c);
		const uploaded = parseUploaded(body.uploaded);
		// The client's last-seen cursor, used by the optimistic gate. Parsed
		// leniently; `null` means "client supplied none" → no gate, commit freely
		// (single-user path). A present-but-stale value is rejected inside the
		// lock (ADR 0010).
		const baseCursorSeq = parseCursor(
			typeof body.cursor === "string" ? body.cursor : undefined,
		);

		// A `complete` with no prior `push` means the project doesn't exist yet;
		// there is nothing to complete. The client should have called push first.
		// Surface as 409 (conflict) so the client re-pushes cleanly.
		const project = await loadProject(db, projectId);
		if (!project) {
			throw new ConflictError(
				"Project has no prior push; call /sync/push first.",
				{ projectId },
			);
		}
		await assertOwns(db, project, account.id);

		// Verify each uploaded object against R2 (existence + sha256 match) and
		// capture its size. This is the content-addressing gate: the bytes the
		// client PUT must hash to what it claimed, else we refuse to commit.
		const blobs = c.env.BLOBS;
		if (!blobs) {
			throw new Error("R2 BLOBS bucket is not bound to the worker.");
		}
		const verified: Array<{
			path: string;
			sha256: string;
			r2Key: string;
			sizeBytes: number;
		}> = [];
		for (const entry of uploaded) {
			// Content-addressed: the R2 key IS the sha256. Two paths with the same
			// content share one object; `verifyUploaded` reads it once per entry.
			const sizeBytes = await verifyUploaded(blobs, entry.sha256, entry.sha256);
			verified.push({
				path: entry.path,
				sha256: entry.sha256,
				r2Key: entry.sha256,
				sizeBytes,
			});
		}

		// Entitlement gate (§12.3): project the post-commit storage total and
		// reject with 402 (+ upgrade payload) if it would exceed the account's
		// cap. AFTER verifying uploads (so sizes are authoritative) and BEFORE
		// committing (so a rejection leaves the manifest untouched).
		const cloud = await loadCloudManifest(db, projectId);
		const projected = projectedStorageBytes(cloud, verified);
		if (projected > account.maxHostedStorageBytes) {
			throw new EntitlementError("Storage limit exceeded for this plan.", {
				limit: "storage",
				used: Math.round(project.totalStorageBytes),
				requested: projected,
				max: account.maxHostedStorageBytes,
				plan: account.plan,
			});
		}

		// Serialize the commit (ADR 0010): acquire the project's BEGIN IMMEDIATE
		// write lock, run the optimistic-cursor gate + the full commit inside it,
		// then commit. Two concurrent multi-agent pushes to one project cannot
		// interleave; a contended lock surfaces as 503 concurrency_locked.
		const { cursor, manifest } = await acquireWriteLock(
			db,
			projectId,
			async (tx) => {
				// Optimistic gate: if the client supplied a baseCursor that is now
				// stale (another agent committed since its `push`), reject with 409
				// carrying the current cursor. Omitted/ current → commit freely.
				if (baseCursorSeq !== null) {
					const current = await currentCursorTx(tx, projectId);
					if (current !== String(baseCursorSeq)) {
						throw new ConflictError(
							"Stale base cursor: another agent committed since your push. Re-diff and retry.",
							{ baseCursor: String(baseCursorSeq), currentCursor: current },
						);
					}
				}
				return commitPushTx(tx, projectId, verified);
			},
		);
		return json(c, { cursor, manifest });
	})

	// --- POST /pull ----------------------------------------------------------
	.post("/pull", async (c) => {
		const db = requireDb(c);
		const account = requireAccount(c);
		const projectId = requireProjectId(c);

		const body = await readJsonObject<PullBody>(c);
		const clientManifest = parseOptionalManifest(body.manifest, "manifest");
		// `since` is accepted (opaque) but not used to filter at v1 — the full
		// diff vs the supplied manifest is returned. Cursor-incremental pull is
		// additive later; the cursor is still returned so clients can persist it.
		void parseCursor(typeof body.since === "string" ? body.since : undefined);

		// A missing project is reported as empty (Q13) — a brand-new client's
		// first pull is a clean no-op, not a 404.
		const project = await loadProject(db, projectId);
		if (!project) return json(c, emptyPull());
		await assertOwns(db, project, account.id);

		const cloud = await loadCloudManifest(db, projectId);
		// No client manifest ⇒ the client wants everything it doesn't already
		// have, i.e. diff against `{}`.
		const client: FileManifest = clientManifest ?? {};
		const targets = diffPullTargets(cloud, client);
		const removed = diffRemoved(client, cloud);

		const config = presignConfigFromEnv(c.env);
		const urls = await presignMany(
			config,
			targets.map((t) => t.sha256),
			"GET",
		);
		const expiresAt = presignExpiry(c.env);
		const cursor = await currentCursor(db, projectId);

		return json(c, {
			files: targets.map((t) => {
				const entry = cloud[t.path];
				return {
					path: t.path,
					sha256: t.sha256,
					sizeBytes: entry?.sizeBytes ?? 0,
					presignedGetUrl: urls.get(t.sha256) ?? "",
					expiresAt,
				};
			}),
			removed,
			cursor,
			manifest: cloud,
		});
	})

	// --- GET /status ---------------------------------------------------------
	.get("/status", async (c) => {
		const db = requireDb(c);
		const account = requireAccount(c);
		const projectId = requireProjectId(c);

		const project = await loadProject(db, projectId);
		if (!project) {
			// Empty result for a not-yet-pushed project (Q13).
			return json(c, {
				manifest: {} as CloudFileManifest,
				cursor: INITIAL_CURSOR,
				storageBytes: 0,
			});
		}
		await assertOwns(db, project, account.id);

		const [manifest, cursor, lastAt] = await Promise.all([
			loadCloudManifest(db, projectId),
			currentCursor(db, projectId),
			lastSyncAt(db, projectId),
		]);
		return json(c, {
			manifest,
			cursor,
			storageBytes: Math.round(project.totalStorageBytes),
			lastSyncAt: lastAt,
		});
	});

// ---------------------------------------------------------------------------
// Helpers — request-body parsing + small response shapers
// ---------------------------------------------------------------------------

/** Reads + narrows a JSON request body, rejecting non-object bodies with 422. */
async function readJsonObject<T>(c: HonoContext): Promise<T> {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		throw new ValidationError("Request body must be valid JSON.", {
			reason: "invalid_json",
		});
	}
	if (body === null || typeof body !== "object" || Array.isArray(body)) {
		throw new ValidationError("Request body must be a JSON object.");
	}
	return body as T;
}

/**
 * Parses a required `{ path → sha256 }` manifest from the wire. Each value must
 * be a 64-char lowercase hex sha256; each key a non-empty path. Mirrors the
 * client's `assertFileManifest` so the two gates agree.
 */
function parseManifest(value: unknown, field: string): FileManifest {
	if (
		value === undefined ||
		value === null ||
		typeof value !== "object" ||
		Array.isArray(value)
	) {
		throw new ValidationError(`${field} must be a path → sha256 object.`);
	}
	const out: FileManifest = {};
	for (const [path, sha] of Object.entries(value as ManifestBody)) {
		if (!path) {
			throw new ValidationError(`${field} has an empty path key.`);
		}
		if (typeof sha !== "string" || !SHA256_PATTERN.test(sha)) {
			throw new ValidationError(
				`${field}["${path}"] must be a sha256 hex digest (64 lowercase hex chars).`,
			);
		}
		out[path] = sha;
	}
	return out;
}

/** Parses an OPTIONAL manifest (`pull` allows omitting it to mean "all files"). */
function parseOptionalManifest(
	value: unknown,
	field: string,
): FileManifest | undefined {
	if (value === undefined || value === null) return undefined;
	return parseManifest(value, field);
}

/** Parses the `push/complete` `uploaded[]` array; each entry needs path + sha. */
function parseUploaded(
	value: unknown,
): Array<{ path: string; sha256: string }> {
	if (!Array.isArray(value)) {
		throw new ValidationError(
			"uploaded must be an array of { path, sha256 } entries.",
		);
	}
	const out: Array<{ path: string; sha256: string }> = [];
	for (const [index, entry] of value.entries()) {
		if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
			throw new ValidationError(`uploaded[${index}] must be an object.`);
		}
		const { path, sha256 } = entry as { path?: unknown; sha256?: unknown };
		if (typeof path !== "string" || path.length === 0) {
			throw new ValidationError(
				`uploaded[${index}].path must be a non-empty string.`,
			);
		}
		if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
			throw new ValidationError(
				`uploaded[${index}].sha256 must be a sha256 hex digest (64 lowercase hex chars).`,
			);
		}
		out.push({ path, sha256 });
	}
	return out;
}

/** `c.get("db")` narrowed to non-undefined; throws loudly if middleware mis-ran. */
function requireDb(c: HonoContext): Database {
	const db = c.get("db");
	invariant(db, "db not set on context");
	return db;
}

/**
 * The `:projectId` route param, narrowed to a non-empty string.
 *
 * Hono types route params as `string | undefined` (it can't prove a param is
 * bound from the generic alone), but any route matched under
 * `/v1/projects/:projectId/sync/*` has it set. We validate non-empty rather than
 * bare-assert so a misconfigured mount fails with a clear 422 instead of a 500.
 */
function requireProjectId(c: HonoContext): string {
	const projectId = c.req.param("projectId");
	if (!projectId || projectId.trim().length === 0) {
		throw new ValidationError("projectId is required.");
	}
	return projectId;
}

/**
 * `c.get("account")` narrowed to non-undefined. Auth middleware always sets it
 * (it throws before `next()` on any failure), so this is unreachable in normal
 * operation — the narrowing just carries that fact to the type system.
 */
function requireAccount(c: HonoContext): ApiVariables["account"] & object {
	const account = c.get("account");
	invariant(account, "account not set on context");
	return account;
}

/** An empty pull result for a project the cloud has never seen (Q13). */
function emptyPull() {
	return {
		files: [],
		removed: [],
		cursor: INITIAL_CURSOR,
		manifest: {} as CloudFileManifest,
	};
}

/**
 * ISO expiry timestamp for presigned URLs, derived from the same TTL the signer
 * uses. Informational for the client (it can refresh); the authoritative expiry
 * is the `X-Amz-Expires` the signature carries.
 */
function presignExpiry(env: Env): string | undefined {
	const raw = env.PRESIGN_TTL_SECONDS as string | undefined;
	const ttl = raw && raw !== "" && Number(raw) > 0 ? Number(raw) : 900;
	return new Date(Date.now() + ttl * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Type aliases + re-exports
// ---------------------------------------------------------------------------

/** The Hono context type the handlers receive. */
type HonoContext = Parameters<MiddlewareHandler<ApiEnv>>[0];

/** sha256 hex digest: 64 lowercase hex chars. Matches `cloud-client/validation.ts`. */
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
