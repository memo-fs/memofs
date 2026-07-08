/**
 * Connector queries — CRUD for the connectors control-plane (SC3.3).
 *
 * Pure `(db, …)` functions, no Hono/Worker coupling, so they unit-test with
 * the in-memory `createTestDb()` harness. The encrypted token
 * (`encryptedSecret`) is never returned to the dashboard — the `ConnectorView`
 * type strips it. The raw token is only retrievable via the authenticated
 * `/v1/connectors/:id/secret` API call (used by the local runtime at run time).
 *
 * @see docs/architecture/screens-locked.md SC3.3 — connectors spec.
 * @see docs/adr/0002-connectors-run-locally.md — config/secrets model.
 */

import { and, count, eq } from "drizzle-orm";
import { invariant } from "../../utils/misc";
import { getDB } from "../db";
import {
	type Connector,
	type ConnectorType,
	connectors,
	projects,
} from "../db/schema";

/** The dashboard-facing connector shape — no `encryptedSecret` (never exposed). */
export interface ConnectorView {
	id: string;
	projectId: string;
	type: ConnectorType;
	name: string;
	enabled: boolean;
	schedule: string;
	sourceMapping: string;
	secretRef: string;
	lastRunAt: string | null;
	lastRunStatus: Connector["lastRunStatus"];
	createdAt: string;
}

/** Maps a DB row to the safe `ConnectorView` (strips the encrypted token). */
function toView(row: typeof connectors.$inferSelect): ConnectorView {
	return {
		id: row.id,
		projectId: row.projectId,
		type: row.type,
		name: row.name,
		enabled: row.enabled,
		schedule: row.schedule,
		sourceMapping: row.sourceMapping,
		secretRef: row.secretRef,
		lastRunAt: row.lastRunAt,
		lastRunStatus: row.lastRunStatus,
		createdAt: row.createdAt,
	};
}

/** Lists all connectors for a project, ordered by creation time. */
export async function listConnectorsForProject(
	projectId: string,
): Promise<ConnectorView[]> {
	const db = getDB();
	const rows = await db
		.select()
		.from(connectors)
		.where(eq(connectors.projectId, projectId));
	return rows.map(toView);
}

/** Counts active connectors for a project — used for cap enforcement. */
export async function countConnectorsForProject(
	projectId: string,
): Promise<number> {
	const db = getDB();
	const rows = await db
		.select({ n: count() })
		.from(connectors)
		.where(eq(connectors.projectId, projectId));
	return rows[0]?.n ?? 0;
}

/** Fetches a single connector by id (returns the safe view). */
export async function getConnector(id: string): Promise<ConnectorView | null> {
	const db = getDB();
	const rows = await db
		.select()
		.from(connectors)
		.where(eq(connectors.id, id))
		.limit(1);
	return rows[0] ? toView(rows[0]) : null;
}

/** Fetches the encrypted secret for a connector (used by the secret-fetch API). */
export async function getConnectorSecret(
	id: string,
): Promise<{ encryptedSecret: string; projectId: string } | null> {
	const db = getDB();
	const rows = await db
		.select({
			encryptedSecret: connectors.encryptedSecret,
			projectId: connectors.projectId,
		})
		.from(connectors)
		.where(eq(connectors.id, id))
		.limit(1);
	return rows[0] ?? null;
}

/** Input for creating a connector. */
export interface CreateConnectorInput {
	projectId: string;
	type: ConnectorType;
	name: string;
	schedule?: string;
	sourceMapping?: string;
	enabled?: boolean;
	secretRef: string;
	encryptedSecret: string;
}

/** Creates a connector. Callers must enforce the cap BEFORE calling this. */
export async function createConnector(
	input: CreateConnectorInput,
): Promise<ConnectorView> {
	const db = getDB();
	const id = generateConnectorId();
	const rows = await db
		.insert(connectors)
		.values({
			id,
			projectId: input.projectId,
			type: input.type,
			name: input.name,
			enabled: input.enabled ?? true,
			schedule: input.schedule ?? "Every 1h",
			sourceMapping: input.sourceMapping ?? "",
			secretRef: input.secretRef,
			encryptedSecret: input.encryptedSecret,
		})
		.returning();
	invariant(rows[0], "Connector insert failed");
	return toView(rows[0]);
}

/** Input for updating a connector (all fields optional). */
export interface UpdateConnectorInput {
	name?: string;
	enabled?: boolean;
	schedule?: string;
	sourceMapping?: string;
	encryptedSecret?: string;
}

/** Updates a connector. Only the provided fields are touched. */
export async function updateConnector(
	id: string,
	input: UpdateConnectorInput,
): Promise<void> {
	const db = getDB();
	const updates: Record<string, unknown> = {};
	if (input.name !== undefined) updates.name = input.name;
	if (input.enabled !== undefined) updates.enabled = input.enabled;
	if (input.schedule !== undefined) updates.schedule = input.schedule;
	if (input.sourceMapping !== undefined)
		updates.sourceMapping = input.sourceMapping;
	if (input.encryptedSecret !== undefined)
		updates.encryptedSecret = input.encryptedSecret;
	if (Object.keys(updates).length === 0) return;
	await db.update(connectors).set(updates).where(eq(connectors.id, id));
}

/** Deletes a connector. */
export async function deleteConnector(id: string): Promise<void> {
	const db = getDB();
	await db.delete(connectors).where(eq(connectors.id, id));
}

/** Verifies a project belongs to `accountId` (access control for API routes). */
export async function verifyProjectOwnership(
	projectId: string,
	accountId: string,
): Promise<boolean> {
	const db = getDB();
	const rows = await db
		.select({ id: projects.id })
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.accountId, accountId)))
		.limit(1);
	return rows.length > 0;
}

/** Generates a `mfc_<32 random hex>` connector id (memofs-connector prefix). */
function generateConnectorId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
		"",
	);
	return `mfc_${hex}`;
}
