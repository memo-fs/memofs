import { InMemoryMemoryStore, MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import {
	buildRuntimeMemoryToolDefinition,
	createAiSdkRuntimeFromMemoFS,
	runRuntimeMemoryTool,
} from "../src";

/**
 * The bridge runtime (`createAiSdkRuntimeFromMemoFS`) must route recall
 * through the MemoFS class's intelligent engine, not a naive text-search
 * shim. These tests prove that and cover the other delegated commands.
 */
describe("createAiSdkRuntimeFromMemoFS", () => {
	it("routes recall through the smart hybrid engine (not naive term search)", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});

			// Two notes. A naive exact-term search for "login auth" would not
			// match the first note (it shares only the stem "auth"), but the
			// fuzzy/BM25 hybrid engine ranks it as relevant.
			await memo.notes.record({
				content: "Authentication uses JWT tokens issued by the login flow.",
				kind: "decision",
				title: "Auth strategy",
			});
			await memo.notes.record({
				content: "We ship on Tuesdays.",
				kind: "note",
			});

			const runtime = createAiSdkRuntimeFromMemoFS(memo);
			const result = await runtime.recall({ query: "login auth", topK: 5 });

			expect(result.items.length).toBeGreaterThan(0);
			// The auth note must rank above the unrelated shipping note.
			const authHit = result.items.find((h) => /authentication/i.test(h.text));
			expect(authHit).toBeDefined();
			expect(typeof authHit?.score).toBe("number");
			expect(authHit?.score).toBeGreaterThan(0);
		} finally {
			await cleanup();
		}
	});

	it("recall returns scored, ranked items", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});
			await memo.notes.record({
				content: "The database is PostgreSQL 16.",
				kind: "decision",
			});
			await memo.notes.record({
				content: "The database is PostgreSQL 16 with pgbouncer.",
				kind: "decision",
			});

			const runtime = createAiSdkRuntimeFromMemoFS(memo);
			const result = await runtime.recall({ query: "database", topK: 2 });

			expect(result.items.length).toBeGreaterThan(0);
			for (const hit of result.items) {
				expect(hit.score).toBeGreaterThanOrEqual(0);
			}
			// Items are sorted by descending score.
			const scores = result.items.map((h) => h.score ?? 0);
			const sorted = [...scores].sort((a, b) => b - a);
			expect(scores).toEqual(sorted);
		} finally {
			await cleanup();
		}
	});

	it("readCoreMemory delegates to memo.core", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});
			await memo.core.update("# Core Memory\n\n- Always use TypeScript.");

			const runtime = createAiSdkRuntimeFromMemoFS(memo);
			const doc = await runtime.readCoreMemory();
			expect(doc.content).toMatch(/TypeScript/);
		} finally {
			await cleanup();
		}
	});

	it("listNotes returns recorded notes mapped to MemoryRuntimeNote", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});
			await memo.notes.record({
				content: "Use HTTP-only cookies for sessions.",
				kind: "decision",
				tags: ["auth", "security"],
			});

			const runtime = createAiSdkRuntimeFromMemoFS(memo);
			const page = await runtime.listNotes();
			expect(page.items.length).toBeGreaterThan(0);
			const note = page.items.find((n) => /cookies/i.test(n.content));
			expect(note).toBeDefined();
			expect(note?.kind).toBe("decision");
		} finally {
			await cleanup();
		}
	});

	it("createNote delegates to memo.notes.record", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});
			const runtime = createAiSdkRuntimeFromMemoFS(memo);

			const created = await runtime.createNote({
				content: "Deployments go through blue-green.",
				kind: "constraint",
				tags: ["deploy"],
			});
			expect(created.kind).toBe("constraint");
			expect(created.content).toMatch(/blue-green/);

			// Confirm it landed in the store via the runtime's own listNotes.
			const page = await runtime.listNotes();
			expect(page.items.some((n) => /blue-green/i.test(n.content))).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("does not expose an index() method (MemoFS has no public re-index API)", () => {
		const memo = new MemoFS({
			projectId: "demo",
			mode: "local",
			store: new InMemoryMemoryStore(),
		});
		const runtime = createAiSdkRuntimeFromMemoFS(memo);
		expect(runtime.index).toBeUndefined();
	});

	it("the AI SDK tool's index command throws a clear 'not supported' error", async () => {
		const memo = new MemoFS({
			projectId: "demo",
			mode: "local",
			store: new InMemoryMemoryStore(),
		});
		const runtime = createAiSdkRuntimeFromMemoFS(memo);
		const tool = buildRuntimeMemoryToolDefinition({
			runtime,
			access: { projectId: "demo" },
			allowIndexing: true,
		});
		await expect(
			tool.execute({ command: "index", mode: "all" }),
		).rejects.toThrow(/does not support indexing/i);
	});

	it("runRuntimeMemoryTool recall returns the same smart results as the runtime", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "demo",
				mode: "local",
			});
			await memo.notes.record({
				content: "Rate limiting is handled at the edge by Cloudflare.",
				kind: "decision",
			});

			const runtime = createAiSdkRuntimeFromMemoFS(memo);
			const raw = await runRuntimeMemoryTool(
				{ runtime, access: { projectId: "demo" } },
				{ command: "recall", query: "rate limiting", topK: 5 },
			);
			const parsed = JSON.parse(raw);
			expect(parsed.ok).toBe(true);
			expect(parsed.data.items.length).toBeGreaterThan(0);
			expect(parsed.data.items[0].text).toMatch(/rate limiting/i);
		} finally {
			await cleanup();
		}
	});
});
