import type { MemoryEmbedder } from "@tekbreed/tekmemo";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/index.server";
import { createFakeR2Bucket, createTestEnv } from "../../test-utils/env";
import { createTestDb } from "../../test-utils/db";
import { createHostedRuntime } from "../hosted-runtime";

/**
 * Integration test: the hosted `Tekmemo` runtime reads/writes the *same* R2
 * blobs + Turso `project_files` manifest the file-replica sync handler owns
 * (ADR 0012 reuse sub-decision). This is the single proof that Phase 3's
 * substrate is live: one set of files, the runtime a new reader/writer.
 *
 * Network-bound adapters (Voyage embedder/reranker, Workers AI extractor) are
 * replaced with deterministic fakes via the `overrides` test seam, so the suite
 * exercises the real R2 + Turso paths without live calls.
 */

import { accounts, projects } from "../../db/schema";

let db: ReturnType<typeof createTestDb> extends Promise<infer D> ? D : never;

/** Seeds an account + project so `project_files`'s FK constraints hold. */
async function seedProject(projectId: string): Promise<void> {
	await db.insert(accounts).values({
		id: "acct_test",
		plan: "pro",
		maxHostedStorageBytes: 10 * 1024 ** 3,
		maxConnectors: 3,
	});
	await db.insert(projects).values({
		id: projectId,
		accountId: "acct_test",
		name: projectId,
	});
}

/**
 * Deterministic fake embedder: a fixed unit vector per text, so recall returns
 * consistent results without a network call. Satisfies `MemoryEmbedder`.
 */
function fakeEmbedder(): MemoryEmbedder {
	const DIM = 8;
	const embed = (text: string): number[] => {
		// A cheap deterministic hash → unit-ish vector of fixed length.
		const vec = new Array(DIM).fill(0);
		for (let i = 0; i < text.length; i++) {
			vec[i % DIM] += text.charCodeAt(i);
		}
		const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
		return vec.map((v) => v / norm);
	};
	const record = (text: string, index: number) => ({
		text,
		embedding: embed(text),
		index,
		model: "fake-embed",
		dimensions: DIM,
	});
	return {
		async embedText(text: string) {
			return record(text, 0);
		},
		async embedTexts(input: { texts: string[] }) {
			return {
				embeddings: input.texts.map((t, i) => record(t, i)),
				model: "fake-embed",
				usage: { totalTokens: input.texts.length },
			};
		},
	};
}

beforeEach(async () => {
	db = await createTestDb();
});

afterEach(async () => {
	await (
		db as unknown as { $client: { close(): Promise<void> } }
	).$client.close();
});

describe("createHostedRuntime — ADR 0012 reuse", () => {
	it("bootstraps the canonical files into R2 + project_files", async () => {
		// Hold the fake bucket's backing Map so we can assert blobs landed.
		const { bucket, blobs } = createFakeR2Bucket();
		await seedProject("proj_1");
		const tek = createHostedRuntime({
			env: createTestEnv({ BLOBS: bucket }),
			db,
			projectId: "proj_1",
			overrides: { embedder: fakeEmbedder() },
		});

		// `writeMemory` triggers `ensureReady` → bootstrap, which writes the
		// canonical files through the R2 store.
		await tek.writeMemory({ content: "TekMemo uses BM25 for lexical recall." });

		// Canonical files landed as manifest rows + content-addressed R2 blobs.
		const rows = await db.$client.execute({
			sql: "SELECT path, sha256, r2_key FROM project_files WHERE project_id = ?",
			args: ["proj_1"],
		});
		expect(rows.rows.length).toBeGreaterThan(0);
		const paths = rows.rows.map((r) => String(r.path));
		expect(paths).toContain(".tekmemo/memory/core.md");

		// Every manifest row's blob actually exists in R2 under its sha256 key.
		for (const row of rows.rows) {
			const key = String(row.r2_key);
			expect(blobs.has(key)).toBe(true);
		}
	});

	it("writes a memory that is then recallable through the hosted runtime", async () => {
		await seedProject("proj_1");
		const tek = createHostedRuntime({
			env: createTestEnv(),
			db,
			projectId: "proj_1",
			overrides: { embedder: fakeEmbedder() },
		});

		await tek.writeMemory({
			content:
				"The hosted runtime runs the same engine against R2-resident files.",
			title: "hosted-memory",
		});

		const result = await tek.recall("hosted runtime R2", { limit: 5 });
		// `recall` returns `{ items: RecallItem[], warnings? }`.
		expect(Array.isArray(result.items)).toBe(true);
		expect(result.items.length).toBeGreaterThan(0);
	});

	it("shares the project_files layout the sync handler writes (r2_key === sha256)", async () => {
		await seedProject("proj_1");
		const tek = createHostedRuntime({
			env: createTestEnv(),
			db,
			projectId: "proj_1",
			overrides: { embedder: fakeEmbedder() },
		});

		await tek.writeMemory({
			content: "a memory written through the hosted runtime",
		});

		const rows = await db.$client.execute({
			sql: "SELECT sha256, r2_key FROM project_files WHERE project_id = ?",
			args: ["proj_1"],
		});
		// Every row obeys the content-addressing invariant the sync handler relies on.
		for (const row of rows.rows) {
			expect(String(row.sha256)).toHaveLength(64);
			expect(String(row.r2_key)).toBe(String(row.sha256));
		}
	});

	it("isolates two projects by projectId", async () => {
		const env = createTestEnv();
		await seedProject("proj_a");
		await db.insert(projects).values({
			id: "proj_b",
			accountId: "acct_test",
			name: "proj_b",
		});

		await createHostedRuntime({
			env,
			db,
			projectId: "proj_a",
			overrides: { embedder: fakeEmbedder() },
		}).writeMemory({ content: "project A memory" });
		await createHostedRuntime({
			env,
			db,
			projectId: "proj_b",
			overrides: { embedder: fakeEmbedder() },
		}).writeMemory({ content: "project B memory" });

		const a = await db.$client.execute({
			sql: "SELECT count(*) AS n FROM project_files WHERE project_id = ?",
			args: ["proj_a"],
		});
		const b = await db.$client.execute({
			sql: "SELECT count(*) AS n FROM project_files WHERE project_id = ?",
			args: ["proj_b"],
		});
		expect(Number(a.rows[0]?.n)).toBeGreaterThan(0);
		expect(Number(b.rows[0]?.n)).toBeGreaterThan(0);
	});
});
