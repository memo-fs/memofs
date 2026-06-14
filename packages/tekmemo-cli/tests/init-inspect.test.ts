import { createTempTekMemoDir } from "@tekbreed/tekmemo";
import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

describe("init and inspect", () => {
	it("initializes .tekmemo and inspects it", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const init = await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			expect(init.exitCode).toBe(0);

			const inspect = await runTekMemoCli({
				argv: ["inspect", "--root", temp.rootDir, "--json"],
			});
			expect(inspect.exitCode).toBe(0);

			const parsed = JSON.parse(inspect.stdout.join("\n"));
			expect(parsed.exists).toBe(true);
			expect(parsed.summary.eventCount).toBe(0);
		} finally {
			await temp.cleanup();
		}
	});

	it("does not overwrite existing manifest unless forced", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: [
					"init",
					"--root",
					temp.rootDir,
					"--no-input",
					"--project-id",
					"proj_a",
				],
			});
			const second = await runTekMemoCli({
				argv: [
					"init",
					"--root",
					temp.rootDir,
					"--no-input",
					"--project-id",
					"proj_b",
				],
			});
			expect(second.stdout.join("\n")).toContain("already exists");
		} finally {
			await temp.cleanup();
		}
	});
});
