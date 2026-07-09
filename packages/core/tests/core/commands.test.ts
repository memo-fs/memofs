import { describe, expect, it } from "vitest";
import {
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	InMemoryMemoryStore,
	MemoryCommandError,
	MemoryPathError,
	NOTES_MEMORY_PATH,
	runMemoryCommand,
} from "../../src/index";

describe("runMemoryCommand", () => {
	it("views files", async () => {
		const store = new InMemoryMemoryStore({ [CORE_MEMORY_PATH]: "core" });
		await expect(
			runMemoryCommand(store, { command: "view", path: CORE_MEMORY_PATH }),
		).resolves.toBe("core");
	});

	it("creates files and handles ifExists modes", async () => {
		const store = new InMemoryMemoryStore();

		await expect(
			runMemoryCommand(store, {
				command: "create",
				path: CORE_MEMORY_PATH,
				content: "a",
			}),
		).resolves.toBe(`Created ${CORE_MEMORY_PATH}`);
		await expect(
			runMemoryCommand(store, {
				command: "create",
				path: CORE_MEMORY_PATH,
				content: "b",
			}),
		).rejects.toBeInstanceOf(MemoryCommandError);
		await expect(
			runMemoryCommand(store, {
				command: "create",
				path: CORE_MEMORY_PATH,
				content: "b",
				ifExists: "ignore",
			}),
		).resolves.toMatch(/Skipped/);
		await expect(
			runMemoryCommand(store, {
				command: "create",
				path: CORE_MEMORY_PATH,
				content: "b",
				ifExists: "overwrite",
			}),
		).resolves.toBe(`Overwrote ${CORE_MEMORY_PATH}`);
		expect(await store.read(CORE_MEMORY_PATH)).toBe("b");
	});

	it("updates by overwrite and append", async () => {
		const store = new InMemoryMemoryStore();
		await runMemoryCommand(store, {
			command: "update",
			path: CORE_MEMORY_PATH,
			content: "a",
		});
		await runMemoryCommand(store, {
			command: "update",
			path: CORE_MEMORY_PATH,
			content: "b",
			mode: "append",
		});
		expect(await store.read(CORE_MEMORY_PATH)).toBe("ab");
	});

	it("searches notes and formats results", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store);
		await store.write(
			NOTES_MEMORY_PATH,
			"# Notes\n\n## One\nAlpha beta\n\n## Two\nGamma beta beta\n",
		);

		const result = await runMemoryCommand(store, {
			command: "search",
			path: NOTES_MEMORY_PATH,
			query: "beta",
			limit: 1,
		});
		expect(result).toMatch(/Gamma beta beta/);
		expect(result).not.toMatch(/Alpha beta/);
	});

	it("rejects unsupported paths", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			runMemoryCommand(store, {
				command: "view",
				path: "x" as typeof CORE_MEMORY_PATH,
			}),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	it("rejects invalid search limits", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			runMemoryCommand(store, {
				command: "search",
				path: NOTES_MEMORY_PATH,
				query: "x",
				limit: 0,
			}),
		).rejects.toThrow();
	});

	it("rejects search on core memory", async () => {
		const store = new InMemoryMemoryStore({ [CORE_MEMORY_PATH]: "x" });
		await expect(
			runMemoryCommand(store, {
				command: "search",
				path: CORE_MEMORY_PATH as typeof NOTES_MEMORY_PATH,
				query: "x",
			}),
		).rejects.toBeInstanceOf(MemoryCommandError);
	});
});
