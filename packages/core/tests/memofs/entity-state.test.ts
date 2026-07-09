/**
 * End-to-end test for entity-centric recall (ADR 0009 Component 3 / Q26).
 *
 * The unit tests in `strategist.test.ts` cover `resolveEntityState` in
 * isolation. This file covers the integration: seeding explicit graph nodes +
 * edges through the public `memo.graph` API, then asserting `memo.context()`
 * renders the enriched Entities section (current state from active edges +
 * provenance), and that deprecated edges are excluded (the Component 5
 * staleness loop, honored inside the Entities section).
 */

import { describe, expect, it } from "vitest";
import { MemoFS } from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

async function seedMemo() {
	const { rootDir, cleanup } = await createTempMemoFsDir();
	const memo = new MemoFS({
		store: createNodeFsMemoryStore({
			rootDir,
			createRoot: true,
			missingFileBehavior: "empty",
		}),
		rootDir,
		projectId: "entity-state",
		mode: "local",
	});
	// A small core so the section ordering assertion has something to anchor on.
	await memo.core.update("# Core Memory\n\nEntity-centric recall test corpus.");
	return { memo, cleanup };
}

describe("memofs.context — entity-centric recall (ADR 0009 Component 3 / Q26)", () => {
	it("renders the current state derived from active edges", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			await memo.graph.upsertNodes({
				nodes: [
					{
						id: "auth",
						type: "concept",
						label: "Auth",
						summary: "Authentication mechanism.",
					},
					{
						id: "oauth2",
						type: "concept",
						label: "OAuth2",
						summary: "Authorization framework.",
					},
				],
			});
			await memo.graph.upsertEdges({
				edges: [
					{
						from: "auth",
						to: "oauth2",
						type: "uses",
						sourceRefs: [{ sourceType: "note", path: "notes.md" }],
					},
				],
			});

			const result = await memo.context({ query: "auth" });
			const entitiesSection = result.sections.find(
				(section) => section.type === "entities",
			);

			expect(entitiesSection).toBeDefined();
			expect(entitiesSection?.content).toContain("Auth (concept)");
			expect(entitiesSection?.content).toContain("currently: uses OAuth2");
			expect(entitiesSection?.content).toContain("↳ source: notes.md");
		} finally {
			await cleanup();
		}
	});

	it("excludes deprecated edges from the current state (Component 5)", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			await memo.graph.upsertNodes({
				nodes: [
					{
						id: "auth",
						type: "concept",
						label: "Auth",
						summary: "Authentication mechanism.",
					},
					{
						id: "jwt",
						type: "concept",
						label: "JWT",
						summary: "Retired token format.",
					},
					{
						id: "oauth2",
						type: "concept",
						label: "OAuth2",
						summary: "Authorization framework.",
					},
				],
			});
			await memo.graph.upsertEdges({
				edges: [
					{
						from: "auth",
						to: "jwt",
						type: "uses",
						status: "deprecated", // retired by consolidation; must be dropped.
					},
					{
						from: "auth",
						to: "oauth2",
						type: "uses",
						status: "active",
					},
				],
			});

			const result = await memo.context({ query: "auth" });
			const entitiesSection = result.sections.find(
				(section) => section.type === "entities",
			);

			expect(entitiesSection).toBeDefined();
			// Active edge contributes the current state.
			expect(entitiesSection?.content).toContain("uses OAuth2");
			// Deprecated edge must NOT contribute.
			expect(entitiesSection?.content).not.toMatch(/uses JWT/);
		} finally {
			await cleanup();
		}
	});

	it("places the Entities section between core and recall (trust order)", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			await memo.graph.upsertNodes({
				nodes: [
					{
						id: "pnpm",
						type: "tool",
						label: "pnpm",
						summary: "Package manager.",
					},
				],
			});
			// Seed a note so recall has something to return.
			await memo.notes.record({
				content: "We use pnpm for package management.",
				kind: "preference",
			});

			const result = await memo.context({ query: "pnpm" });
			const types = result.sections.map((section) => section.type);

			// Trust order: directive → core → entities → recall.
			expect(types[0]).toBe("directive");
			const coreIndex = types.indexOf("core");
			const entitiesIndex = types.indexOf("entities");
			expect(coreIndex).toBeGreaterThan(-1);
			expect(entitiesIndex).toBeGreaterThan(coreIndex);
			// Entities may be followed by recall or nothing; if recall exists it
			// must come after entities.
			const recallIndex = types.indexOf("recall");
			if (recallIndex !== -1) {
				expect(entitiesIndex).toBeLessThan(recallIndex);
			}
		} finally {
			await cleanup();
		}
	});

	it("falls back to the static summary when no active edges exist", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			await memo.graph.upsertNodes({
				nodes: [
					{
						id: "tooling",
						type: "concept",
						label: "Tooling",
						summary: "Monorepo toolchain conventions.",
					},
				],
			});
			// No edges seeded — entity resolves but has no current state.

			const result = await memo.context({ query: "tooling" });
			const entitiesSection = result.sections.find(
				(section) => section.type === "entities",
			);

			expect(entitiesSection).toBeDefined();
			expect(entitiesSection?.content).toContain("Tooling (concept)");
			// No "currently:" prefix when there's no edge-derived state.
			expect(entitiesSection?.content).not.toMatch(/currently:/);
			// The static summary is rendered as the body.
			expect(entitiesSection?.content).toContain(
				"Monorepo toolchain conventions.",
			);
		} finally {
			await cleanup();
		}
	});

	it("emits no Entities section when nothing resolves", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			// A query that matches no node label/alias.
			const result = await memo.context({ query: "zzz-nothing-qqq" });
			const entitiesSection = result.sections.find(
				(section) => section.type === "entities",
			);
			expect(entitiesSection).toBeUndefined();
		} finally {
			await cleanup();
		}
	});
});
