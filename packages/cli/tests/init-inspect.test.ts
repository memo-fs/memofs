import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";

describe("init and inspect", () => {
	it("initializes .memofs and inspects it", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const init = await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			expect(init.exitCode).toBe(0);

			const inspect = await runMemoFsCli({
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
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: [
					"init",
					"--root",
					temp.rootDir,
					"--no-input",
					"--project-id",
					"proj_a",
				],
			});
			const second = await runMemoFsCli({
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
