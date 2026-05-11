import { describe, expect, it } from "vitest";
import { runTekMemoCli, TEKMEMO_PATHS, TekMemoFileSystem } from "../src";
import { createTempTekMemoDir } from "../src/testing";

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
			const content = await fs.readText(TEKMEMO_PATHS.notesMemory);
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
			const content = await fs.readText(TEKMEMO_PATHS.coreMemory);
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
			const events = await fs.readText(TEKMEMO_PATHS.memoryEvents);
			expect(events.length).toBeGreaterThan(0);
			const parsed = JSON.parse(events.trim());
			expect(parsed.type).toBe("memory.updated");
			expect(parsed.sourcePath).toBe(TEKMEMO_PATHS.notesMemory);
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
			const events = await fs.readText(TEKMEMO_PATHS.memoryEvents);
			const parsed = JSON.parse(events.trim());
			expect(parsed.type).toBe("memory.updated");
			expect(parsed.sourcePath).toBe(TEKMEMO_PATHS.coreMemory);
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
