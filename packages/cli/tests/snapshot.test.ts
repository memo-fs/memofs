import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";
import { createTempTekMemoDir } from "../src/testing";

describe("snapshot", () => {
	it("creates a snapshot", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: [
					"snapshot",
					"--root",
					temp.rootDir,
					"--label",
					"before-change",
					"--json",
				],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.label).toBe("before-change");
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects unsafe snapshot labels", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["snapshot", "--root", temp.rootDir, "--label", "../bad"],
			});

			expect(result.exitCode).toBe(1);
		} finally {
			await temp.cleanup();
		}
	});
});
