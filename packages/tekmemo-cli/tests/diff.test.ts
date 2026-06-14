import { createTempTekMemoDir, TEKMEMO_PATHS } from "@tekbreed/tekmemo";
import { describe, expect, it } from "vitest";
import { runTekMemoCli, TekMemoFileSystem } from "../src";

describe("diff", () => {
	it("compares two snapshots", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			await fs.writeText(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nFirst version.\n",
			);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "v1"],
			});

			await fs.writeText(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nSecond version.\n",
			);
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

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			await fs.writeText(
				TEKMEMO_PATHS.memory.core,
				"# Core Memory\n\nAlpha.\n",
			);
			await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "alpha"],
			});

			await fs.writeText(TEKMEMO_PATHS.memory.core, "# Core Memory\n\nBeta.\n");
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
