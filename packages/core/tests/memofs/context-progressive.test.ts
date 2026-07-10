/**
 * End-to-end tests for progressive recall (ADR 0009 Component 4 / Q27).
 *
 * The unit tests in `progressive.test.ts` cover the machinery in isolation.
 * This file covers the integration through the public `memo.context()` API:
 * the compact default, the expand round-trip, the `detail: "full"` escape
 * hatch, graceful cache-miss fallback, and in-memory-store parity.
 */

import { describe, expect, it } from "vitest";
import { InMemoryMemoryStore, MemoFS } from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

const CORE = [
	"# Core Memory",
	"",
	"MemoFS is a file-first long-term memory system.",
	"All formatting goes through Biome.",
].join("\n");

/** Seed enough notes that the compact recall cap leaves fragments to expand. */
async function seedFixture(rootDir: string, projectId = "progressive") {
	const memo = new MemoFS({
		store: createNodeFsMemoryStore({
			rootDir,
			createRoot: true,
			missingFileBehavior: "empty",
		}),
		rootDir,
		projectId,
		mode: "local",
	});
	await memo.core.update(CORE);
	// Six notes about distinct topics so recall returns more than the compact
	// cap of 3 fragments.
	const notes = [
		[
			"Auth strategy",
			"Authentication uses JWT tokens issued at login.",
			"decision",
		],
		[
			"Deploy pipeline",
			"The deployment pipeline runs on GitHub Actions.",
			"reference",
		],
		["Package manager", "We prefer pnpm for package management.", "preference"],
		[
			"Test runner",
			"Vitest is the test runner for the memofs package.",
			"reference",
		],
		["Formatting", "Biome handles linting and formatting.", "decision"],
		["Database", "SQLite is the default local database engine.", "reference"],
	] as const;
	for (const [title, content, kind] of notes) {
		await memo.notes.record({ content, kind, title });
	}
	return memo;
}

describe("memofs.context — progressive recall (ADR 0009 Component 4 / Q27)", () => {
	describe("compact default", () => {
		it("returns a small briefing with expandable affordances", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const result = await memo.context({ query: "auth deploy pnpm test" });

				// Directive + core always lead.
				expect(result.sections[0]?.type).toBe("directive");
				expect(result.sections.map((s) => s.type)).toContain("core");
				// Compact mode populates the expandable list.
				expect(result.expandable).toBeDefined();
				expect(result.expandable?.length).toBeGreaterThan(0);
				// The affordance lines appear in the rendered text.
				expect(result.text).toMatch(/expand.*memofs\.context/);
				// Compact stays small (well under the 64kb full budget).
				expect(Buffer.byteLength(result.text, "utf8")).toBeLessThan(10_000);
			} finally {
				await cleanup();
			}
		});

		it("caps recall to the compact fragment count", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const result = await memo.context({ query: "auth deploy pnpm test" });
				// The rendered recall section has at most 3 fragments (compact cap).
				const recallSection = result.sections.find((s) => s.type === "recall");
				if (recallSection) {
					const fragmentCount = recallSection.content
						.split("\n\n")
						.filter(Boolean).length;
					expect(fragmentCount).toBeLessThanOrEqual(3);
				}
				// The expandable recall affordance advertises the remainder.
				const recallAffordance = result.expandable?.find(
					(a) => a.section === "recall",
				);
				expect(recallAffordance).toBeDefined();
				expect(recallAffordance?.available).toBeGreaterThan(0);
			} finally {
				await cleanup();
			}
		});
	});

	describe("expand round-trip", () => {
		it("expands the recall section from the cached pointers", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const first = await memo.context({ query: "auth deploy pnpm test" });

				const recallAffordance = first.expandable?.find(
					(a) => a.section === "recall",
				);
				expect(recallAffordance).toBeDefined();

				const expanded = await memo.context({
					query: "auth deploy pnpm test",
					section: "recall",
					expand: recallAffordance?.cursor,
				});

				// The expanded result is a single-section briefing.
				expect(expanded.sections[0]?.type).toBe("directive");
				const recallSection = expanded.sections.find(
					(s) => s.type === "recall",
				);
				expect(recallSection).toBeDefined();
				expect(recallSection?.title).toMatch(/expanded/i);
				// The expanded recall has MORE fragments than the compact slice.
				const expandedCount =
					recallSection?.content.split("\n\n").filter(Boolean).length ?? 0;
				expect(expandedCount).toBeGreaterThan(3);
				// No expandable affordances on an expand call.
				expect(expanded.expandable).toBeUndefined();
			} finally {
				await cleanup();
			}
		});

		it("expands the notes section", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const first = await memo.context({ query: "auth deploy pnpm test" });

				const notesAffordance = first.expandable?.find(
					(a) => a.section === "notes",
				);
				// Notes affordance is present (the runtime has a notes reader).
				expect(notesAffordance).toBeDefined();

				const expanded = await memo.context({
					query: "auth deploy pnpm test",
					section: "notes",
					expand: notesAffordance?.cursor,
				});

				const notesSection = expanded.sections.find((s) => s.type === "notes");
				// The expanded notes section is present (may be empty if no notes
				// content, but the section title marks it expanded).
				if (notesSection) {
					expect(notesSection.title).toMatch(/expanded/i);
				}
			} finally {
				await cleanup();
			}
		});

		it("reuses cached resolution — no re-rewrite", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const first = await memo.context({ query: "auth" });
				const recallAffordance = first.expandable?.find(
					(a) => a.section === "recall",
				);
				if (!recallAffordance) return; // nothing to expand

				// Second call with the cursor must not throw and must return the
				// expanded section (proving the cache hit path works).
				const expanded = await memo.context({
					query: "auth",
					section: "recall",
					expand: recallAffordance.cursor,
				});
				expect(expanded.sections.some((s) => s.type === "recall")).toBe(true);
			} finally {
				await cleanup();
			}
		});
	});

	describe('detail: "full" escape hatch', () => {
		it("returns the whole-budget output with no affordances", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const result = await memo.context({
					query: "auth deploy pnpm test",
					detail: "full",
				});

				// Full mode does NOT populate expandable.
				expect(result.expandable).toBeUndefined();
				// Full mode does NOT append affordance lines.
				expect(result.text).not.toMatch(/expand.*memofs\.context/);
				// Full mode renders all matching recall fragments (no compact cap).
				const recallSection = result.sections.find((s) => s.type === "recall");
				if (recallSection) {
					const count = recallSection.content
						.split("\n\n")
						.filter(Boolean).length;
					expect(count).toBeGreaterThan(3);
				}
			} finally {
				await cleanup();
			}
		});
	});

	describe("graceful degradation", () => {
		it("falls back to a compact briefing on a corrupted expand cursor", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				const result = await memo.context({
					query: "auth deploy pnpm test",
					section: "recall",
					expand: "!!!not-a-valid-cursor!!!",
				});

				// Falls back to compact (directive floor + sections), not an error.
				expect(result.sections[0]?.type).toBe("directive");
				expect(result.warnings).toBeDefined();
				expect(
					result.warnings?.some((w) => /invalid or expired/i.test(w)),
				).toBe(true);
			} finally {
				await cleanup();
			}
		});

		it("falls back to a compact briefing on an expired (cache-miss) cursor", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const memo = await seedFixture(rootDir);
				// First call to populate the cache, then synthesize a cursor with a
				// key that was never stored.
				await memo.context({ query: "auth" });
				const { encodeExpansionCursor } = await import(
					"../../src/memofs/progressive"
				);
				const bogusCursor = encodeExpansionCursor({
					v: 1,
					key: "never-stored-key",
					section: "recall",
				});
				const result = await memo.context({
					query: "auth",
					section: "recall",
					expand: bogusCursor,
				});

				expect(result.sections[0]?.type).toBe("directive");
				expect(
					result.warnings?.some((w) => /invalid or expired/i.test(w)),
				).toBe(true);
			} finally {
				await cleanup();
			}
		});
	});

	describe("in-memory store parity", () => {
		it("compact works with an in-memory store (verifies cache wiring)", async () => {
			const memo = new MemoFS({ mode: "local", store: new InMemoryMemoryStore() });
			await memo.core.update(CORE);
			await memo.notes.record({
				content: "Authentication uses JWT tokens.",
				kind: "decision",
			});
			await memo.notes.record({
				content: "Deploy runs on GitHub Actions.",
				kind: "reference",
			});

			const result = await memo.context({ query: "auth" });
			expect(result.sections[0]?.type).toBe("directive");
			// In-memory store has a notes reader, so notes is expandable.
			expect(result.expandable?.some((a) => a.section === "notes")).toBe(true);
		});
	});
});
