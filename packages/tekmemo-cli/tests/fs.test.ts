import { createTempTekMemoDir } from "@tekbreed/tekmemo";
import { describe, expect, it } from "vitest";
import { TekMemoFileSystem } from "../src";

describe("TekMemoFileSystem", () => {
	it("writes and reads files safely", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			await fs.writeText(".tekmemo/memory/core.md", "hello");
			await expect(fs.readText(".tekmemo/memory/core.md")).resolves.toBe(
				"hello",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects path traversal", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const fs = new TekMemoFileSystem({ rootDir: temp.rootDir });
			expect(() => fs.resolve("../bad")).toThrow();
			expect(() => fs.resolve(".tekmemo/../bad")).toThrow();
		} finally {
			await temp.cleanup();
		}
	});
});
