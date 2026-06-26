import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../../../db/index.server";
import {
	accounts,
	projectFiles,
	projects,
	syncCursors,
} from "../../../db/schema";
import { createTestDb } from "../../../test-utils/db";
import {
	deleteProject,
	getProjectForAccount,
	listProjectCursorHistory,
	listProjectFiles,
	listProjectsForAccount,
	recentSyncActivity,
} from "../projects";

/**
 * Project query-layer tests.
 *
 * Seeds accounts + projects + file rows + sync cursors, then asserts the
 * dashboard reads aggregate correctly: storage totals, file counts, cursor
 * values, last-sync timestamps, and — critically — ownership isolation (one
 * account never sees another's project).
 */

const ACCT_A = "acct_a";
const ACCT_B = "acct_b";
const PROJ_OWNED = "proj_owned";
const PROJ_OTHER = "proj_other";
const PROJ_EMPTY = "proj_empty";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await db.insert(accounts).values([
		{ id: ACCT_A, plan: "free" },
		{ id: ACCT_B, plan: "free" },
	]);
	await db.insert(projects).values([
		{ id: PROJ_OWNED, accountId: ACCT_A, name: "owned", isDefault: true },
		{ id: PROJ_EMPTY, accountId: ACCT_A, name: "empty" },
		{ id: PROJ_OTHER, accountId: ACCT_B, name: "other" },
	]);
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

/** Inserts a sync cursor row for `projectId` at `seq` with the given timestamp. */
async function seedCursor(
	projectId: string,
	seq: number,
	createdAt: string,
): Promise<void> {
	await db.insert(syncCursors).values({
		id: `cur_${projectId}_${seq}`,
		projectId,
		seq,
		kind: "push",
		createdAt,
	});
}

/** Inserts a project_files row for `projectId` at `path`. */
async function seedFile(
	projectId: string,
	path: string,
	sizeBytes = 1024,
	sha256 = "a".repeat(64),
): Promise<void> {
	await db.insert(projectFiles).values({
		projectId,
		path,
		sha256,
		r2Key: sha256,
		sizeBytes,
	});
}

describe("listProjectsForAccount", () => {
	it("returns only the account's projects", async () => {
		const result = await listProjectsForAccount(db, ACCT_A);
		expect(result.map((p) => p.id).sort()).toEqual([PROJ_EMPTY, PROJ_OWNED]);
	});

	it("aggregates file count + storage per project", async () => {
		await db.insert(projectFiles).values([
			{
				id: "f1",
				projectId: PROJ_OWNED,
				path: ".tekmemo/config.json",
				sha256: "a".repeat(64),
				r2Key: "a".repeat(64),
				sizeBytes: 1024,
			},
			{
				id: "f2",
				projectId: PROJ_OWNED,
				path: ".tekmemo/core.md",
				sha256: "b".repeat(64),
				r2Key: "b".repeat(64),
				sizeBytes: 512,
			},
		]);
		// commitPush keeps projects.total_storage_bytes in sync; mirror that here.
		await db
			.update(projects)
			.set({ totalStorageBytes: 1536 })
			.where(eq(projects.id, PROJ_OWNED));

		const result = await listProjectsForAccount(db, ACCT_A);
		const owned = result.find((p) => p.id === PROJ_OWNED);
		expect(owned).toBeDefined();
		expect(owned?.fileCount).toBe(2);
		expect(owned?.storageBytes).toBe(1536);
	});

	it("reports null lastSyncAt and cursor '0' for a never-pushed project", async () => {
		const result = await listProjectsForAccount(db, ACCT_A);
		const empty = result.find((p) => p.id === PROJ_EMPTY);
		expect(empty).toBeDefined();
		expect(empty?.lastSyncAt).toBeNull();
		expect(empty?.cursor).toBe("0");
		expect(empty?.fileCount).toBe(0);
	});

	it("reports the latest cursor + last-sync time after pushes", async () => {
		await seedCursor(PROJ_OWNED, 1, "2026-06-20T10:00:00Z");
		await seedCursor(PROJ_OWNED, 3, "2026-06-22T14:30:00Z");
		await seedCursor(PROJ_OWNED, 2, "2026-06-21T09:00:00Z");

		const result = await listProjectsForAccount(db, ACCT_A);
		const owned = result.find((p) => p.id === PROJ_OWNED);
		expect(owned).toBeDefined();
		expect(owned?.cursor).toBe("3");
		expect(owned?.lastSyncAt).toBe("2026-06-22T14:30:00Z");
	});

	it("returns [] for an account with no projects", async () => {
		const result = await listProjectsForAccount(db, "acct_nobody");
		expect(result).toEqual([]);
	});
});

describe("getProjectForAccount", () => {
	it("returns the project when owned", async () => {
		const result = await getProjectForAccount(db, ACCT_A, PROJ_OWNED);
		expect(result?.id).toBe(PROJ_OWNED);
		expect(result?.name).toBe("owned");
		expect(result?.isDefault).toBe(true);
	});

	it("returns null for a project owned by another account (no cross leak)", async () => {
		const result = await getProjectForAccount(db, ACCT_A, PROJ_OTHER);
		expect(result).toBeNull();
	});

	it("returns null for a nonexistent project", async () => {
		const result = await getProjectForAccount(db, ACCT_A, "ghost");
		expect(result).toBeNull();
	});
});

describe("recentSyncActivity", () => {
	it("returns the most recent cursors, newest first", async () => {
		await seedCursor(PROJ_OWNED, 1, "2026-06-20T10:00:00Z");
		await seedCursor(PROJ_OWNED, 3, "2026-06-22T14:30:00Z");
		await seedCursor(PROJ_OWNED, 2, "2026-06-21T09:00:00Z");

		const activity = await recentSyncActivity(db, PROJ_OWNED);
		expect(activity.map((a) => a.cursor)).toEqual(["3", "2", "1"]);
		expect(activity[0].at).toBe("2026-06-22T14:30:00Z");
	});

	it("respects the limit", async () => {
		await seedCursor(PROJ_OWNED, 1, "2026-06-20T10:00:00Z");
		await seedCursor(PROJ_OWNED, 2, "2026-06-21T09:00:00Z");
		await seedCursor(PROJ_OWNED, 3, "2026-06-22T14:30:00Z");

		const activity = await recentSyncActivity(db, PROJ_OWNED, 2);
		expect(activity).toHaveLength(2);
	});

	it("returns [] for a project with no cursors", async () => {
		const activity = await recentSyncActivity(db, PROJ_EMPTY);
		expect(activity).toEqual([]);
	});
});

describe("listProjectFiles", () => {
	it("returns the project's files, path-sorted", async () => {
		await seedFile(PROJ_OWNED, ".tekmemo/zeta.md", 512, "b".repeat(64));
		await seedFile(PROJ_OWNED, ".tekmemo/alpha.md", 1024, "a".repeat(64));
		await seedFile(PROJ_OTHER, ".tekmemo/other.md", 2048, "c".repeat(64));

		const files = await listProjectFiles(db, PROJ_OWNED);
		expect(files.map((f) => f.path)).toEqual([
			".tekmemo/alpha.md",
			".tekmemo/zeta.md",
		]);
		expect(files[0].sizeBytes).toBe(1024);
		expect(files[0].sha256).toBe("a".repeat(64));
	});

	it("does not leak another project's files", async () => {
		await seedFile(PROJ_OWNED, ".tekmemo/owned.md");
		await seedFile(PROJ_OTHER, ".tekmemo/other.md");

		const files = await listProjectFiles(db, PROJ_OWNED);
		expect(files).toHaveLength(1);
		expect(files[0].path).toBe(".tekmemo/owned.md");
	});

	it("returns [] for a project with no files", async () => {
		expect(await listProjectFiles(db, PROJ_EMPTY)).toEqual([]);
	});
});

describe("listProjectCursorHistory", () => {
	it("returns cursors newest-first with kind + createdAt", async () => {
		await seedCursor(PROJ_OWNED, 1, "2026-06-20T10:00:00Z");
		await seedCursor(PROJ_OWNED, 3, "2026-06-22T14:30:00Z");
		await seedCursor(PROJ_OWNED, 2, "2026-06-21T09:00:00Z");

		const history = await listProjectCursorHistory(db, PROJ_OWNED);
		expect(history.map((c) => c.cursor)).toEqual(["3", "2", "1"]);
		expect(history[0].kind).toBe("push");
		expect(history[0].createdAt).toBe("2026-06-22T14:30:00Z");
	});

	it("returns [] for a never-pushed project", async () => {
		expect(await listProjectCursorHistory(db, PROJ_EMPTY)).toEqual([]);
	});
});

describe("deleteProject", () => {
	it("deletes an owned project and cascades to its files + cursors", async () => {
		await seedFile(PROJ_OWNED, ".tekmemo/a.md");
		await seedCursor(PROJ_OWNED, 1, "2026-06-20T10:00:00Z");

		const deleted = await deleteProject(db, ACCT_A, PROJ_OWNED);
		expect(deleted).toBe(true);

		// The project row is gone.
		const gone = await db
			.select({ id: projects.id })
			.from(projects)
			.where(eq(projects.id, PROJ_OWNED));
		expect(gone).toHaveLength(0);

		// Cascade purged the dependents.
		const fileRows = await db
			.select({ path: projectFiles.path })
			.from(projectFiles)
			.where(eq(projectFiles.projectId, PROJ_OWNED));
		expect(fileRows).toHaveLength(0);
		const cursorRows = await db
			.select({ id: syncCursors.id })
			.from(syncCursors)
			.where(eq(syncCursors.projectId, PROJ_OWNED));
		expect(cursorRows).toHaveLength(0);
	});

	it("returns false for a project owned by another account (no cross delete)", async () => {
		// ACCT_A tries to delete ACCT_B's project.
		const deleted = await deleteProject(db, ACCT_A, PROJ_OTHER);
		expect(deleted).toBe(false);

		// The other account's project is untouched.
		const stillThere = await getProjectForAccount(db, ACCT_B, PROJ_OTHER);
		expect(stillThere?.id).toBe(PROJ_OTHER);
	});

	it("returns false for a nonexistent project", async () => {
		expect(await deleteProject(db, ACCT_A, "ghost")).toBe(false);
	});
});
