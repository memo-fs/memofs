import { createTempTekMemoDir, TEKMEMO_PATHS } from "@tekbreed/tekmemo";
import { describe, expect, it } from "vitest";
import { runTekMemoCli, TekMemoFileSystem } from "../src";

describe("edit", () => {
	it("appends a note", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["edit", "--root", temp.rootDir, "note", "My new note"],
			});
			expect(result.exitCode).toBe(0);

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			const content = await fs.readText(TEKMEMO_PATHS.memory.notes);
			expect(content).toContain("My new note");
		} finally {
			await temp.cleanup();
		}
	});

	it("appends core memory", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["edit", "--root", temp.rootDir, "core", "Important fact"],
			});
			expect(result.exitCode).toBe(0);

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			const content = await fs.readText(TEKMEMO_PATHS.memory.core);
			expect(content).toContain("Important fact");
		} finally {
			await temp.cleanup();
		}
	});

	it("emits a memory event", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await runTekMemoCli({
				argv: ["edit", "--root", temp.rootDir, "note", "Test note"],
			});

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			const events = await fs.readText(TEKMEMO_PATHS.events.memoryEvents);
			expect(events.length).toBeGreaterThan(0);
			const parsed = JSON.parse(events.trim());
			expect(parsed.type).toBe("memory.updated");
			expect(parsed.sourcePath).toBe(TEKMEMO_PATHS.memory.notes);
		} finally {
			await temp.cleanup();
		}
	});

	it("emits a patch event for core edits", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await runTekMemoCli({
				argv: ["edit", "--root", temp.rootDir, "core", "Fact"],
			});

			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			const events = await fs.readText(TEKMEMO_PATHS.events.memoryEvents);
			const parsed = JSON.parse(events.trim());
			expect(parsed.type).toBe("memory.updated");
			expect(parsed.sourcePath).toBe(TEKMEMO_PATHS.memory.core);
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects invalid edit type", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["edit", "--root", temp.rootDir, "invalid", "msg"],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n")).toContain("note' or 'core'");
		} finally {
			await temp.cleanup();
		}
	});
});
