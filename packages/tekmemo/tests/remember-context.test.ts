import { TEKMEMO_PATHS, Tekmemo } from "@tekmemo/core";
import {
	createNodeFsMemoryStore,
	createTempTekMemoDir,
} from "@tekmemo/core/node-fs";
import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

describe("remember and context", () => {
	it("stores a structured agent memory note", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: [
					"remember",
					"Use VoyageAI for embeddings.",
					"--root",
					temp.rootDir,
					"--kind",
					"decision",
					"--tag",
					"embeddings",
					"--actor",
					"agent:claude-code",
					"--json",
				],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.kind).toBe("decision");

			const memo = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			const notes = await memo.store.read(TEKMEMO_PATHS.memory.notes);
			expect(notes).toContain("Use VoyageAI for embeddings");
		} finally {
			await temp.cleanup();
		}
	});

	it("refuses likely secrets by default", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runTekMemoCli({
				argv: [
					"remember",
					"OPENAI_API_KEY=sk-123456789012345678901234",
					"--root",
					temp.rootDir,
				],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n")).toContain("possible secret");
		} finally {
			await temp.cleanup();
		}
	});

	it("packs context for agent use", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await runTekMemoCli({
				argv: [
					"remember",
					"Billing webhooks verify signatures.",
					"--root",
					temp.rootDir,
					"--kind",
					"constraint",
				],
			});
			const result = await runTekMemoCli({
				argv: [
					"context",
					"--root",
					temp.rootDir,
					"--query",
					"billing",
					"--json",
				],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.matches.length).toBeGreaterThan(0);
		} finally {
			await temp.cleanup();
		}
	});
});
