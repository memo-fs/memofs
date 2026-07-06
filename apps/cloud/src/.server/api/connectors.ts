/**
 * Connectors API sub-app — handles control-plane queries from local runtime.
 *
 * Implements the credential resolution endpoint:
 *   GET /v1/projects/:projectId/connectors/secret?ref=tmc_ref_...
 *
 * Returns the decrypted credential token for the given project + secretRef.
 * Secured via the request bearer token: only authenticated accounts that own
 * or have write access to the project can fetch its connector secrets.
 */

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { decryptToken } from "../utils";
import { getDB } from "../db";
import { connectors } from "../db/schema";
import { NotFoundError, ValidationError } from "./errors";
import type { ApiEnv } from "./index";
import { json } from "./json";
import { createAuthMiddleware } from "./middleware/auth";
import { assertOwns, loadProject } from "./sync/shared";

export const connectorsApp = new Hono<ApiEnv>();

// Middleware spine: bind request-wide db and auth.
connectorsApp.use("*", async (c, next) => {
	const db = c.get("db") ?? getDB();
	c.set("db", db);

	const salt = c.env.API_KEY_SALT || "";
	const auth = createAuthMiddleware(db, salt);
	return auth(c, next);
});

connectorsApp.get("/secret", async (c) => {
	const db = c.get("db")!;
	const account = c.get("account")!;
	const projectId = c.req.param("projectId");
	const ref = c.req.query("ref");

	if (!projectId) {
		throw new ValidationError("projectId is required.");
	}
	if (!ref) {
		throw new ValidationError("Query parameter 'ref' is required.");
	}

	const project = await loadProject(db, projectId);
	if (!project) {
		throw new NotFoundError(`Project not found: ${projectId}`);
	}

	await assertOwns(db, project, account.id);

	const rows = await db
		.select({
			encryptedSecret: connectors.encryptedSecret,
		})
		.from(connectors)
		.where(
			and(eq(connectors.projectId, projectId), eq(connectors.secretRef, ref)),
		)
		.limit(1);

	const row = rows[0];
	if (!row) {
		throw new NotFoundError(`Secret not found for ref: ${ref}`);
	}

	const encryptionKey = c.env.ENCRYPTION_KEY;
	if (!encryptionKey) {
		throw new Error("ENCRYPTION_KEY secret is not set on the server.");
	}

	const secret = await decryptToken(row.encryptedSecret, encryptionKey);

	return json(c, { secret });
});
