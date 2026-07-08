/**
 * Connectors API sub-app — handles control-plane queries from local runtime.
 *
 * Implements the credential resolution endpoint:
 *   GET /v1/projects/:projectId/connectors/secret?ref=tmc_ref_...
 *
 * Returns the decrypted credential token for the given project + secretRef.
 * Secured via the request bearer token: only authenticated accounts that own
 * or have write access to the project can fetch its connector secrets.
 *
 * DB access is handled via `getDB()` calls — no middleware needed since
 * `getDB()` is memoized per isolate.
 */

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { secret } from "../../lib/env";
import { getDB } from "../db";
import { connectors } from "../db/schema";
import { decryptToken } from "../utils";
import { NotFoundError, ValidationError } from "./errors";
import type { ApiEnv } from "./index";
import { json } from "./json";
import { createAuthMiddleware } from "./middleware/auth";
import { assertOwns, loadProject } from "./sync/shared";

export const connectorsApp = new Hono<ApiEnv>();

// Middleware spine: bind auth.
connectorsApp.use("*", async (c, next) => {
	const salt = secret("API_KEY_SALT");
	const auth = createAuthMiddleware(salt);
	return auth(c, next);
});

connectorsApp.get("/secret", async (c) => {
	const db = getDB();
	const account = c.get("account")!;
	const projectId = c.req.param("projectId");
	const ref = c.req.query("ref");

	if (!projectId) {
		throw new ValidationError("projectId is required.");
	}
	if (!ref) {
		throw new ValidationError("Query parameter 'ref' is required.");
	}

	const project = await loadProject(projectId);
	if (!project) {
		throw new NotFoundError(`Project not found: ${projectId}`);
	}

	await assertOwns(project, account.id);

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

	const encryptionKey = secret("ENCRYPTION_KEY");
	const decrypted = await decryptToken(row.encryptedSecret, encryptionKey);

	return json(c, { secret: decrypted });
});
