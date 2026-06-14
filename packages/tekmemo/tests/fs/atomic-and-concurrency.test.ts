import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createNodeFsMemoryStore } from "../../src/index";
import { createTempRoot, pathExists } from "./test-utils";

describe("atomic writes and append locking", () => {
	test("write replaces entire file atomically from caller perspective", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(".tekmemo/memory/core.md", "one");
		await store.write(".tekmemo/memory/core.md", "two");

		await expect(store.read(".tekmemo/memory/core.md")).resolves.toBe("two");
	});

	test("write cleans up temp files after successful write", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(".tekmemo/memory/core.md", "clean\n");

		const entries = await fs.readdir(path.join(rootDir, ".tekmemo"));
		expect(entries).toEqual(["memory"]);
	});

	test("concurrent appends from same instance do not drop content", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await Promise.all(
			Array.from({ length: 50 }, (_, index) =>
				store.append(".tekmemo/memory/notes.md", `line-${index}\n`),
			),
		);
		const content = await store.read(".tekmemo/memory/notes.md");

		for (let index = 0; index < 50; index += 1) {
			expect(content).toContain(`line-${index}\n`);
		}
	});

	test("failed invalid writes do not create parent temp files for invalid paths", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(
			store.write(".tekmemo/../core.md" as never, "bad"),
		).rejects.toThrow();
		await expect(pathExists(path.join(rootDir, ".tekmemo"))).resolves.toBe(
			false,
		);
	});
});
