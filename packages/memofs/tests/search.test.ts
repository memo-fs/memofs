import { TEKMEMO_PATHS, Tekmemo } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempTekMemoDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

describe("search", () => {
	it("finds matches in memory files", async () => {
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
				"# Core Memory\n\nImportant fact here.\n",
			);

			const result = await runTekMemoCli({
				argv: ["search", "--root", temp.rootDir, "Important"],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("Important");
			expect(result.stdout.join("\n")).toContain("match(es)");
		} finally {
			await temp.cleanup();
		}
	});

	it("reports no matches when query is not found", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["search", "--root", temp.rootDir, "nonexistent"],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("No matches");
		} finally {
			await temp.cleanup();
		}
	});

	it("supports regex mode", async () => {
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
				TEKMEMO_PATHS.memory.notes,
				"# Notes\n\nABC-123\nXYZ-456\n",
			);

			const result = await runTekMemoCli({
				argv: ["search", "--root", temp.rootDir, "--regex", "[A-Z]+-\\d+"],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("match(es)");
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects invalid regex", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: ["search", "--root", temp.rootDir, "--regex", "[invalid"],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n")).toContain("Invalid regular expression");
		} finally {
			await temp.cleanup();
		}
	});

	it("supports JSON output", async () => {
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
				"# Core Memory\n\nhello world\n",
			);

			const result = await runTekMemoCli({
				argv: ["search", "--root", temp.rootDir, "--json", "hello"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.matches.length).toBeGreaterThan(0);
		} finally {
			await temp.cleanup();
		}
	});
});
