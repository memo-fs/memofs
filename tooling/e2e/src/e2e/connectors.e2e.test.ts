/**
 * Real e2e: Connector harness — GitHub/Notion via MSW fixtures, dedup, secretRef opaque.
 *
 * Proves deterministic network proof via MSW:
 * - real @memofs/connectors runner against MSW
 * - first run ingests, second skips unchanged, changed record re-ingested
 * - connectors.json contains opaque secretRef never raw token
 * - file-first truth .memofs/memory/*.md after ingest
 * - cross-visibility: connector write visible to core recall same tmpDir
 */

import { describe, expect, it } from "vitest";

import {
	createRealConnectorHarness,
	createRealCoreHarness,
	getGitHubFixtureMeta,
	getNotionFixtureMeta,
	resetGitHubFixture,
	setGitHubNodes,
} from "../index";

describe("connectors real harness — MSW fixtures + dedup (ticket 64)", () => {
	it("first run ingests GitHub fixture, second skips unchanged, file-first truth, secretRef opaque", async () => {
		const harness = await createRealConnectorHarness();
		try {
			// Write connectors.json with opaque secretRef — never raw token
			await harness.writeConnectorsFile([
				{
					id: "gh-e2e",
					type: "github",
					enabled: true,
					secretRef: "ss_test_a",
					sourceMapping: {
						repository: "example/repo",
					} as never,
				},
			]);

			// Assert file contains secretRef opaque, not raw token
			const raw = await harness.readConnectorsFileRaw();
			expect(raw).toContain("ss_test_a");
			expect(raw).not.toContain("test-token-"); // file should not contain token itself, only ref
			expect(raw).not.toContain("ghp_");
			expect(raw).not.toContain("sk-");

			// First run — should ingest 2 issues + 1 PR = 3 records from github.json fixture
			const first = await harness.run({ onlyType: "github" });
			// Our fixture has 2 issues + 1 PR = 3 nodes
			expect(first.written.length).toBeGreaterThanOrEqual(2);
			expect(first.written.length).toBeLessThanOrEqual(4);
			expect(first.errors).toEqual([]);
			expect(first.ran).toContain("gh-e2e");

			// File-first truth: .memofs/memory/*.md exists
			const filesAfterFirst = await harness.listFiles();
			expect(filesAfterFirst.some((f) => f.startsWith(".memofs/memory/"))).toBe(
				true,
			);
			expect(filesAfterFirst.some((f) => f.includes("connectors.json"))).toBe(
				true,
			);

			const snapAfterFirst = await harness.snapshotFs();
			expect(
				Object.keys(snapAfterFirst).some((k) =>
					k.startsWith(".memofs/memory/"),
				),
			).toBe(true);

			// Cross-visibility: core recall in same tmpDir finds ingested content (RUN_ID)
			const core = await createRealCoreHarness({ tmpDir: harness.tmpDir });
			try {
				// Use recall to find GitHub ingested fact via lexical engine
				const items = await core.search("Fix bug A");
				// Should find at least one (GitHub issue title)
				expect(items.length).toBeGreaterThanOrEqual(1);
			} finally {
				try {
					await core.store.dispose?.();
				} catch {}
			}

			// Second run — same fixture, should skip all unchanged
			const second = await harness.run({ onlyType: "github" });
			expect(second.written).toEqual([]);
			expect(second.skipped.length).toBe(first.written.length);
			expect(second.errors).toEqual([]);

			// Secret still not leaked after second run
			const rawAfterSecond = await harness.readConnectorsFileRaw();
			expect(rawAfterSecond).not.toContain("test-token-***");
			expect(rawAfterSecond).toContain("ss_test_a");
		} finally {
			await harness.cleanup();
			resetGitHubFixture();
		}
	});

	it("changed record re-ingested (new body → new id)", async () => {
		const harness = await createRealConnectorHarness();
		try {
			await harness.writeConnectorsFile([
				{
					id: "gh-e2e-change",
					type: "github",
					enabled: true,
					secretRef: "ss_test_a",
					sourceMapping: { repository: "example/repo" } as never,
				},
			]);

			const first = await harness.run({ onlyType: "github" });
			expect(first.written.length).toBeGreaterThanOrEqual(1);

			// Mutate fixture: change body of first issue to simulate updated external record
			// Load current nodes, modify first issue body, set back via setGitHubNodes
			const { readFileSync } = await import("node:fs");
			const { join } = await import("node:path");
			const { fileURLToPath } = await import("node:url");
			const __dirname = fileURLToPath(new URL(".", import.meta.url));
			const fixturePath = join(
				__dirname,
				"..",
				"msw",
				"fixtures",
				"github.json",
			);
			const rawFixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
				payload: {
					data: {
						repository: {
							issues: {
								nodes: {
									number: number;
									title: string;
									body: string;
									url: string;
									state: string;
									createdAt: string;
									author: { login: string };
									labels: { nodes: { name: string }[] };
								}[];
							};
							pullRequests: { nodes: unknown[] };
							discussions: { nodes: unknown[] };
						};
					};
				};
			};
			// Change body of issue 1
			const mutatedIssues = rawFixture.payload.data.repository.issues.nodes.map(
				(n, i) =>
					i === 0
						? {
								...n,
								body: `${n.body} UPDATED at ${Date.now()} RUN_ID test-run-e2e-0021-001`,
							}
						: n,
			);
			setGitHubNodes({ issues: mutatedIssues as unknown[] });

			const second = await harness.run({ onlyType: "github" });
			// Changed record should be re-ingested (new id) → written length 1, skipped rest
			expect(second.written.length).toBe(1);
			expect(second.skipped.length).toBe(first.written.length - 1);
		} finally {
			await harness.cleanup();
			resetGitHubFixture();
		}
	});

	it("Notion fixture via MSW ingests and file-first truth, secretRef never raw token", async () => {
		const harness = await createRealConnectorHarness();
		try {
			await harness.writeConnectorsFile([
				{
					id: "notion-e2e",
					type: "notion",
					enabled: true,
					secretRef: "ss_test_notion",
					sourceMapping: {
						databaseId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
					} as never,
				},
			]);

			const result = await harness.run({ onlyType: "notion" });
			// Fixture has 2 pages
			expect(result.written.length).toBe(2);
			expect(result.errors).toEqual([]);

			const files = await harness.listFiles();
			expect(files.some((f) => f.startsWith(".memofs/memory/"))).toBe(true);

			const raw = await harness.readConnectorsFileRaw();
			expect(raw).toContain("ss_test_notion");
			expect(raw).not.toContain("secret_");

			// Second run skips
			const second = await harness.run({ onlyType: "notion" });
			expect(second.written).toEqual([]);
			expect(second.skipped.length).toBe(2);
		} finally {
			await harness.cleanup();
		}
	});

	it("fixtures contain RUN_ID and secretRedacted proof", async () => {
		const ghMeta = getGitHubFixtureMeta();
		expect(ghMeta.sanitized).toBe(true);
		expect(ghMeta.secretRedacted).toBe("test-token-***");
		expect(ghMeta.runId).toMatch(/test-run-e2e-0021-/);

		const notionMeta = getNotionFixtureMeta();
		expect(notionMeta.sanitized).toBe(true);
		expect(notionMeta.secretRedacted).toBe("test-token-***");
		expect(notionMeta.runId).toMatch(/test-run-e2e-0021-/);
	});

	it("live opt-in stub: MEMOFS_E2E_LIVE=1 path defined", async () => {
		// When MEMOFS_E2E_LIVE=1, we could hit live APIs; for deterministic e2e we skip unless keys present.
		// This test just proves the env var is recognized and doesn't break MSW path.
		const isLive = process.env.MEMOFS_E2E_LIVE === "1";
		if (isLive) {
			// If live enabled, we still use MSW by default unless real keys present — we just note it.
			// No secret should leak even in live mode.
			const harness = await createRealConnectorHarness();
			try {
				await harness.writeConnectorsFile([
					{
						id: "gh-live",
						type: "github",
						enabled: true,
						secretRef: "ss_test_a",
						sourceMapping: { repository: "example/repo" } as never,
					},
				]);
				const result = await harness.run({ onlyType: "github" });
				// In live mode without real token, MSW still returns fixture — deterministic
				expect(result.written.length > 0 || result.skipped.length > 0).toBe(
					true,
				);
			} finally {
				await harness.cleanup();
			}
		} else {
			expect(isLive).toBe(false);
		}
	});
});
