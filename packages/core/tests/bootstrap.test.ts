import { describe, expect, it } from "vitest";
import {
	bootstrapMemoryStore,
	CANONICAL_TEKMEMO_FILES,
	CORE_MEMORY_PATH,
	InMemoryMemoryStore,
	MANIFEST_PATH,
	NOTES_MEMORY_PATH,
	readManifest,
} from "../src/index";

describe("bootstrapMemoryStore", () => {
	it("seeds the canonical .tekmemo protocol files", async () => {
		const store = new InMemoryMemoryStore();
		const result = await bootstrapMemoryStore(store, {
			now: () => "2026-05-02T00:00:00.000Z",
		});

		expect(result.created).toEqual([...CANONICAL_TEKMEMO_FILES]);
		for (const path of CANONICAL_TEKMEMO_FILES) {
			await expect(store.exists(path)).resolves.toBe(true);
		}
	});

	it("writes a valid manifest", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store, {
			projectId: "proj_123",
			now: () => "2026-05-02T00:00:00.000Z",
		});

		const manifest = await readManifest(store);
		expect(manifest.projectId).toBe("proj_123");
		expect(manifest.memory.core).toBe(CORE_MEMORY_PATH);
		expect(manifest.memory.notes).toBe(NOTES_MEMORY_PATH);
	});

	it("is idempotent by default", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store);
		await store.write(CORE_MEMORY_PATH, "custom");

		const result = await bootstrapMemoryStore(store);

		expect(result.created).toEqual([]);
		expect(result.skipped).toContain(CORE_MEMORY_PATH);
		expect(await store.read(CORE_MEMORY_PATH)).toBe("custom");
	});

	it("can overwrite existing files when requested", async () => {
		const store = new InMemoryMemoryStore({
			[CORE_MEMORY_PATH]: "custom",
			[MANIFEST_PATH]: "custom manifest",
		});
		const result = await bootstrapMemoryStore(store, {
			overwriteExisting: true,
		});

		expect(result.overwritten).toContain(CORE_MEMORY_PATH);
		expect(result.overwritten).toContain(MANIFEST_PATH);
		expect(await store.read(CORE_MEMORY_PATH)).toMatch(/# Core Memory/);
	});

	it("supports custom templates", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store, { templates: { core: "# Custom\n" } });

		expect(await store.read(CORE_MEMORY_PATH)).toBe("# Custom\n");
	});
});
