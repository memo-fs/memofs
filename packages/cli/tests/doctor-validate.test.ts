import { describe, expect, it } from "vitest";
import {
	runTekMemoCli,
	stringifyJsonl,
	TEKMEMO_PATHS,
	TekMemoFileSystem,
} from "../src";
import { createTempTekMemoDir } from "../src/testing";

describe("doctor and validate", () => {
	it("passes doctor after init", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["doctor", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("passed");
		} finally {
			await temp.cleanup();
		}
	});

	it("fails doctor when protocol is missing", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("passes validate after init", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["validate", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
		} finally {
			await temp.cleanup();
		}
	});

	it("validate is strict about JSONL schema", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			await fs.writeText(
				TEKMEMO_PATHS.memoryEvents,
				stringifyJsonl([{ type: "patch" }]),
			);

			const result = await runTekMemoCli({
				argv: ["validate", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
			expect(
				parsed.issues.some(
					(i: { code: string }) => i.code === "schema_violation",
				),
			).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});

	it("validate detects invalid JSON lines", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			await fs.writeText(TEKMEMO_PATHS.memoryEvents, "{bad json}\n");

			const result = await runTekMemoCli({
				argv: ["validate", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
			expect(
				parsed.issues.some((i: { code: string }) => i.code === "invalid_json"),
			).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});
});
