import { TEKMEMO_PATHS, Tekmemo } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempTekMemoDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

/**
 * Releases the Q28 advisory lock held by a direct Tekmemo so a subsequent CLI
 * write call (e.g. `snapshot`) on the same root can acquire it. The local
 * single-writer contract (Q28) forbids two live writers on one `.tekmemo/`
 * root, so a direct memo must be disposed before interleaving CLI writes.
 */
async function releaseLock(memo: Tekmemo): Promise<void> {
	const store = memo.store as { dispose?: () => Promise<void> };
	await store.dispose?.();
}

describe("diff", () => {
	it("compares two snapshots", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const memo = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.write(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nFirst version.\n",
			);
			await releaseLock(memo);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "v1"],
			});

			const memo2 = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo2.store.write(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nSecond version.\n",
			);
			await releaseLock(memo2);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "v2"],
			});

			const result = await runTekMemoCli({
				argv: ["diff", "--root", temp.rootDir, "v1", "v2"],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("v1");
			expect(result.stdout.join("\n")).toContain("v2");
		} finally {
			await temp.cleanup();
		}
	});

	it("reports identical snapshots via JSON", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "snap-a"],
			});
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "snap-b"],
			});

			const result = await runTekMemoCli({
				argv: ["diff", "--root", temp.rootDir, "--json", "snap-a", "snap-b"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(typeof parsed.data.changedFiles).toBe("number");
		} finally {
			await temp.cleanup();
		}
	});

	it("shows changed files in JSON output", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const memo = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.write(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nAlpha.\n",
			);
			await releaseLock(memo);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "alpha"],
			});

			const memo2 = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo2.store.write(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nBeta.\n",
			);
			await releaseLock(memo2);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "beta"],
			});

			const result = await runTekMemoCli({
				argv: ["diff", "--root", temp.rootDir, "--json", "alpha", "beta"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.changedFiles).toBeGreaterThan(0);
		} finally {
			await temp.cleanup();
		}
	});

	it("errors when snapshot label is not found", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: [
					"diff",
					"--root",
					temp.rootDir,
					"nonexistent-a",
					"nonexistent-b",
				],
			});
			expect(result.exitCode).toBe(1);
		} finally {
			await temp.cleanup();
		}
	});

	it("errors when no snapshots exist", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
				argv: ["diff", "--root", temp.rootDir, "a", "b"],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n")).toContain("No snapshots");
		} finally {
			await temp.cleanup();
		}
	});
});
